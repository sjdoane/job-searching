# Job Search Command Center — project guide for Claude

A locally-run Next.js app that helps Sam (USC MechE B.S.+M.S., ~spring-2027 grad)
run a multi-track new-grad job search: **Product/PM · Quant · Consulting/MBB**.

Read `docs/ARCHITECTURE.md` for structure and `docs/DECISIONS.md` for the
council-driven "why" before making non-trivial changes.

## Guardrails (load-bearing — don't violate)

- **The `portfolio/` folder is a SEPARATE project** (Sam's personal portfolio
  website, its own `portfolio/CLAUDE.md`, worked on in a different window). The
  job-search suite lives at the repo root. **Don't modify anything under
  `portfolio/`** from this window, and it won't touch the suite. The suite dev
  server uses port 3000; the portfolio uses 3001.
- **No LinkedIn/Handshake automation, ever.** ToS + account-ban risk; Handshake
  is the school's account. Search uses only public ATS APIs + curated lists.
  (ADR-002)
- **The SQLite DB lives OUTSIDE this repo**, at
  `%LOCALAPPDATA%\JobSearchCommandCenter\data\app.db`. Never move it into the
  OneDrive-synced project folder — sync corrupts live DBs. (ADR-003)
- **DB is the single source of truth.** CSV/LaTeX are exports, not the store.
- **Keep `src/lib/db/index.ts` DDL in sync with `src/lib/db/schema.ts`.**
- Client components import constants from `src/lib/labels.ts`, never from
  `schema.ts` (avoid bundling the DB layer into the browser).

## Product priorities (from the recruiting domain review)

Timing first ("apply week one of open"), then referrals/networking. The tool
should make deadlines impossible to miss and treat networking as first-class.
ATS "bot auto-rejection" is largely a myth — don't over-engineer the résumé
builder around beating bots.

## Process

- Large decisions get a review **council**; code changes get **review/tester**
  passes. Keep docs (`README`, `ARCHITECTURE`, `DECISIONS`) current as you go.
- Verify changes by actually running `npm run dev` and exercising the feature,
  not just type-checking.

## Status

- **Phase 0 (foundation)** and **Phase 1 (Tracker + Calendar + Search)**: built.
- **Phase 2**: LaTeX résumé builder. **Phase 3**: scheduling/goals + Google
  Calendar sync, read-only Gmail ingestion, broader sourcing, scheduled scans.

@AGENTS.md
