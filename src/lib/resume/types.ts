/**
 * Types for the résumé content bank and generator. No personal data here — the
 * actual content lives in the gitignored bank at samcontext/profile/resume-data.ts
 * (imported via the @profile/* alias). The repo is public; the bank is not.
 *
 * HONESTY MODEL (per domain review): every bullet carries an immutable
 * `groundTruth` — the literal facts + verified numbers. Per-track `variants` may
 * only RE-EMPHASIZE those facts for a different audience; they must never
 * introduce a metric, scope, or seniority claim absent from `groundTruth`.
 */

export type Track = "quant" | "mbb" | "pm";

export const TRACKS: Track[] = ["quant", "mbb", "pm"];

export const TRACK_LABEL: Record<Track, string> = {
  quant: "Quant",
  mbb: "Consulting (MBB)",
  pm: "Product / PM",
};

export interface BulletVariants {
  /** Always present. Used when no track-specific variant exists. */
  default: string;
  quant?: string;
  mbb?: string;
  pm?: string;
}

export interface Bullet {
  id: string;
  /** Immutable facts + verified numbers. Variants may not exceed this. */
  groundTruth: string;
  variants: BulletVariants;
  /** If set, only show this bullet on these tracks (relevance filter). */
  tracks?: Track[];
}

export interface Experience {
  id: string;
  role: string;
  org: string;
  location: string;
  start: string; // e.g. "June 2025"
  end: string; // e.g. "August 2025" or "Present"
  bullets: Bullet[];
  /** If set, only include this experience on these tracks. */
  tracks?: Track[];
}

export interface Project {
  id: string;
  name: string;
  /** Role/affiliation line, e.g. "Co-leader, USC MEDesign". */
  role?: string;
  location: string;
  dateLabel: string; // e.g. "September 2023 – Present" or "October 2025"
  /** Tracks this project is relevant to. */
  tracks: Track[];
  /** Lower number = higher priority for that track. Missing = lowest. */
  priority: Partial<Record<Track, number>>;
  /** Keywords used for JD matching (lowercase). */
  keywords: string[];
  /** Short description for the selection UI (not printed on the resume). */
  oneLiner: string;
  bullets: Bullet[];
  /** True if it appears on the current/base resume. */
  onBaseResume: boolean;
}

export interface Skill {
  name: string;
  /** Tracks this skill should be surfaced first for. */
  tracks: Track[];
}

export interface ContactLink {
  text: string;
  href?: string;
}

export interface Profile {
  name: string;
  contacts: ContactLink[];
  education: {
    school: string;
    dates: string;
    degree: string;
    gpa: string;
    honors: string;
    coursework: string;
    /** Optional per-track coursework override (e.g. trim to quant-relevant). */
    courseworkByTrack?: Partial<Record<Track, string>>;
  };
  skills: Skill[];
}

export interface ResumeData {
  profile: Profile;
  experiences: Experience[];
  projects: Project[];
}

/** Options that fully determine a generated resume (referentially transparent). */
export interface RenderOptions {
  track: Track;
  /** Ordered project ids to include. */
  selectedProjectIds: string[];
  /** Ordered skill names. If omitted, generator uses track default order. */
  skillsOrder?: string[];
  /** Lowercased JD keywords that matched, for skill surfacing (not inserted). */
  jdKeywords?: string[];
  /**
   * Per-bullet text overrides (by bullet id), e.g. AI-tailored rewrites the user
   * has approved. When present for a bullet, this text is used verbatim instead
   * of the track variant. Still plain text — the generator escapes it.
   */
  bulletOverrides?: Record<string, string>;
}
