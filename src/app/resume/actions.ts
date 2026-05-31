"use server";

import { buildCandidates, selectProjectsWithAI } from "@/lib/resume/ai-select";
import { tailorBullets } from "@/lib/resume/ai-tailor";
import { autoFitResume } from "@/lib/resume/autofit";
import { compileResumeToPdf, type CompileResult } from "@/lib/resume/compile";
import { getResumeData } from "@/lib/resume/data";
import { renderResume } from "@/lib/resume/generate";
import {
  analyzeJD,
  defaultSelection,
  skillsOrder,
  tailoredSelection,
} from "@/lib/resume/tailor";
import type { Bullet, Track } from "@/lib/resume/types";

export interface BuildResumeInput {
  track: Track;
  jd?: string;
  /** If the user has manually customized the selection, pass it to preserve it. */
  selectedProjectIds?: string[];
  /** Approved AI-tailored bullet rewrites, by bullet id. */
  bulletOverrides?: Record<string, string>;
}

export interface BuildResumeResult {
  track: Track;
  tex: string;
  selectedProjectIds: string[];
  skillsUsed: string[];
  matchedKeywords: string[];
  matchedSkills: string[];
  projectScores: Record<string, number>;
}

export async function buildResumeAction(
  input: BuildResumeInput,
): Promise<BuildResumeResult> {
  const data = getResumeData();
  const jd = input.jd?.trim() || undefined;

  const selection =
    input.selectedProjectIds && input.selectedProjectIds.length > 0
      ? input.selectedProjectIds
      : jd
        ? tailoredSelection(data, input.track, jd)
        : defaultSelection(data, input.track);

  const skills = skillsOrder(data, input.track, jd);
  const analysis = jd
    ? analyzeJD(data, jd)
    : { matchedKeywords: [], matchedSkills: [], projectScores: {} };

  const tex = renderResume(data, {
    track: input.track,
    selectedProjectIds: selection,
    skillsOrder: skills,
    jdKeywords: analysis.matchedKeywords,
    bulletOverrides: input.bulletOverrides,
  });

  return {
    track: input.track,
    tex,
    selectedProjectIds: selection,
    skillsUsed: skills,
    matchedKeywords: analysis.matchedKeywords,
    matchedSkills: analysis.matchedSkills,
    projectScores: analysis.projectScores,
  };
}

// ---------------------------------------------------------------------------
// Compile to PDF (Tectonic) — in-app, no Overleaf
// ---------------------------------------------------------------------------

export async function compileResumeAction(tex: string): Promise<CompileResult> {
  return compileResumeToPdf(tex);
}

export interface AutoFitInput {
  track: Track;
  jd?: string;
  selectedProjectIds: string[];
  bulletOverrides?: Record<string, string>;
}

export interface AutoFitResponse {
  ok: boolean;
  pages?: number;
  tex?: string;
  pdfBase64?: string;
  selectedProjectIds?: string[];
  removedNames?: string[];
  fits?: boolean;
  error?: string;
  needsInstall?: boolean;
}

/** Compile → check one-page → trim → repeat, returning the fitted PDF + result. */
export async function autoFitResumeAction(
  input: AutoFitInput,
): Promise<AutoFitResponse> {
  const data = getResumeData();
  const jd = input.jd?.trim() || undefined;
  const skills = skillsOrder(data, input.track, jd);
  const matchedKeywords = jd ? analyzeJD(data, jd).matchedKeywords : [];

  const result = autoFitResume(data, {
    track: input.track,
    selectedProjectIds: input.selectedProjectIds,
    skillsOrder: skills,
    jdKeywords: matchedKeywords,
    bulletOverrides: input.bulletOverrides,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, needsInstall: result.needsInstall };
  }
  const nameById = new Map(data.projects.map((p) => [p.id, p.name]));
  return {
    ok: true,
    pages: result.pages,
    tex: result.tex,
    pdfBase64: result.pdfBase64,
    selectedProjectIds: result.selectedProjectIds,
    fits: result.fits,
    removedNames: (result.removedProjectIds ?? []).map(
      (id) => nameById.get(id) ?? id,
    ),
  };
}

// ---------------------------------------------------------------------------
// AI project selection — let Claude pick/order the best projects for the role
// ---------------------------------------------------------------------------

export interface AISelectInput {
  track: Track;
  jd?: string;
}

export interface AISelectResult {
  ids: string[];
  reasons: Record<string, string>;
}

export async function aiSelectProjectsAction(
  input: AISelectInput,
): Promise<AISelectResult> {
  const data = getResumeData();
  const selection = await selectProjectsWithAI(
    input.track,
    input.jd?.trim() ?? "",
    buildCandidates(data),
  );
  return {
    ids: selection.map((s) => s.id),
    reasons: Object.fromEntries(selection.map((s) => [s.id, s.reason])),
  };
}

// ---------------------------------------------------------------------------
// AI tailoring (Anthropic) — strict-grounded bullet rewrites for review
// ---------------------------------------------------------------------------

export interface TailorDiff {
  id: string;
  label: string;
  groundTruth: string;
  current: string;
  suggestion: string;
}

export interface TailorResumeInput {
  track: Track;
  jd?: string;
  /** The projects currently selected (only these + experiences are tailored). */
  selectedProjectIds: string[];
}

/**
 * Returns AI-suggested rewrites (diffed against current text) for the bullets in
 * the selected experiences and projects. The model is constrained to each
 * bullet's groundTruth (see ai-tailor.ts). The user reviews/accepts before any
 * suggestion is used.
 */
export async function tailorResumeAction(
  input: TailorResumeInput,
): Promise<TailorDiff[]> {
  const data = getResumeData();
  const jd = input.jd?.trim() ?? "";
  const track = input.track;

  const bulletText = (b: Bullet) => b.variants[track] ?? b.variants.default;

  const items = [
    ...data.experiences.flatMap((e) =>
      e.bullets.map((b) => ({
        id: b.id,
        label: `${e.role} @ ${e.org}`,
        groundTruth: b.groundTruth,
        current: bulletText(b),
      })),
    ),
    ...data.projects
      .filter((p) => input.selectedProjectIds.includes(p.id))
      .flatMap((p) =>
        p.bullets.map((b) => ({
          id: b.id,
          label: p.name,
          groundTruth: b.groundTruth,
          current: bulletText(b),
        })),
      ),
  ];

  const suggestions = await tailorBullets(track, jd, items);
  const byId = new Map(items.map((i) => [i.id, i]));

  return suggestions
    .map((s) => {
      const item = byId.get(s.id);
      if (!item) return null;
      return {
        id: s.id,
        label: item.label,
        groundTruth: item.groundTruth,
        current: item.current,
        suggestion: s.suggestion,
      };
    })
    .filter((d): d is TailorDiff => d !== null && d.suggestion !== d.current);
}
