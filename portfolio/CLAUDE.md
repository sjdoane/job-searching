# Portfolio Website — project guide for Claude

This folder (`portfolio/`) is **Sam Doane's personal portfolio website** — a
complete, modern rebuild of his outdated site (was www.samueldoaneportfolio.com).
It is a **separate project** from the job-search command center that lives at the
repo root. The two are worked on in different windows; they share the git repo
but not the codebase.

## Hard rules (don't violate)

- **Stay inside `portfolio/`.** Never modify the job-search suite at the repo
  root (`/src`, `/scripts`, `/docs`, root `package.json`, etc.). Treat everything
  outside `portfolio/` as read-only.
- **This site is PUBLIC and will be deployed.** Only include public-appropriate
  professional content. **Never surface** anything from the job-search tooling:
  salary expectations, the application tracker / firm lists, "doesn't hire new
  grads" notes, recruiting-date research, verification caveats, recruiter
  contacts, or the local database. Contact info: email (`sjdoane@usc.edu`) and
  LinkedIn are fine; ask Sam before publishing his phone number.
- **Accuracy is non-negotiable.** Don't invent metrics or claims. The project
  docs already mark what's verified vs. caveated — **respect those flags**
  (e.g., SEA-Quadruped: use the honest ~8.5 cm sim jump, not 15 cm; DJ-mixer
  "<50 ms" is unverified; pendulum CAD/3D-printing is Sam's per his correction).
- **Dev server on port 3001** (`-p 3001`) so it never collides with the suite on
  3000.
- **Commit only `portfolio/` files.** If `git push` is rejected because the other
  window pushed first, run `git pull --rebase` then push. End commit messages
  with the standard Co-Authored-By trailer.
- Ensure `portfolio/.gitignore` excludes `node_modules/`, `.next/` (or build
  output), and any local env files.

## Content — source of truth (READ-ONLY, then curate a committed copy)

All of Sam's real, verified content already exists in the repo at
`samcontext/profile/` (gitignored — read it, then bake the public-appropriate
parts into your own committed content files under `portfolio/`):

- `samcontext/profile/resume-data.ts` — structured profile, experiences, and
  projects (name, role, one-liner, ground-truth bullets, track tags). The
  cleanest single source.
- `samcontext/profile/projects/*.md` — rich per-project detail: problem, Sam's
  role, tech/methods, verified metrics, and repo links. Use these to write
  project pages.
- `samcontext/profile/MASTER_PROFILE.md`, `EXPERIENCE.md`,
  `RESUME_REFERENCE.md` — identity, education (B.S. Mechanical Eng + M.S. AI/ML,
  GPA 3.93, 6× Dean's List, Presidential Scholarship), and the 3 internships.
- `samcontext/Sam Context.txt` — extra context + the full list of GitHub repos.
- `samcontext/old resumes/*.pdf` — the current résumé (link a PDF on the site).

GitHub: github.com/sjdoane (repos: RL-Sculptor, pit-backtest, KalshiBot,
SEA-Quadruped, pendulum-drag-extraction, image-classification, CVFruitNinja,
music-dna, syllabus-to-calendar, etc.). Team repos: frawgmanman/a-chord-ion,
mhrmich/Tech_Week (the DJ mixer).

## Who Sam is (for tone)

USC senior, Mechanical Engineering B.S. + M.S. in AI/ML, graduating spring 2027.
Targets product/PM, quant, and prestige consulting. Strong span: mechanical
design & CAD, hands-on hardware/robotics, AI/ML, and quant-finance projects, plus
a venture/entrepreneurship streak (ADAProsthetics was a $125K-competition
finalist). The site should read as a sharp, multidisciplinary
engineer-builder — credible to recruiters across PM, quant, and consulting.

## Goal & suggested shape

Replace the old site with a fast, polished, responsive, accessible one-page (or
lightly multi-page) portfolio:
- **Hero / about** — who he is, the multidisciplinary angle, a clear CTA.
- **Projects** — the centerpiece. Lead with the strongest (ADAProsthetics), then
  a curated mix across robotics/hardware (SEA-Quadruped, A(Chord)ion, KinetiClip,
  pendulum), AI/ML & quant (pit-backtest, Kalshi, RL-Sculptor, DJ mixer,
  image-classification). Each: a crisp summary, the real metrics, tech tags,
  links (GitHub / demo). Consider visuals/figures where available.
- **Experience** — Safar (VC), Magnolia Medical (product dev), Qvest (incoming).
- **Skills**, **Education/honors**, **Contact** (email, LinkedIn, GitHub, résumé
  PDF).

## Stack & process

- Recommended stack: **Next.js (App Router) + TypeScript + Tailwind** (easy
  Vercel deploy, consistent with the rest of the repo) — or Astro if you prefer
  for a content site. **Confirm the choice with Sam**, then scaffold inside
  `portfolio/` with its own `package.json` / `node_modules`.
- **Plan before building**: propose the structure, visual direction, and project
  selection/ordering to Sam, then implement. Keep design tasteful and modern
  (clean type, good spacing, subtle motion — not gimmicky).
- Deploy target: **Vercel**, project root set to `portfolio/`. Make it
  build-clean and Lighthouse-friendly.
