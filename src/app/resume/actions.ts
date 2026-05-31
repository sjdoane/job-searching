"use server";

import { getResumeData } from "@/lib/resume/data";
import { renderResume } from "@/lib/resume/generate";
import {
  analyzeJD,
  defaultSelection,
  skillsOrder,
  tailoredSelection,
} from "@/lib/resume/tailor";
import type { Track } from "@/lib/resume/types";

export interface BuildResumeInput {
  track: Track;
  jd?: string;
  /** If the user has manually customized the selection, pass it to preserve it. */
  selectedProjectIds?: string[];
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
