import "server-only";

import { compileResumeToPdf, type CompileResult } from "./compile";
import { renderResume } from "./generate";
import { relevantProjects } from "./tailor";
import type { Bullet, RenderOptions, ResumeData, Track } from "./types";

/**
 * Density-aware one-page fit. The goal is NOT merely "<= 1 page" — it's "fill
 * the page as fully as possible, dense and readable, without spilling."
 *
 * Strategy, least-destructive first:
 *  1. Too long, but close -> mildly tighten spacing (no content lost).
 *  2. Still too long -> remove the lowest-value content bottom-up: thin a weak
 *     project's trailing bullets, then drop the whole weak project, working up;
 *     the top projects and real experience are preserved. (So a near-miss trims
 *     a line; a big overflow drops a weak project rather than gutting good ones.)
 *  3. Too short -> add real content back (trimmed bullets, then the next best
 *     project) — beneficial info over filler.
 *  4. Finally, elastically expand spacing to absorb residual whitespace so the
 *     page is full, not bottom-gapped.
 * Fit + fill are measured from the actual rendered PDF, never estimated.
 */

const MIN_PROJECTS = 3;
const MAX_PROJECTS = 9;
const COMFORT_SCALE = 1; // default spacing
const MILD_TIGHTEN = 0.9; // absorb a small overflow without cutting content
const HARD_TIGHTEN = [0.85, 0.8]; // last-resort floors if content cuts aren't enough
const MAX_EXPAND = 1.5; // cap how airy we get when filling
const TARGET_FILL = 0.97; // stop expanding once this full
const GROW_CONTENT_UNTIL = 0.9; // add real content while below this
const MAX_ITERATIONS = 16;

type RemoveOp = { kind: "bullet"; id: string } | { kind: "project"; id: string };

function trackVisible(bullets: Bullet[], track: Track, exclude: Set<string>): Bullet[] {
  return bullets.filter(
    (b) => !exclude.has(b.id) && (!b.tracks || b.tracks.includes(track)),
  );
}

/**
 * Ordered, least-valuable-first removal plan: bottom-up over the selection, thin
 * each project's trailing bullets (keep the first), and once a project is beyond
 * the keep-minimum, drop it whole; then trailing experience bullets. Applied one
 * op at a time until the page fits.
 */
function removalSequence(
  data: ResumeData,
  track: Track,
  selection: string[],
  exclude: Set<string>,
  experienceIds: string[] | undefined,
): RemoveOp[] {
  const ops: RemoveOp[] = [];
  const byId = new Map(data.projects.map((p) => [p.id, p]));
  for (let idx = selection.length - 1; idx >= 0; idx--) {
    const p = byId.get(selection[idx]);
    if (!p) continue;
    const vis = trackVisible(p.bullets, track, exclude);
    for (let i = vis.length - 1; i >= 1; i--) ops.push({ kind: "bullet", id: vis[i].id });
    if (idx >= MIN_PROJECTS) ops.push({ kind: "project", id: selection[idx] });
  }
  const exps = data.experiences
    .filter((e) => !e.tracks || e.tracks.includes(track))
    .filter((e) => !experienceIds || experienceIds.includes(e.id));
  for (const e of [...exps].reverse()) {
    const vis = trackVisible(e.bullets, track, exclude);
    for (let i = vis.length - 1; i >= 1; i--) ops.push({ kind: "bullet", id: vis[i].id });
  }
  return ops;
}

/** Relevant projects not yet selected, best (track-priority) first. */
function addableProjects(data: ResumeData, track: Track, selection: string[]): string[] {
  const sel = new Set(selection);
  return relevantProjects(data, track)
    .filter((p) => !sel.has(p.id))
    .sort(
      (a, b) =>
        (a.priority[track] ?? 99) - (b.priority[track] ?? 99) ||
        (a.onBaseResume === b.onBaseResume ? 0 : a.onBaseResume ? -1 : 1),
    )
    .map((p) => p.id);
}

export async function autoFitResume(
  data: ResumeData,
  base: RenderOptions,
): Promise<AutoFitResult> {
  const track = base.track;
  const selection = [...base.selectedProjectIds];
  const exclude = new Set(base.excludeBulletIds ?? []);
  // Bullets the caller already excluded (user/AI intent) — auto-fit must never
  // resurrect these, only the ones it trims itself this run.
  const originalExclude = new Set(exclude);
  let scale = COMFORT_SCALE;
  const removedProjectIds: string[] = [];
  const addedProjectIds: string[] = [];
  let iterations = 0;

  const measure = async (): Promise<CompileResult> => {
    const tex = renderResume(data, {
      ...base,
      selectedProjectIds: selection,
      excludeBulletIds: [...exclude],
      spacingScale: scale,
      measure: true,
    });
    iterations++;
    return compileResumeToPdf(tex, { metricsOnly: true });
  };
  const fits = (r: CompileResult) => r.ok && (r.pages ?? 1) <= 1;

  let res = await measure();
  if (!res.ok) return { ok: false, error: res.error, needsInstall: res.needsInstall };

  if (!fits(res)) {
    // 1) absorb a small overflow by tightening a little — no content lost.
    scale = MILD_TIGHTEN;
    res = await measure();
    if (!res.ok) return { ok: false, error: res.error };

    // 2) still over: remove lowest-value content, bottom-up.
    if (!fits(res)) {
      const ops = removalSequence(
        data,
        track,
        selection,
        exclude,
        base.selectedExperienceIds,
      );
      let oi = 0;
      while (!fits(res) && oi < ops.length && iterations < MAX_ITERATIONS) {
        const op = ops[oi++];
        if (op.kind === "bullet") {
          exclude.add(op.id);
        } else {
          const i = selection.indexOf(op.id);
          if (i < 0) continue;
          selection.splice(i, 1);
          removedProjectIds.push(op.id);
        }
        res = await measure();
        if (!res.ok) return { ok: false, error: res.error };
      }
    }

    // 3) extreme last resort: tighten below the comfortable floor.
    for (const s of HARD_TIGHTEN) {
      if (fits(res) || iterations >= MAX_ITERATIONS) break;
      scale = s;
      res = await measure();
      if (!res.ok) return { ok: false, error: res.error };
    }
  } else if ((res.fillRatio ?? 1) < GROW_CONTENT_UNTIL) {
    // Too short: add real, beneficial content — the next best relevant projects.
    // (We never re-add caller-excluded bullets; that's deliberate user intent.)
    for (const pid of addableProjects(data, track, selection)) {
      if (
        iterations >= MAX_ITERATIONS ||
        (res.fillRatio ?? 1) >= GROW_CONTENT_UNTIL ||
        selection.length >= MAX_PROJECTS
      )
        break;
      selection.push(pid);
      const trial = await measure();
      if (!trial.ok) return { ok: false, error: trial.error };
      if (fits(trial)) {
        res = trial;
        addedProjectIds.push(pid);
      } else {
        selection.pop();
      }
    }
  }

  // 4) Elastic fill: binary-search the largest scale in [current, MAX_EXPAND]
  //    that still fits, absorbing residual whitespace into even spacing.
  if (fits(res) && (res.fillRatio ?? 1) < TARGET_FILL) {
    let lo = scale;
    let hi = MAX_EXPAND;
    let best = scale;
    let bestRes = res;
    for (let k = 0; k < 6 && iterations < MAX_ITERATIONS; k++) {
      const mid = Math.round(((lo + hi) / 2) * 100) / 100;
      if (mid <= lo) break;
      scale = mid;
      const trial = await measure();
      if (!trial.ok) return { ok: false, error: trial.error };
      if (fits(trial)) {
        best = mid;
        bestRes = trial;
        lo = mid;
        if ((trial.fillRatio ?? 1) >= TARGET_FILL) break;
      } else {
        hi = mid;
      }
    }
    scale = best;
    res = bestRes;
  }

  // Final clean render (no measurement markers) + PDF.
  const cleanTex = renderResume(data, {
    ...base,
    selectedProjectIds: selection,
    excludeBulletIds: [...exclude],
    spacingScale: scale,
    measure: false,
  });
  const finalRes = await compileResumeToPdf(cleanTex);
  if (!finalRes.ok) {
    return { ok: false, error: finalRes.error, needsInstall: finalRes.needsInstall };
  }

  return {
    ok: true,
    pages: finalRes.pages,
    tex: cleanTex,
    pdfBase64: finalRes.pdfBase64,
    selectedProjectIds: selection,
    excludeBulletIds: [...exclude],
    removedProjectIds,
    addedProjectIds,
    trimmedBulletCount: [...exclude].filter((id) => !originalExclude.has(id)).length,
    spacingScale: scale,
    fillRatio: res.fillRatio,
    fits: (finalRes.pages ?? 1) <= 1,
    iterations,
  };
}

export interface AutoFitResult {
  ok: boolean;
  pages?: number;
  tex?: string;
  pdfBase64?: string;
  selectedProjectIds?: string[];
  excludeBulletIds?: string[];
  removedProjectIds?: string[];
  addedProjectIds?: string[];
  /** Count of bullets auto-fit trimmed this run (excludes caller-supplied ones). */
  trimmedBulletCount?: number;
  /** Final elastic spacing multiplier chosen. */
  spacingScale?: number;
  /** Final page fill fraction (0..1). */
  fillRatio?: number;
  fits?: boolean;
  iterations?: number;
  error?: string;
  needsInstall?: boolean;
}
