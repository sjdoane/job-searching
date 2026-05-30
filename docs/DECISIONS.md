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

## Future decisions to revisit (not yet built)

- **Scheduled scans** — use **Windows Task Scheduler** to run scans, not
  node-cron or a remote agent (a local app only runs when the laptop is on).
- **Gmail ingestion** — read-only scope; consider an IMAP App Password to avoid
  weekly OAuth re-auth. Phase 3.
- **Résumé builder** — LaTeX via Tectonic; per-track templates. Phase 2.
