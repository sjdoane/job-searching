/**
 * EXAMPLE résumé content bank — placeholder data, safe to commit (public repo).
 *
 * The real bank lives at samcontext/profile/resume-data.ts (GITIGNORED) and is
 * imported by src/lib/resume/data.ts via the @profile/resume-data alias. If you
 * are setting this project up fresh, copy this file to
 * samcontext/profile/resume-data.ts and replace the placeholders with your real,
 * verified content.
 *
 * Honesty rule: every bullet's `groundTruth` is the literal truth; per-track
 * `variants` may only re-emphasize it, never add a new metric/scope/title.
 */
import type { ResumeData } from "./types";

export const resumeData: ResumeData = {
  profile: {
    name: "Your Name",
    contacts: [
      { text: "your-portfolio.com", href: "https://your-portfolio.com" },
      { text: "(555) 123-4567" },
      { text: "you@example.com", href: "mailto:you@example.com" },
      { text: "linkedin.com/in/you", href: "https://www.linkedin.com/in/you" },
    ],
    education: {
      school: "Your University",
      dates: "Aug 2023 - May 2027",
      degree: "B.S., Your Major",
      gpa: "4.0 / 4.0",
      honors: "Honors here",
      coursework: "Course 1, Course 2, Course 3",
    },
    skills: [
      { name: "Python (ML)", tracks: ["quant", "pm"] },
      { name: "Product Strategy", tracks: ["pm", "mbb"] },
    ],
  },
  experiences: [
    {
      id: "example-exp",
      role: "Intern",
      org: "Example Co",
      location: "City, ST",
      start: "June 2025",
      end: "August 2025",
      bullets: [
        {
          id: "example-exp-1",
          groundTruth: "The literal, verifiable fact with real numbers.",
          variants: {
            default: "Default phrasing of the accomplishment",
            quant: "Quant-emphasized phrasing (same facts)",
          },
        },
      ],
    },
  ],
  projects: [
    {
      id: "example-project",
      name: "Example Project",
      role: "Your role, Org, City, ST",
      location: "City, ST",
      dateLabel: "2026",
      tracks: ["quant", "pm"],
      priority: { quant: 1, pm: 2 },
      onBaseResume: true,
      oneLiner: "Short description shown in the selection UI.",
      keywords: ["python", "data analysis", "design"],
      bullets: [
        {
          id: "example-project-1",
          groundTruth: "The literal truth about what you built and the results.",
          variants: { default: "Default bullet phrasing" },
        },
      ],
    },
  ],
};

export default resumeData;
