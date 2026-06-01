/**
 * Internships — verified, public-appropriate. Reverse chronological.
 * Qvest is incoming (summer 2026) with no accomplishments yet — listed as such,
 * never fabricated.
 */

export interface ExperienceItem {
  company: string;
  role: string;
  location: string;
  dates: string;
  /** One-line, public context about the firm. */
  blurb: string;
  bullets: string[];
  tags: string[];
}

export const experience: ExperienceItem[] = [
  {
    company: "Qvest",
    role: "Consultant Intern — Incoming",
    location: "Summer 2026",
    dates: "Jun 2026 – Aug 2026",
    blurb: "Technology & management consulting.",
    bullets: [
      "Incoming summer 2026 internship in technology and management consulting.",
    ],
    tags: ["Consulting", "Strategy"],
  },
  {
    company: "Safar Partners",
    role: "Investment Analyst Intern",
    location: "Boston, MA",
    dates: "Jun 2025 – Aug 2025",
    blurb: "Early-stage VC (with Link Ventures) — >$1B AUM, primarily MIT/Harvard spinouts.",
    bullets: [
      "Analyzed 100+ early-stage startups across AI, cleantech, life sciences, and robotics (primarily MIT/Harvard spinouts) within >$1B-AUM portfolios — reviewing CEO pitches, ICMs, and technical documentation.",
      "Identified 20+ cross-portfolio technical partnerships and benchmarked the fund's online presence, delivering a data-backed SEO strategy to boost deal flow.",
    ],
    tags: ["Venture", "Diligence", "Analysis"],
  },
  {
    company: "Magnolia Medical Technologies",
    role: "Product Development Intern",
    location: "Seattle, WA",
    dates: "Jun 2024 – Aug 2024",
    blurb: "Series-C medical-device company (blood-collection / Steripath); FDA 510(k) environment.",
    bullets: [
      "Ran PPQ, design-verification, and root-cause tests on 1,000+ blood-collection devices, supporting QA and scale-up readiness in an FDA 510(k) clinical-grade environment.",
      "Performed video-based imaging, fluid-analysis, leak, and tensile testing to validate device performance under stress.",
      "Delivered $6,000+ in cost savings by repairing VATA venipuncture practice kits.",
    ],
    tags: ["Product Dev", "Medical Device", "QA"],
  },
];
