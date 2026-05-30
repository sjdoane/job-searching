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
| `src/app/actions.ts`         | All Server Actions (create/update/delete, import, add).   |
| `src/app/api/tracker/export` | CSV export route handler.                                 |
| `src/lib/db/paths.ts`        | Resolves the DB path **outside** OneDrive.                |
| `src/lib/db/schema.ts`       | Drizzle schema + status/track/type unions.                |
| `src/lib/db/index.ts`        | Connection singleton + idempotent table bootstrap.        |
| `src/lib/tracker.ts`         | Typed query functions + deadline aggregation.             |
| `src/lib/sources/`           | Curated boards + ATS fetchers/normalizers.                |
| `src/lib/labels.ts`          | UI-facing constants/colors (client-safe, no DB import).   |
| `src/lib/dates.ts`, `csv.ts` | Pure helpers (no I/O).                                     |
| `src/components/`            | UI primitives + the tracker board / target form.          |
| `scripts/seed.mjs`           | Standalone seeder for known recruiting-timeline targets.  |

## Data model

Three tables (see `src/lib/db/schema.ts`):

- **targets** — the core watchlist row (company, role, track, status, priority,
  `opens_at`, `deadline`, `applied_at`, comp, notes).
- **contacts** — networking contacts, optionally linked to a target, with
  `next_follow_up_at`.
- **assessments** — OAs/cases/games/onsites tied to a target, with `due_at`.

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

## Schema changes

Day-to-day startup needs no migration step — `index.ts` runs
`CREATE TABLE IF NOT EXISTS` on boot. When you *change* the schema, keep the DDL
in `index.ts` in sync with `schema.ts`, and use `drizzle-kit` (configured in
`drizzle.config.ts`) to generate proper migration SQL for existing databases.
