/**
 * Content types for the portfolio. All content is PUBLIC and curated from Sam's
 * verified source material — no salary prefs, job-search internals, or unverified
 * metrics. Keep numbers honest and matched to the audited project docs.
 */

export type Pillar =
  | "Mechanical"
  | "Robotics"
  | "AI/ML"
  | "Quant"
  | "Product"
  | "Venture";

export interface Metric {
  /** Short, scannable value, e.g. "~8.5 cm" or "1 of 6". */
  value: string;
  /** What the value means. */
  label: string;
}

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  slug: string;
  name: string;
  /** One-line positioning shown on cards. */
  tagline: string;
  year: string;
  role: string;
  org?: string;
  pillars: Pillar[];
  tech: string[];
  featured: boolean;
  /** 1–2 sentence summary (card + detail intro). */
  summary: string;
  /** Detail-page fields (featured projects). */
  problem?: string;
  contributions?: string[];
  highlights?: string[];
  metrics?: Metric[];
  /** Honest status / framing note (e.g. "in progress", "simulation-validated"). */
  status?: string;
  links: ProjectLink[];
}
