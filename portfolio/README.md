# Samuel Doane — Portfolio

Personal portfolio for Samuel Doane: a multidisciplinary engineer-builder spanning
mechanical design, robotics, AI/ML, and quantitative finance, with a venture streak.

Built with **Next.js 16 (App Router) + TypeScript + Tailwind CSS v4**. Static,
fast, accessible, and Vercel-ready.

## Develop

```bash
npm install
npm run dev      # http://localhost:3001
```

The dev server runs on **port 3001** (the job-search suite at the repo root uses 3000).

## Build

```bash
npm run build
npm start        # serves the production build on port 3001
```

## Structure

```
src/
  app/                 App Router: layout, home page, /projects/[slug], /resume, OG image
  components/          UI sections + primitives (Nav, Hero, Projects, etc.)
  content/             Public, verified content (profile, experience, projects)
  lib/                 Small shared helpers
public/                Static assets
```

All résumé/profile content lives in `src/content/` and is curated to be
**public-appropriate** — no salary preferences, application-tracker data, or any
job-search internals. Project metrics are kept honest and match the verified
source material.

## Deploy (Vercel)

Set the Vercel **Root Directory** to `portfolio/`. Framework preset: Next.js.
Then point `samueldoaneportfolio.com` at the Vercel deployment.
