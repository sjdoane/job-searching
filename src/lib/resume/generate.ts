import type {
  Bullet,
  Experience,
  Project,
  RenderOptions,
  ResumeData,
  Track,
} from "./types";

const LATEX_ESCAPES: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
};

/** Escape a plain-text string for safe inclusion in LaTeX body text. */
export function escapeLatex(input: string): string {
  return input.replace(/[\\&%$#_{}~^<>]/g, (c) => LATEX_ESCAPES[c]);
}

/**
 * Escape a URL for the first argument of \href{...}. Unlike body text, the URL
 * must keep its literal characters but still escape the LaTeX-active ones that
 * would break compilation or truncate the line (notably % and #).
 */
export function escapeLatexHref(url: string): string {
  return url.replace(/[%#&_{}\\]/g, (c) => `\\${c}`);
}

function bulletText(bullet: Bullet, track: Track): string {
  return bullet.variants[track] ?? bullet.variants.default;
}

function itemize(bullets: string[]): string {
  const items = bullets
    .map((b) => `  \\item ${escapeLatex(b)}`)
    .join("\n");
  return `\\begin{itemize}\n${items}\n\\end{itemize}`;
}

function experienceBlock(exp: Experience, track: Track): string {
  const date = `${exp.start} -- ${exp.end}`;
  const bullets = exp.bullets.map((b) => bulletText(b, track));
  return [
    `\\entry{${escapeLatex(exp.role)}}{${escapeLatex(date)}}`,
    `\\sub{${escapeLatex(`${exp.org}, ${exp.location}`)}}`,
    itemize(bullets),
  ].join("\n");
}

function projectBlock(project: Project, track: Track): string {
  const titleRole = project.role
    ? `${escapeLatex(project.name)} \\textnormal{--- ${escapeLatex(project.role)}}`
    : escapeLatex(project.name);
  const bullets = project.bullets.map((b) => bulletText(b, track));
  return [
    `\\entry{${titleRole}}{${escapeLatex(project.dateLabel)}}`,
    itemize(bullets),
  ].join("\n");
}

const PREAMBLE = String.raw`\documentclass[letterpaper,10pt]{article}

\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=0.5in]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}

\pagestyle{empty}
\setlength{\parindent}{0pt}

\titleformat{\section}{\normalsize\bfseries\scshape}{}{0em}{}[{\titlerule[0.8pt]}]
\titlespacing*{\section}{0pt}{8pt}{4pt}

\setlist[itemize]{leftmargin=1.4em, topsep=1pt, itemsep=1pt, parsep=0pt,
  before=\vspace{-3pt}, after=\vspace{-1pt}, label=\textbullet}

\newcommand{\entry}[2]{\textbf{#1}\hfill #2\par}
\newcommand{\sub}[1]{\textit{#1}\par\vspace{1pt}}`;

function header(data: ResumeData): string {
  const contacts = data.profile.contacts
    .map((c) =>
      c.href
        ? `\\href{${escapeLatexHref(c.href)}}{${escapeLatex(c.text)}}`
        : escapeLatex(c.text),
    )
    .join(" \\ $|$\\ ");
  return [
    "\\begin{center}",
    `  {\\LARGE\\bfseries\\scshape ${escapeLatex(data.profile.name)}}\\\\[3pt]`,
    "  \\small",
    `  ${contacts}`,
    "\\end{center}",
  ].join("\n");
}

function educationBlock(data: ResumeData): string {
  const e = data.profile.education;
  return [
    "\\section*{Education}",
    `\\entry{${escapeLatex(e.school)}}{${escapeLatex(e.dates)}}`,
    `${escapeLatex(e.degree)}\\par`,
    `GPA: ${escapeLatex(e.gpa)}\\par`,
    `${escapeLatex(e.honors)}\\par`,
    `Course work: ${escapeLatex(e.coursework)}`,
  ].join("\n");
}

function orderedSkills(data: ResumeData, options: RenderOptions): string[] {
  if (options.skillsOrder && options.skillsOrder.length > 0) {
    return options.skillsOrder;
  }
  // Default: surface track-relevant skills first, preserving original order.
  const relevant = data.profile.skills
    .filter((s) => s.tracks.includes(options.track))
    .map((s) => s.name);
  const rest = data.profile.skills
    .filter((s) => !s.tracks.includes(options.track))
    .map((s) => s.name);
  return [...relevant, ...rest];
}

/**
 * Pure: given the content bank and options, produce a complete, Overleaf-ready
 * LaTeX document. Referentially transparent — same inputs, same output.
 */
export function renderResume(
  data: ResumeData,
  options: RenderOptions,
): string {
  const projectsById = new Map(data.projects.map((p) => [p.id, p]));
  const selectedProjects = options.selectedProjectIds
    .map((id) => projectsById.get(id))
    .filter((p): p is Project => Boolean(p));

  const experiences = data.experiences
    .map((e) => experienceBlock(e, options.track))
    .join("\n\n");

  const projects = selectedProjects
    .map((p) => projectBlock(p, options.track))
    .join("\n\n");

  const skills = orderedSkills(data, options).map(escapeLatex).join(", ");

  return [
    PREAMBLE,
    "",
    "\\begin{document}",
    "",
    header(data),
    "",
    educationBlock(data),
    "",
    "\\section*{Experience}",
    experiences,
    "",
    "\\section*{Projects}",
    projects,
    "",
    "\\section*{Technical Skills}",
    skills,
    "",
    "\\end{document}",
    "",
  ].join("\n");
}
