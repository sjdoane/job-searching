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

## Future decisions to revisit (not yet built)

- **Scheduled scans** — use **Windows Task Scheduler** to run scans, not
  node-cron or a remote agent (a local app only runs when the laptop is on).
- **Gmail ingestion** — read-only scope; consider an IMAP App Password to avoid
  weekly OAuth re-auth. Phase 3.
- **Résumé builder** — LaTeX via Tectonic; per-track templates. Phase 2.
