"use server";

import { tailorBullets } from "@/lib/resume/ai-tailor";
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
