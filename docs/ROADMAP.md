# Roadmap / future directions

Deferred ideas, captured so they aren't lost. Priorities can shift — the north
star stays: **serve timing → referrals → readiness**, don't over-build.

## Done

- Phase 0–1: foundation, Tracker, Calendar, ATS Search.
- Phase 2: LaTeX résumé builder (track-tailored, Tectonic PDF, AI tailoring/select, auto-fit).
- Phase 3: Plan (queue + goals), Networking (+AI outreach), Gmail Inbox, Google Calendar sync, scheduled scan.
- AI Application Assistant (`/apply`) — grounded per-firm answer drafting (ADR-007).
- Interview-Prep tracker (`/prep`) — assessments UI + readiness checklist (ADR-009).

## Deferred — high leverage (time-sensitive, on-thesis)

1. **Broaden the watchlist to PM & MBB.** The curated watchlist is heavily
   quant-weighted; PM (APM programs + prestige startups) and consulting (MBB +
   adjacent) need real coverage with **verified new-grad timelines** so the whole
   suite works for all three tracks. Public sources only (ADR-001/002); cite and
   verify-before-trust; load via `scripts/import-firms.mjs` + `apply-firm-dates.mjs`.
2. **Date freshness pass.** Many open dates are coarse/estimated or missing;
   deadlines are sparse. The timing engine only pays off with accurate dates —
   surface "firms missing/estimated dates" and refresh from public sources.
3. **Proactive deadline alerts.** Extend the scheduled `scan` to send a daily/
   weekly digest (email via the connected Gmail, or a desktop notification) of
   "opening this week / OA expiring / follow-up due" — beyond the current
   one-way Calendar sync (which already gives Google Calendar reminders).

## Deferred — usability

4. **Per-firm command view.** One page to work a single firm end-to-end: status,
   dates, contacts, assessments, notes, and one-click generate résumé +
   application answer. Data is currently spread across tabs.

## Deferred — robustness / debt

5. **Lightweight test suite** for the pure logic (planner suggestions, date
   helpers, CSV, résumé scoring/auto-fit, AI grounding assemblers). None today.
6. ~~Remove dead assessment Server Actions in `src/app/actions.ts`~~ — ✅ done.
7. **Migrations.** `CREATE TABLE IF NOT EXISTS` + ad-hoc `ensureColumn` won't
   handle altering existing columns as the schema grows — adopt the configured
   `drizzle-kit` flow when a real column change is needed.
8. **Two-projects-one-repo fragility.** `portfolio/` shares the suite's git repo,
   which caused a staging/commit collision between the two windows. Consider
   making `portfolio/` its own repo (or gitignoring it from the suite root).
