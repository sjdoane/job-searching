import "server-only";

import { compileResumeToPdf } from "./compile";
import { renderResume } from "./generate";
import type { RenderOptions, ResumeData } from "./types";

/**
 * The closed loop the critique asked for: generate -> render (real PDF) ->
 * check -> revise -> repeat. The authoritative constraint is "fits on exactly
 * one page" (per the rendered PDF, not an LLM estimate). When it overflows we
 * trim, least-destructive first: drop the lowest-priority projects (they're
 * ordered best-first), then trailing bullets, until it fits.
 */

const MIN_PROJECTS = 3;
const MAX_ITERATIONS = 18;

export interface AutoFitResult {
  ok: boolean;
  pages?: number;
  tex?: string;
  pdfBase64?: string;
  selectedProjectIds?: string[];
  excludeBulletIds?: string[];
  removedProjectIds?: string[];
  /** True if it reached a single page; false if still over after max trimming. */
  fits?: boolean;
  iterations?: number;
  error?: string;
  needsInstall?: boolean;
}

/** Non-first bullet ids of the selected projects, ordered last-project-first. */
function droppableBulletIds(data: ResumeData, selection: string[]): string[] {
  const byId = new Map(data.projects.map((p) => [p.id, p]));
  const out: string[] = [];
  for (const pid of [...selection].reverse()) {
    const p = byId.get(pid);
    if (!p) continue;
    for (let i = p.bullets.length - 1; i >= 1; i--) out.push(p.bullets[i].id);
  }
  return out;
}

export async function autoFitResume(
  data: ResumeData,
  base: RenderOptions,
): Promise<AutoFitResult> {
  const selection = [...base.selectedProjectIds];
  const exclude = new Set(base.excludeBulletIds ?? []);
  const removedProjectIds: string[] = [];
  let iterations = 0;

  const buildAndCompile = async () => {
    const tex = renderResume(data, {
      ...base,
      selectedProjectIds: selection,
      excludeBulletIds: [...exclude],
    });
    return { tex, res: await compileResumeToPdf(tex) };
  };

  let { tex, res } = await buildAndCompile();
  iterations++;
  if (!res.ok) {
    return { ok: false, error: res.error, needsInstall: res.needsInstall };
  }

  // Phase 1 — drop lowest-priority projects (from the end of the ordered list).
  while ((res.pages ?? 1) > 1 && selection.length > MIN_PROJECTS && iterations < MAX_ITERATIONS) {
    const dropped = selection.pop();
    if (dropped) removedProjectIds.push(dropped);
    ({ tex, res } = await buildAndCompile());
    iterations++;
    if (!res.ok) return { ok: false, error: res.error };
  }

  // Phase 2 — drop trailing bullets if still over a page.
  if ((res.pages ?? 1) > 1) {
    const droppable = droppableBulletIds(data, selection);
    let i = 0;
    while ((res.pages ?? 1) > 1 && i < droppable.length && iterations < MAX_ITERATIONS) {
      exclude.add(droppable[i]);
      i++;
      ({ tex, res } = await buildAndCompile());
      iterations++;
      if (!res.ok) return { ok: false, error: res.error };
    }
  }

  return {
    ok: true,
    pages: res.pages,
    tex,
    pdfBase64: res.pdfBase64,
    selectedProjectIds: selection,
    excludeBulletIds: [...exclude],
    removedProjectIds,
    fits: (res.pages ?? 1) <= 1,
    iterations,
  };
}
