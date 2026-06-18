# Architecture

A single Next.js app, run locally, backed by a local SQLite database. The
database is the **single source of truth**; CSV/LaTeX/etc. are export artifacts,
never the canonical store.

## High-level shape

```
Browser (localhost:3000)
   │
   ▼
Next.js App Router (src/app/*)
   ├─ Server Components  → read directly from the DB layer
   ├─ Server Actions     → mutations (src/app/actions.ts)
   └─ Route Handlers     → CSV export (src/app/api/tracker/export)
   │
   ▼
Data-access layer (src/lib/tracker.ts)   ← typed query functions
   │
   ▼
DB connection (src/lib/db/*)  → Drizzle ORM → better-sqlite3
   │
   ▼
SQLite file at %LOCALAPPDATA%\JobSearchCommandCenter\data\app.db   (OUTSIDE OneDrive)

External (Search only):
src/lib/sources/* → fetch() public ATS JSON APIs (Greenhouse/Lever/Ashby)
```

## Directory map

| Path                         | Responsibility                                            |
| ---------------------------- | --------------------------------------------------------- |
| `src/app/page.tsx`           | Dashboard (counts + upcoming deadlines).                  |
| `src/app/tracker/`           | Tracker page + CSV import page.                           |
| `src/app/calendar/`          | Month grid + agenda calendar.                             |
| `src/app/search/`            | Live ATS board search.                                    |
| `src/app/apply/`             | AI Application Assistant: page + grounded draft action.   |
| `src/app/write/`             | Application Writer: page + per-stage pipeline actions.     |
| `src/app/prep/`              | Interview-prep tracker: assessments + readiness checklist.|
| `src/app/actions.ts`         | All Server Actions (create/update/delete, import, add).   |
| `src/app/api/tracker/export` | CSV export route handler.                                 |
| `src/lib/db/paths.ts`        | Resolves the DB path **outside** OneDrive.                |
| `src/lib/db/schema.ts`       | Drizzle schema + status/track/type unions.                |
| `src/lib/db/index.ts`        | Connection singleton + idempotent table bootstrap.        |
| `src/lib/tracker.ts`         | Typed query functions + deadline aggregation.             |
| `src/lib/sources/`           | Curated boards + ATS fetchers/normalizers.                |
| `src/lib/apply/assistant.ts` | Grounded application-answer generation (Anthropic).       |
| `src/lib/apply/writer-pipeline.ts` | Multi-pass draft→judge→synthesize→polish writer (Anthropic, Opus 4.8). |
| `src/lib/networking/`        | Grounded networking-outreach generation (Anthropic).      |
| `src/lib/resume/`            | Bank loader, generator, AI tailor/select, density auto-fit + Tectonic compile/fill-measurement. |
| `src/lib/labels.ts`          | UI-facing constants/colors (client-safe, no DB import).   |
| `src/lib/dates.ts`, `csv.ts` | Pure helpers (no I/O).                                     |
| `src/components/`            | UI primitives + the tracker board / target form.          |
| `scripts/seed.mjs`           | Standalone seeder for known recruiting-timeline targets.  |

## Data model

Tables (see `src/lib/db/schema.ts`):

- **targets** — the core watchlist row (company, role, track, status, priority,
  `opens_at`, `deadline`, `applied_at`, comp, notes).
- **contacts** — networking contacts, optionally linked to a target, with
  `next_follow_up_at`.
- **assessments** — OAs/cases/games/onsites/interviews tied to a target, with
  `due_at` + a status pipeline. CRUD lives on the Interview-Prep page (`/prep`).
- **prep_items** — cross-firm interview/OA readiness checklist, grouped by
  category (quant/mbb/pm/behavioral) with a status + resource + last-reviewed.
- **goals** / **tasks** — the Plan page's goals and weekly action queue (tasks
  link to a target and/or goal; `study`/`prep` tasks are the prep "schedule").
- **calendar_links** — maps a deadline item to its synced Google Calendar event.

Date-only fields are stored as ISO `YYYY-MM-DD` text (so `<input type="date">`
round-trips cleanly); timestamps are integer epoch-ms.

The **calendar/dashboard** read a single derived list: `listDeadlines()` in
`src/lib/tracker.ts` flattens target open dates + deadlines, assessment due
dates, and contact follow-ups into one sorted stream.

## Key conventions

- **Server-only modules** (`src/lib/tracker.ts`, `src/lib/sources/fetchers.ts`)
  import `"server-only"` so they can never be bundled into a client component.
- **`src/lib/labels.ts` is the client-safe constants file.** Client components
  import labels/colors from here, *not* from `schema.ts` (which would pull the
  DB layer into the browser bundle).
- **`better-sqlite3` is marked external** in `next.config.ts`
  (`serverExternalPackages`) because it's a native module.
- Pages that read the DB set `export const dynamic = "force-dynamic"` so they
  render per-request and never get statically cached.
- The DB connection is cached on `globalThis` to survive dev hot-reloads.

## AI features (honest by construction)

Four surfaces call Anthropic, all gated on `ANTHROPIC_API_KEY` via
`hasAnthropic()` and all sharing one honesty discipline: **the model may only use
facts we hand it.**

- **Résumé tailoring/selection** (`src/lib/resume/ai-*.ts`) — rewrites bullets
  within each bullet's immutable `groundTruth`; never adds a metric or claim.
  Leads bullets with the strongest true metric and keeps line economy (no orphan
  last-lines). Layout: a **density-aware auto-fit** (`autofit.ts`) measures real
  page fill (zref markers via `compile.ts`) and tightens/expands elastic spacing
  + trims lowest-value content to fill exactly one page (ADR-010).
- **Networking outreach** (`src/lib/networking/outreach.ts`) — drafts messages
  from a profile blurb + the firm's notes; never invents a shared connection.
- **Application Assistant** (`src/lib/apply/assistant.ts`) — drafts "why this
  firm" / "why this role" / short-answer / cover-letter responses. Grounds on the
  audited résumé bank (each bullet's `groundTruth`, **not** the polished
  variants) and references the firm using **only** its tracker notes. Thin notes
  → honest, general firm references plus a `note` telling the user what to add.

- **Application Writer** (`src/lib/apply/writer-pipeline.ts`) — the deep,
  multi-pass companion to the Assistant (ADR-011). From a pasted JD (+ optional
  firm/question/instructions/word-limit) it runs **draft → judge → synthesize →
  polish**: ~4 diverse drafts in parallel, an adversarial structured judge per
  draft, one synthesis grafting the strongest material, then a polish pass that
  strips AI tells + em-dashes, enforces format/length, and re-verifies honesty
  (with a deterministic em-dash/banned-phrase backstop and a one-shot
  self-repair). Same grounding contract: personal facts only from the audited
  bank's `groundTruth`, company facts only from the JD + tracker notes; every
  draft must carry a genuine motivation beat. Runs on **Opus 4.8** with adaptive
  thinking at high effort (`anthropic.writerModel`/`writerEffort` in config) —
  quality over cost. The UI drives four sequential server actions
  (`src/app/write/actions.ts`) for live staged progress and surfaces the scored
  drafts for transparency.

The static grounding (system prompt + profile facts) goes in cached system
blocks (`cache_control`), so regenerations are cheap. The writer goes further:
the entire shared context (applicant facts + motivation + company context + task
+ criteria) is one big cached block re-read across all ~11 calls in a run; drafts
and judges fan out with `Promise.all`, synthesize and polish run sequentially.
These modules are `server-only`; the client imports the kind/label unions **and**
the writer DTO types from `src/lib/labels.ts`.

## Schema changes

Day-to-day startup needs no migration step — `index.ts` runs
`CREATE TABLE IF NOT EXISTS` on boot. When you *change* the schema, keep the DDL
in `index.ts` in sync with `schema.ts`, and use `drizzle-kit` (configured in
`drizzle.config.ts`) to generate proper migration SQL for existing databases.
