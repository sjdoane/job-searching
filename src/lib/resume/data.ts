import "server-only";

import type { ResumeData } from "./types";
// The actual content bank is gitignored (personal data, public repo). It lives
// at samcontext/profile/resume-data.ts and is imported via the @profile alias.
// Keeping this import in a server-only module ensures the bank never ships to
// the client bundle.
import { resumeData } from "@profile/resume-data";

export function getResumeData(): ResumeData {
  return resumeData;
}

/** Lightweight project metadata for the client selection UI (no bullet text). */
export interface ProjectMeta {
  id: string;
  name: string;
  oneLiner: string;
  tracks: ResumeData["projects"][number]["tracks"];
  onBaseResume: boolean;
}

export function getProjectMeta(): ProjectMeta[] {
  return resumeData.projects.map((p) => ({
    id: p.id,
    name: p.name,
    oneLiner: p.oneLiner,
    tracks: p.tracks,
    onBaseResume: p.onBaseResume,
  }));
}

/** Lightweight experience metadata for the client selection UI (no bullet text). */
export interface ExperienceMeta {
  id: string;
  role: string;
  org: string;
  dateLabel: string;
  /** Tracks this experience is gated to, if any (else relevant to all). */
  tracks?: ResumeData["experiences"][number]["tracks"];
}

export function getExperienceMeta(): ExperienceMeta[] {
  return resumeData.experiences.map((e) => ({
    id: e.id,
    role: e.role,
    org: e.org,
    dateLabel: `${e.start} – ${e.end}`,
    tracks: e.tracks,
  }));
}
