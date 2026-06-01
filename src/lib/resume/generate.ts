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

type Overrides = Record<string, string> | undefined;

/** Bullets relevant to the track and not explicitly excluded (auto-fit trim). */
function visibleBullets(
  bullets: Bullet[],
  track: Track,
  exclude: Set<string>,
): Bullet[] {
  return bullets.filter(
    (b) => !exclude.has(b.id) && (!b.tracks || b.tracks.includes(track)),
  );
}

function bulletText(bullet: Bullet, track: Track, overrides: Overrides): string {
  return (
    overrides?.[bullet.id] ?? bullet.variants[track] ?? bullet.variants.default
  );
}

function itemize(bullets: string[]): string {
  const items = bullets
    .map((b) => `  \\item ${escapeLatex(b)}`)
    .join("\n");
  return `\\begin{itemize}\n${items}\n\\end{itemize}`;
}

function experienceBlock(
  exp: Experience,
  track: Track,
  overrides: Overrides,
  exclude: Set<string>,
): string {
  const date = `${exp.start} -- ${exp.end}`;
  const bullets = visibleBullets(exp.bullets, track, exclude).map((b) =>
    bulletText(b, track, overrides),
  );
  return [
    `\\entry{${escapeLatex(exp.role)}}{${escapeLatex(date)}}`,
    `\\sub{${escapeLatex(`${exp.org}, ${exp.location}`)}}`,
    itemize(bullets),
  ].join("\n");
}

function projectBlock(
  project: Project,
  track: Track,
  overrides: Overrides,
  exclude: Set<string>,
): string {
  // Two-line layout (name+date on line 1, org/role on line 2) keeps the title
  // line short so the right-aligned date can never collide with a long heading.
  const bullets = visibleBullets(project.bullets, track, exclude).map((b) =>
    bulletText(b, track, overrides),
  );
  const lines = [
    `\\entry{${escapeLatex(project.name)}}{${escapeLatex(project.dateLabel)}}`,
  ];
  if (project.role) lines.push(`\\sub{${escapeLatex(project.role)}}`);
  lines.push(itemize(bullets));
  return lines.join("\n");
}

/**
 * The document preamble. Vertical spacing is multiplied by `scale` (1 = the
 * tuned default) so the auto-fit can elastically tighten/expand the chosen
 * content to fill exactly one page. `measure` adds the zref-savepos package used
 * to report page fill. Horizontal layout, fonts, and the orphan/widow penalties
 * are unchanged across scales.
 */
function buildPreamble(scale: number, measure: boolean): string {
  const r = (n: number) => Math.round(n * scale * 100) / 100;
  const zref = measure ? "\n\\usepackage{zref-savepos}" : "";
  return String.raw`\documentclass[letterpaper,10pt]{article}

\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage[margin=0.5in]{geometry}
\usepackage{titlesec}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}${zref}

\pagestyle{empty}
\setlength{\parindent}{0pt}

\titleformat{\section}{\normalsize\bfseries\scshape}{}{0em}{}[{\titlerule[0.8pt]}]
\titlespacing*{\section}{0pt}{${r(8)}pt}{${r(4)}pt}

\setlist[itemize]{leftmargin=1.4em, topsep=${r(1)}pt, itemsep=${r(1)}pt, parsep=0pt,
  before=\vspace{${r(-3)}pt}, after=\vspace{${r(-1)}pt}, label=\textbullet}

% Layout discipline: left-align (no justified-spacing wraps), forbid hyphenation
% and widows/orphans, and avoid overfull boxes. This prevents broken words like
% "Re-/search", lonely continuation lines, and date-collision artifacts.
\hyphenpenalty=10000
\exhyphenpenalty=10000
\clubpenalty=10000
\widowpenalty=10000
\setlength{\emergencystretch}{2em}

\newcommand{\entry}[2]{\textbf{#1}\hfill{\small #2}\par}
\newcommand{\sub}[1]{\textit{#1}\par\vspace{${r(1)}pt}}`;
}

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

function educationBlock(data: ResumeData, track: Track): string {
  const e = data.profile.education;
  const coursework = e.courseworkByTrack?.[track] ?? e.coursework;
  return [
    "\\section*{Education}",
    `\\entry{${escapeLatex(e.school)}}{${escapeLatex(e.dates)}}`,
    `${escapeLatex(e.degree)}\\par`,
    `GPA: ${escapeLatex(e.gpa)}\\par`,
    `${escapeLatex(e.honors)}\\par`,
    `Course work: ${escapeLatex(coursework)}`,
  ].join("\n");
}

function orderedSkills(data: ResumeData, options: RenderOptions): string[] {
  if (options.skillsOrder && options.skillsOrder.length > 0) {
    return options.skillsOrder;
  }
  // Only show skills relevant to the track (drop, e.g., product/design terms on
  // a quant résumé), matched ones first.
  return data.profile.skills
    .filter((s) => s.tracks.includes(options.track))
    .map((s) => s.name);
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

  const exclude = new Set(options.excludeBulletIds ?? []);

  const experiences = data.experiences
    .filter((e) => !e.tracks || e.tracks.includes(options.track))
    .map((e) =>
      experienceBlock(e, options.track, options.bulletOverrides, exclude),
    )
    .join("\n\n");

  const projects = selectedProjects
    .map((p) => projectBlock(p, options.track, options.bulletOverrides, exclude))
    .join("\n\n");

  const skills = orderedSkills(data, options).map(escapeLatex).join(", ");

  // Measurement instrumentation (auto-fit only). Invisible zref markers at the
  // top and bottom of the body + a \typeout of the page geometry let the
  // compiler report exactly how full the page is. Never in the user-facing .tex.
  const preamble = buildPreamble(options.spacingScale ?? 1, Boolean(options.measure));
  const topMark = options.measure
    ? "\\zsavepos{jsccTop}\\typeout{JSCC_GEO th=\\the\\textheight tw=\\the\\textwidth}"
    : "";
  const endMark = options.measure ? "\\zsavepos{jsccEnd}" : "";

  return [
    preamble,
    "",
    "\\begin{document}",
    "\\raggedright",
    topMark,
    "",
    header(data),
    "",
    educationBlock(data, options.track),
    "",
    "\\section*{Experience}",
    experiences,
    "",
    "\\section*{Projects}",
    projects,
    "",
    "\\section*{Technical Skills}",
    skills,
    endMark,
    "",
    "\\end{document}",
    "",
  ].join("\n");
}
