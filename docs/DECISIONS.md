# Decision Log

Lightweight ADRs — the "why" behind choices that aren't obvious from the code.
Most of these came out of a four-reviewer plan council (architecture, recruiting
domain, legal/ToS, scope) on 2026-05-30. Newest first.

---

## ADR-001 — Curated watchlist + deadlines first, not mass auto-aggregation

**Decision:** The product leads with a deadline-aware tracker (your curated
watchlist) and a focused search of legal sources, rather than trying to scrape
"everywhere" and auto-apply.

**Why:** The highest-value targets for these tracks — MBB consulting and elite
quant — are **not** on scrapable job boards; they recruit through proprietary
portals and referrals. It's roughly a known ~30-employer list, not a long tail.
For new grads, *timing* ("apply week one of open") and *referrals* are the
biggest controllable levers. Mass aggregation optimizes the wrong thing.

**Consequence:** Search covers public ATS boards (real, useful, legal) and links
to curated GitHub lists; MBB/quant targets are added to the Tracker by hand and
watched by open date.

---

## ADR-002 — No LinkedIn / Handshake automation

**Decision:** Never programmatically scrape or automate LinkedIn or Handshake.
Those stay manual copy-paste.

**Why:** Both prohibit automated access in their ToS; violating it risks account
suspension. Handshake is the **university's** account — extra risk. Public ATS
endpoints (Greenhouse/Lever/Ashby), GitHub lists, web search, and official
Google APIs are low-risk and sufficient.

**Consequence:** The Search page only calls public ATS JSON APIs and points to
GitHub lists. No credentialed scraping anywhere in the codebase.

---

## ADR-003 — SQLite lives outside OneDrive

**Decision:** Store the database at `%LOCALAPPDATA%\JobSearchCommandCenter\data`,
not in this repo folder.

**Why:** This project sits under OneDrive. OneDrive sync can copy a SQLite file
mid-write and corrupt it (and `-wal`/`-shm` sidecar files make this worse). Code
belongs in OneDrive; live data does not.

**Consequence:** `src/lib/db/paths.ts` resolves the external path and the DB is
`.gitignore`d defensively. Backups = copy that folder. Override via
`JSCC_DATA_DIR`.

---

## ADR-004 — DB is the single source of truth; files are exports

**Decision:** All canonical state lives in SQLite. CSV (and later LaTeX) are
generated *from* the DB, never the other way around as the system of record.

**Why:** Avoids the classic "which spreadsheet is current?" drift. One
authoritative store, many disposable exports.

**Consequence:** CSV import is an additive bulk-entry path (de-duped by URL), not
a sync.

---

## ADR-005 — Idempotent table bootstrap instead of a required migration step

**Decision:** On startup, run `CREATE TABLE IF NOT EXISTS`. No migration command
needed for first run.

**Why:** Single-user local tool; zero-friction startup matters more than
migration ceremony. `drizzle-kit` is still configured for real schema evolution
later.

**Consequence:** DDL in `src/lib/db/index.ts` must be kept in sync with
`src/lib/db/schema.ts`.

---

## ADR-006 — Next.js + better-sqlite3 + Drizzle, run via `npm run dev`

**Decision:** One Next.js (App Router, TypeScript) app, synchronous
`better-sqlite3` driver, Drizzle for typed queries, Tailwind for UI.

**Why:** A single `npm run dev` is the simplest thing to run locally for a
non-web-developer. `better-sqlite3` is synchronous (simple in Server
Components/Actions) and ships prebuilt binaries (verified working on Node 24).

**Consequence:** `better-sqlite3` is marked as a server-external package so the
bundler doesn't try to bundle the native module.

---

## ADR-007 — AI Application Assistant: grounded, honest, generate-and-copy

**Decision:** A `/apply` page drafts application responses ("why this firm",
"why this role", a pasted short-answer question, or a short cover letter) per
tracked firm. It grounds on the **audited résumé bank** (`@profile/resume-data`,
using each bullet's immutable `groundTruth`, not the polished per-track variants)
and references the firm using **only** that firm's tracker notes. Drafts are
shown for review/edit and copied out — **not persisted**.

**Why:**

- *Ground on the reconciled bank, not the raw markdown.* The markdown under
  `samcontext/profile/` is the source, but it carries ⚠️ "confirm before submit"
  discrepancy flags and meta-notes that must never leak into a draft.
  `resume-data.ts` is the audited, reconciled fact set (e.g. GPA resolved to
  3.93) already trusted by the résumé builder and outreach. Using it keeps the
  three AI surfaces consistent and the honesty contract airtight.
- *No invented firm facts.* Firm references come only from the tracker notes. If
  notes are thin, the model keeps firm references honest and general (it may lean
  on **widely-known public reputation, clearly framed as such**) and returns a
  one-line `note` telling Sam exactly what research to add — which doubles as a
  nudge to enrich the firm's tracker notes.
- *Generate-and-copy, no persistence.* Matches the roadmap's "shown for review"
  framing and the existing outreach pattern; avoids a schema change. Answers are
  pasted into the real application portal, so the portal is the system of record.

**Consequence:** `src/lib/apply/assistant.ts` is `server-only` and gated on
`ANTHROPIC_API_KEY`; the `ApplicationKind` union lives in `src/lib/labels.ts`
(client-safe). The library enforces the short-answer-needs-a-question rule itself
(not just the action). If Sam later wants saved/reusable answers, add an
`application_answers` table rather than treating exported text as the store.

---

## ADR-008 — Root tooling excludes the `portfolio/` project

**Decision:** The suite's `tsconfig.json` and `eslint.config.mjs` exclude
`portfolio/**`.

**Why:** `portfolio/` is a separate project (its own `tsconfig`/`eslint`/
`CLAUDE.md`, run from another window on port 3001 — see the root `CLAUDE.md`).
The root `tsconfig` `include` is `**/*.tsx`, which was sweeping the portfolio's
files into the **suite's** type-check; under the suite config, the portfolio's
`@/*` alias resolves to the wrong `src`, so `npm run build` failed in the
portfolio — even though no suite code was wrong. The "set up portfolio as a
separate project" commit added the docs but not this build-level isolation.

**Consequence:** `npm run build` / `npm run lint` at the root now type-check and
lint only the suite. The portfolio is unaffected (it builds from its own
`tsconfig`). Neither tool reaches across the boundary; nothing under `portfolio/`
was modified.

---

## ADR-009 — OA / Interview-Prep tracker: reuse what exists, add one lean table

**Decision:** The `/prep` page is built mostly over existing infrastructure:

- **Assessments** use the existing `assessments` table — the table was already
  wired into the Calendar, Dashboard, and the planner's suggestion engine, but
  had **no UI**. `/prep` adds the CRUD (and becomes the sole assessment UI).
- **Readiness** is a new, lean `prep_items` table: a **cross-firm** checklist per
  category (quant/mbb/pm/behavioral) with a status (not started → learning →
  ready), resource link, notes, and last-reviewed date. Seedable from a starter
  curriculum (`src/lib/prep-curriculum.ts`, client-safe).
- **The study schedule** reuses the `tasks` table (kind `study`/`prep`) — already
  integrated with Plan, Calendar, and suggestions — via a "schedule study
  session" quick-add. No third scheduler.

**Why:** Timing is the #1 lever, and assessments (esp. quant OAs) have short
windows — surfacing due dates with urgency is the highest-value piece, and it
only needed a UI. Readiness is genuinely cross-firm (you prep "probability"
once, not per firm), so it's modeled separately from per-firm assessments and
dated tasks. Reusing `tasks` keeps one task model instead of forking it.

**Consequence:** One new table; `index.ts` DDL kept in sync with `schema.ts`. The
inline status `<select>`s are keyed by `id:status` so they resync after a modal
edit (a second writer). The old `*AssessmentAction`s in `src/app/actions.ts` are
now dead (no callers) and flagged for a follow-up cleanup. `/prep` revalidates
`/calendar`, `/plan`, and `/` (the surfaces that read assessment/task state);
`/tracker` renders no assessment data, so it's intentionally not revalidated.

---

## ADR-010 — Résumé auto-fit fills the page; per-application tailoring

**Decision:** The "auto-fit to one page" is a **density optimizer**, not a
cut-only loop, and the résumé is tailorable per application.

- *Measure real fill.* `compile.ts` renders with invisible `zref-savepos`
  markers + a `\typeout` of `\textheight`, runs Tectonic with
  `--keep-intermediates --keep-logs` so the `.aux`/`.log` land in outdir, and
  parses an actual **fill ratio** (used height ÷ text height). Page count alone
  can't tell 70%-full from 99%-full.
- *Fill, don't just cut.* Small overflow → mildly tighten elastic spacing (no
  content lost); still over → **trim trailing bullets across all projects (then
  experience) first, and drop a whole project only as a last resort** (lowest
  priority first) — keeping an extra real project is usually worth a shorter
  bullet elsewhere; too short → add the next best project, then binary-search the
  largest spacing that still fits to erase whitespace.
- *Justified body.* Text is justified (not ragged) with a wide
  `emergencystretch` so lines fill edge-to-edge with zero overfull boxes
  (hyphenation stays off). Per-track coursework lists are sized to fill exactly
  one line.
- *Tailorable work history.* `selectedExperienceIds` lets each application
  pick/reorder experiences (e.g., drop Magnolia from a quant résumé), like
  projects.
- *Impact-first, honest bullets.* AI tailoring leads with the strongest TRUE
  metric and avoids orphan last-lines (line economy), still bound to each
  bullet's `groundTruth`.

**Why:** A recruiter-ready résumé is **dense**, not sparse. Cutting whole
projects for a near-miss wasted good content and left a bottom gap; you can't
optimize fill you don't measure.

**Consequence:** Measurement markers/`spacingScale` are injected only for
internal compiles — the user-facing `.tex` stays clean, valid Overleaf LaTeX
(the chosen spacing is baked in). Honesty preserved: no invented metrics,
auto-fit never resurrects a user-excluded bullet, and it reports what it
dropped/trimmed and the final fill %. Deferred résumé ideas live in
`docs/ROADMAP.md`.

---

## ADR-011 — Application Writer: a multi-pass draft→judge→synthesize→polish pipeline on Opus 4.8

**Decision:** Add a second, deeper application-writing surface at `/write`
alongside the existing one-shot Application Assistant (`/apply`). The Writer
takes a pasted job description (plus an optional firm, exact question, custom
instructions, and word limit) and produces a cover letter, "why this company"
essay, or short answer through a four-stage pipeline:

1. **Draft** — ~4 diverse drafts in parallel (default 4 of 5 angles: bold
   opener, maker, motivation-first, in-the-problem, trajectory), each a
   genuinely different opening and structure.
2. **Judge** — each draft scored adversarially with **structured output**
   (`output_config.format` json_schema): boldness, human-voice, company
   specificity/accuracy, honesty, craft (0–10 each), plus a motivation-beat
   flag, an em-dash flag, keep-lines, and concrete issues. Totals are computed
   server-side, not by the model.
3. **Synthesize** — one call grafts the strongest lines/ideas across drafts,
   fixes every judged issue, and pushes bolder and more human than any single
   draft.
4. **Polish** — strips every em-dash and banned AI tell, enforces format and
   length, re-verifies honesty, and returns the final text + a one-line note of
   which company specifics it used + an honesty caveat.

**Why:**

- *The "multi-agent review" is implemented as multiple Anthropic calls in a
  server action*, not an external tool — drafts and judges fan out with
  `Promise.all`; synthesize and polish run sequentially. The whole shared
  context (applicant facts + motivation + company context + task + writing
  criteria) is one big `cache_control` block re-read across all ~11 calls.
- *Quality over cost (Sam's explicit priority).* Every stage runs on **Opus
  4.8** with adaptive thinking at high effort (`anthropic.writerModel` /
  `writerEffort`, overridable by env), independent of the cheaper default the
  other AI surfaces use. One run is ~11 model calls and ~1–2 minutes; the UI
  shows real staged progress (Drafting → Judging → Synthesizing → Polishing) by
  driving four sequential server actions, and surfaces the scored drafts.
- *Honesty stays load-bearing (ADR-007).* Personal facts come only from the
  audited bank's `groundTruth` (never the polished variants); company facts come
  only from the JD + tracker notes. The judge penalizes invented/inflated
  claims; the polish re-verifies. A genuine "what motivates me" beat (creating,
  sharing what he builds, real impact) is required in every draft — stored as an
  optional `profile.motivation` field in the bank with a constant fallback so
  it's always available.
- *Bold + human by construction.* A shared criteria block bans em-dashes and a
  specific list of AI tells; a deterministic post-polish backstop strips any
  surviving em-dash and a one-shot self-repair re-polishes if a banned phrase or
  over-limit length slips through (mechanical checks done in code, not by a
  model call).

**Consequence:** `src/lib/apply/writer-pipeline.ts` is `server-only` and gated
on `ANTHROPIC_API_KEY`; the output-type/angle unions and the draft/judgment/
result DTOs live in `src/lib/labels.ts` (client-safe). Drafts and judgments
round-trip through the client between stages (localhost, single user — no
threat); the honesty-critical profile grounding is rebuilt server-side each
stage and never leaves the server. Generate-and-copy, not persisted (same as
`/apply`). The `samcontext/` bank stays gitignored.

---

## Future decisions to revisit (not yet built)

- **Scheduled scans** — use **Windows Task Scheduler** to run scans, not
  node-cron or a remote agent (a local app only runs when the laptop is on).
- **Gmail ingestion** — read-only scope; consider an IMAP App Password to avoid
  weekly OAuth re-auth. Phase 3.
- **Résumé builder** — LaTeX via Tectonic; per-track templates. Phase 2.
