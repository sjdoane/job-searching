import type { Experience, Project, ResumeData, Track } from "./types";

/**
 * Deterministic, honest tailoring. These functions only SELECT, ORDER, and
 * SURFACE existing true content from the bank based on the track and an optional
 * job description. They never generate or alter resume text. (A future LLM pass
 * would slot in here as an alternative strategy producing the same ordering
 * outputs — see RenderOptions.)
 */

const MAX_PROJECTS = 6;

function priorityFor(p: Project, track: Track): number {
  return p.priority[track] ?? 99;
}

/** Projects relevant to a track (explicitly tagged, or already on base resume). */
export function relevantProjects(data: ResumeData, track: Track): Project[] {
  return data.projects.filter(
    (p) => p.tracks.includes(track) || p.onBaseResume,
  );
}

/** Experiences relevant to a track (all, unless an experience is track-gated). */
export function relevantExperiences(data: ResumeData, track: Track): Experience[] {
  return data.experiences.filter((e) => !e.tracks || e.tracks.includes(track));
}

/** Default ordered experience ids for a track (bank order). */
export function defaultExperienceSelection(data: ResumeData, track: Track): string[] {
  return relevantExperiences(data, track).map((e) => e.id);
}

// --------------------------------------------------------------------------
// Job-description matching
// --------------------------------------------------------------------------

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#]+/)
      .filter(Boolean),
  );
}

/** Does a keyword (possibly multi-word) appear in the JD? */
function keywordHit(keyword: string, jdLower: string, jdTokens: Set<string>): boolean {
  if (keyword.includes(" ")) return jdLower.includes(keyword);
  return jdTokens.has(keyword);
}

export interface JDAnalysis {
  /** Project id -> number of its keywords found in the JD. */
  projectScores: Record<string, number>;
  /** Distinct project keywords that matched (for display). */
  matchedKeywords: string[];
  /** Skill names that the JD references (for surfacing). */
  matchedSkills: string[];
}

export function analyzeJD(data: ResumeData, jdText: string): JDAnalysis {
  const jdLower = jdText.toLowerCase();
  const jdTokens = tokenize(jdText);

  const projectScores: Record<string, number> = {};
  const matched = new Set<string>();
  for (const p of data.projects) {
    let score = 0;
    for (const kw of p.keywords) {
      if (keywordHit(kw, jdLower, jdTokens)) {
        score++;
        matched.add(kw);
      }
    }
    projectScores[p.id] = score;
  }

  const matchedSkills = data.profile.skills
    .filter((s) =>
      s.name
        .toLowerCase()
        .replace(/[()]/g, " ")
        .split(/[^a-z0-9+#]+/)
        .filter((t) => t.length >= 2)
        .some((t) => jdTokens.has(t)),
    )
    .map((s) => s.name);

  return {
    projectScores,
    matchedKeywords: [...matched].sort(),
    matchedSkills,
  };
}

// --------------------------------------------------------------------------
// Selection & ordering
// --------------------------------------------------------------------------

/** Default ordered project ids for a track (no JD): by track priority. */
export function defaultSelection(data: ResumeData, track: Track): string[] {
  return relevantProjects(data, track)
    .slice()
    .sort((a, b) => {
      const pa = priorityFor(a, track);
      const pb = priorityFor(b, track);
      if (pa !== pb) return pa - pb;
      // tie-break: base-resume projects first, then name
      if (a.onBaseResume !== b.onBaseResume) return a.onBaseResume ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_PROJECTS)
    .map((p) => p.id);
}

/** JD-tailored ordered project ids: JD score first, then track priority. */
export function tailoredSelection(
  data: ResumeData,
  track: Track,
  jdText: string,
): string[] {
  const { projectScores } = analyzeJD(data, jdText);
  return relevantProjects(data, track)
    .slice()
    .sort((a, b) => {
      const sa = projectScores[a.id] ?? 0;
      const sb = projectScores[b.id] ?? 0;
      if (sa !== sb) return sb - sa; // higher JD score first
      const pa = priorityFor(a, track);
      const pb = priorityFor(b, track);
      if (pa !== pb) return pa - pb;
      return a.onBaseResume === b.onBaseResume ? 0 : a.onBaseResume ? -1 : 1;
    })
    .slice(0, MAX_PROJECTS)
    .map((p) => p.id);
}

/**
 * Skills for a track: only those relevant to the track (so a quant résumé drops
 * product/design terms), with JD-matched skills surfaced first.
 */
export function skillsOrder(
  data: ResumeData,
  track: Track,
  jdText?: string,
): string[] {
  const matched = new Set(jdText ? analyzeJD(data, jdText).matchedSkills : []);
  return data.profile.skills
    .filter((s) => s.tracks.includes(track))
    .map((s, index) => ({ s, index }))
    .sort((a, b) => {
      const am = matched.has(a.s.name) ? 1 : 0;
      const bm = matched.has(b.s.name) ? 1 : 0;
      if (am !== bm) return bm - am;
      return a.index - b.index;
    })
    .map(({ s }) => s.name);
}
