# Job Search Command Center

A locally-run, deadline-aware command center for a multi-track new-grad job
search (Product/PM · Quant · Consulting/MBB). It runs entirely on your machine —
no hosting, no accounts, your data stays local.

> **The core insight driving this tool:** for new-grad recruiting, *timing* is
> the #1 controllable lever — apply in week one of a posting opening — followed
> by *referrals/networking*. So the tool leads with deadlines and a tracker, not
> mass auto-applying.

## What's here (Phase 1)

- **Dashboard** — counts by track/stage and the next 60 days of dated items.
- **Tracker** — your watchlist: every company/role you're targeting, with a
  status pipeline, deadlines, open dates, comp, and notes. CSV import/export.
- **Calendar** — a month grid + agenda of every dated thing (open dates,
  deadlines, assessments, contact follow-ups).
- **Search** — live roles pulled from **public** company job boards
  (Greenhouse / Lever / Ashby) plus links to curated GitHub new-grad lists.
  Results add straight into the Tracker. No LinkedIn/Handshake scraping (against
  their ToS and a ban risk — see `docs/DECISIONS.md`).
- **Résumé builder** — generates a track-tailored (Quant / Consulting / PM),
  Overleaf-ready LaTeX résumé from a structured content bank of your *verified*
  experiences and projects. Paste a job description to re-rank by keyword match.
  Honest by construction — it only selects/reorders/re-emphasizes true content,
  never invents. Optional **AI tailoring** (Anthropic) rewrites bullets to a JD
  but stays within each bullet's ground-truth facts, with a diff to approve.
  Copy or download the `.tex`.
- **Inbox** — read-only scan of recent recruiting mail (Gmail), with one-click
  "add as lead" to the tracker. Suggest-only; never modifies your mailbox.
- **Settings** — connect Gmail + Google Calendar and check AI status. One-way
  **calendar sync** pushes your deadlines/assessments/follow-ups to Google
  Calendar (idempotent — re-syncing updates, never duplicates).

## Getting started

```bash
npm install        # first time only
npm run seed       # optional: pre-load known MBB/quant/PM timeline targets
npm run dev        # start the app at http://localhost:3000
```

Open http://localhost:3000.

## Where your data lives

The SQLite database lives **outside** this folder, at:

```
%LOCALAPPDATA%\JobSearchCommandCenter\data\app.db
```

This is deliberate — OneDrive sync can corrupt a live database, and this repo
sits under OneDrive. The code is synced; the data is not. To back up your data,
copy that folder. To start fresh, delete it (the app recreates the tables on
next launch). You can override the location with the `JSCC_DATA_DIR` env var.

## Scripts

| Command         | What it does                                           |
| --------------- | ------------------------------------------------------ |
| `npm run dev`   | Run the app locally (hot reload).                      |
| `npm run build` | Production build (also a full type + lint check).      |
| `npm run seed`  | Insert curated MBB/quant/PM targets with open dates.   |
| `npm run scan`  | Headless one-way calendar sync (used by Task Scheduler).|
| `npm run lint`  | ESLint.                                                |

## Connecting Gmail / Calendar / AI

Copy `.env.example` to `.env.local`, paste your keys, and restart. Then open
**Settings** in the app to connect Google (one-time consent) and confirm AI
status. Full step-by-step for the Google Cloud setup is in `.env.example`.

To automate the daily calendar sync, register a Windows Scheduled Task once:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\register-scan-task.ps1
```

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · SQLite via better-sqlite3 +
Drizzle ORM. See `docs/ARCHITECTURE.md` for how it fits together and
`docs/DECISIONS.md` for the why behind the big choices.

## Résumé content bank (required for the builder)

The résumé builder reads your personal content from
`samcontext/profile/resume-data.ts`, which is **gitignored** (the repo is
public). A placeholder template lives at
[`src/lib/resume/resume-data.example.ts`](src/lib/resume/resume-data.example.ts)
— copy it to `samcontext/profile/resume-data.ts` and fill in your real, verified
content. (Sam's machine already has this file; a fresh clone needs it before the
`/resume` page will build.)

## Roadmap

- **Phase 2 ✅** — LaTeX résumé builder (per-track tailoring + JD keyword
  matching) — built.
- **Phase 3** — scheduling/goals + Google Calendar sync, read-only Gmail
  ingestion of recruiting mail, broader job sourcing, scheduled scans via
  Windows Task Scheduler.
