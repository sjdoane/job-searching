import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";
import type {
  WriterAngleKey,
  WriterDraft,
  WriterJudgedDraft,
  WriterJudgment,
  WriterOutputType,
  WriterResult,
} from "@/lib/labels";
import { WRITER_ANGLE_OPTIONS, writerAngleLabel } from "@/lib/labels";
import { getResumeData } from "@/lib/resume/data";
import { TRACK_LABEL, type Track } from "@/lib/resume/types";

/**
 * The Application Writer pipeline: a deliberate, multi-pass loop that turns a
 * pasted job description (plus an optional firm, question, and instructions)
 * into a bold, human, HONEST cover letter or application answer.
 *
 *   draft (N in parallel, diverse angles)
 *     → judge (each draft, adversarial, structured)
 *       → synthesize (one best version, grafting the strongest material)
 *         → polish (strip AI tells, enforce format/length, verify honesty)
 *
 * Quality over cost (Sam's explicit priority): every stage runs on the most
 * capable model (Opus 4.8 by default) with adaptive thinking at high effort.
 * The shared grounding (applicant facts + motivation + company context + the
 * task + the writing criteria) is one big system block, cached with
 * cache_control so it is written once and re-read for free across all ~11
 * calls in a run. Drafts and judges fan out with Promise.all; synthesize and
 * polish run sequentially.
 *
 * HONESTY (load-bearing, same discipline as assistant.ts / ai-tailor.ts, ADR-007):
 * personal facts may come ONLY from the audited résumé bank (each bullet's
 * immutable `groundTruth`, never the polished variants); company facts may come
 * ONLY from the pasted JD and the firm's tracker notes. Nothing is invented or
 * inflated. The judge stage penalizes ungrounded claims; the polish stage
 * re-verifies; a deterministic backstop strips any surviving em-dash.
 */

const WRITER_MODEL = anthropic.writerModel;
const WRITER_EFFORT = anthropic.writerEffort as Anthropic.OutputConfig["effort"];

/** Fallback if the bank doesn't carry a motivation (keeps the beat always available). */
const SAM_MOTIVATION =
  "What drives me is the act of creating and building, then handing what I build to other people and watching it help them. I am hungry for real impact.";

// ---------------------------------------------------------------------------
// Public types (resolved input). The DTO/result types live in labels.ts so the
// client can hold them without importing this server-only module.
// ---------------------------------------------------------------------------

export interface WriterInput {
  outputType: WriterOutputType;
  /** The pasted job description — the primary input and a company-fact source. */
  jobDescription: string;
  /** Required for short_answer: the exact application question. */
  question?: string | null;
  /** Free-text tone/emphasis/length instructions from Sam. */
  instructions?: string | null;
  /** Optional hard word cap. */
  wordLimit?: number | null;
  // Optional firm, pulled from the tracker:
  firmName?: string | null;
  role?: string | null;
  /** Tracker track value: "pm" | "quant" | "mbb" | "other". */
  firmTrack?: string | null;
  firmNotes?: string | null;
  location?: string | null;
  /** How many diverse drafts to generate (default 4). */
  draftCount?: number;
}

// ---------------------------------------------------------------------------
// Static prompt pieces
// ---------------------------------------------------------------------------

const ANGLE_DIRECTION: Record<WriterAngleKey, string> = {
  audacious:
    "Open with a bold, specific claim that stakes real ground from the very first sentence. No throat-clearing, no \"I am excited to apply.\" Earn attention immediately, then back the claim with concrete, true evidence.",
  maker:
    "Write as a maker. Lead with the concrete things Sam has actually designed, built, and shipped, and what they did for real people. Show the hands-on builder behind the work, not a list of adjectives.",
  motivation:
    "Open from genuine motivation: the drive to create and build, the joy of handing what he makes to other people, the hunger for real impact. Make it specific to THIS role and firm, not a greeting-card sentiment.",
  user_obsessed:
    "Write as someone who lives inside the user's problem. Start from the problem this role/firm is solving, show Sam's instinct for users and his evidence (discovery interviews, real usage, iteration), then connect his ability to build to it.",
  trajectory:
    "Frame the Mechanical-Engineering-to-AI/ML dual-degree arc as a deliberate trajectory aimed squarely at this mission. Show momentum and direction toward the role, not a résumé recap.",
};

const CRITERIA = `WRITING CRITERIA — apply these to every draft, to the synthesis, and to the polish. They are the bar this work is judged against.

1. ANSWER THE PROMPT DIRECTLY. Say the thing. Do not circle it.
2. ALWAYS include a genuine "what motivates me" beat, even when the prompt does not ask for one — the drive to create and build, the joy of sharing what he makes with other people, the hunger for real impact. It must read as authentic and specific, never as a checkbox.
3. BOLD AND CONFIDENT, professionally. Stake a real claim. No hedging, no "I believe I would be a good fit," no apologizing for inexperience.
4. SOUND LIKE A REAL PERSON. Vary sentence length and structure. Use a few short, punchy lines. Open consecutive sentences differently. Choose words a careful human would choose, not the words an AI defaults to.
5. NO EM-DASH CHARACTERS ANYWHERE. Do not use "—" or "–". Use periods, commas, colons, or parentheses instead.
6. BANNED AI TELLS — never use any of these: "I am writing to", "passion"/"passionate", "Moreover"/"Furthermore"/"Additionally", "delve", "tapestry", "testament", "leverage" (as a verb crutch), "resonate", "thrilled to", "in today's landscape", "not only … but also", "at the forefront", "seamless", "ever-evolving", "stands as a", "boasts", "honed", "underscores". Also avoid stacked rule-of-three lists ("X, Y, and Z" piled up sentence after sentence).
7. REFERENCE SPECIFIC EXPERIENCE briefly — the 2 or 3 most resonant items for this role, with what was actually done. Not a résumé dump.
8. REFERENCE THE COMPANY with specific, accurate facts drawn ONLY from the job description and the firm notes provided. Never invent a product, value, team, metric, or piece of news.
9. HONESTY IS LOAD-BEARING. Every claim about Sam must trace to the APPLICANT FACTS below. Invent nothing, inflate nothing ("contributed to" is not "led"; a simulation is not a deployed product). If something is genuinely thin, write the strongest honest version and let real motivation carry it.`;

/** The adversarial judge's structured scorecard (json_schema for output_config.format). */
const JUDGE_SCHEMA: Anthropic.JSONOutputFormat = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      boldness: {
        type: "integer",
        description:
          "0-10. Does it stake a real, confident claim and avoid all hedging?",
      },
      humanVoice: {
        type: "integer",
        description:
          "0-10. Does it read like a real person (varied rhythm, no AI tells)? Penalize generic phrasing.",
      },
      companySpecificity: {
        type: "integer",
        description:
          "0-10. Are the company references specific AND accurate, grounded only in the JD/notes? Penalize invented or generic firm claims.",
      },
      honesty: {
        type: "integer",
        description:
          "0-10. Is every claim about the applicant grounded in the APPLICANT FACTS, with nothing invented or inflated? This is the most important dimension.",
      },
      craft: {
        type: "integer",
        description:
          "0-10. Structure, flow, economy, a strong opening and close.",
      },
      motivationBeatPresent: {
        type: "boolean",
        description:
          "Is there a genuine, specific 'what motivates me' beat (creating/building, sharing with others, real impact)?",
      },
      hasEmDash: {
        type: "boolean",
        description: "Does the draft contain any em-dash or en-dash character?",
      },
      keepLines: {
        type: "array",
        items: { type: "string" },
        description: "1 to 3 of the single strongest lines worth keeping verbatim.",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description:
          "Concrete, specific problems to fix: hedging, AI tells, ungrounded or inflated claims, missing motivation beat, weak opener, length.",
      },
    },
    required: [
      "boldness",
      "humanVoice",
      "companySpecificity",
      "honesty",
      "craft",
      "motivationBeatPresent",
      "hasEmDash",
      "keepLines",
      "issues",
    ],
  },
};

/** The polish stage's structured output: final text + two short notes. */
const POLISH_SCHEMA: Anthropic.JSONOutputFormat = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      body: {
        type: "string",
        description:
          "The final, fully formatted response text, ready to paste. No surrounding quotes or commentary.",
      },
      companySpecifics: {
        type: "string",
        description:
          "One line naming the specific company facts (from the JD/notes) the response actually used.",
      },
      honestyNote: {
        type: "string",
        description:
          "One short, honest caveat if anything was thin or should be verified before sending. Empty string if there is nothing to flag.",
      },
    },
    required: ["body", "companySpecifics", "honestyNote"],
  },
};

// ---------------------------------------------------------------------------
// Grounding
// ---------------------------------------------------------------------------

function toResumeTrack(track?: string | null): Track | undefined {
  return track === "quant" || track === "mbb" || track === "pm"
    ? track
    : undefined;
}

function outputTypeLabel(t: WriterOutputType): string {
  if (t === "cover_letter") return "cover letter";
  if (t === "motivation_essay") return '"why this company" / motivation essay';
  return "short-answer response";
}

function contactLine(): string {
  // A clean contact line for the cover-letter sign-off, from the audited bank.
  return getResumeData()
    .profile.contacts.filter((c) => /@|\d|\./.test(c.text))
    .slice(0, 3)
    .map((c) => c.text)
    .join(" · ");
}

function formatGuidance(input: WriterInput): string {
  const firm = input.firmName?.trim();
  if (input.outputType === "cover_letter") {
    return [
      "FORMAT — a traditional cover letter:",
      "- An optional date line is fine.",
      `- Greeting: "Dear ${firm ? `${firm} Hiring Team` : "Hiring Team"},"`,
      "- A hook opening line that is NOT a template ('I am writing to', 'I am excited to apply' are forbidden).",
      "- 2 to 3 short body paragraphs of concrete, true evidence mapped to the role and firm.",
      "- A brief, confident close.",
      '- Sign-off: a line "Sincerely," then "Samuel Doane" on the next line, then a contact line:',
      `  ${contactLine()}`,
      "- Length: about 250 to 400 words.",
    ].join("\n");
  }
  if (input.outputType === "motivation_essay") {
    return [
      'FORMAT — a "why this company" / motivation essay:',
      "- Plain first-person prose. No greeting, no signature, no letter scaffolding, no headings.",
      "- Length: match what the prompt implies, or about 250 to 400 words if unspecified.",
    ].join("\n");
  }
  return [
    "FORMAT — a short-answer response:",
    "- Plain prose that answers the exact question directly. No greeting or signature.",
    "- Length: match what the question implies; respect any word limit strictly.",
  ].join("\n");
}

/**
 * The single big shared grounding block. Identical bytes across every call in a
 * run, so cache_control writes it once and re-reads it for free. Holds the
 * applicant facts (groundTruth only), the motivation, the company context
 * (JD + notes), the task spec, and the criteria.
 */
function buildGroundContext(input: WriterInput): string {
  const d = getResumeData();
  const p = d.profile;
  const track = toResumeTrack(input.firmTrack);
  const edu = p.education;
  const coursework =
    (track && edu.courseworkByTrack?.[track]) || edu.coursework;

  const skills = [...p.skills]
    .sort((a, b) => {
      const ar = track && a.tracks.includes(track) ? 0 : 1;
      const br = track && b.tracks.includes(track) ? 0 : 1;
      return ar - br;
    })
    .map((s) => s.name);

  const lines: string[] = [
    "APPLICANT FACTS — the complete, verified record of the applicant. State NOTHING about the applicant that is not grounded here. Never invent or inflate a number, title, scope, employer, project, skill, award, GPA, or date.",
    "",
    `Name: ${p.name}`,
    `Education: ${edu.degree}, ${edu.school} (${edu.dates}). GPA ${edu.gpa}. ${edu.honors}.`,
    `Relevant coursework: ${coursework}.`,
    `Skills: ${skills.join(", ")}.`,
    "",
    "EXPERIENCE:",
  ];
  for (const e of d.experiences) {
    lines.push(`- ${e.role}, ${e.org} (${e.location}; ${e.start} – ${e.end})`);
    for (const b of e.bullets) lines.push(`  • ${b.groundTruth}`);
  }

  const projects = [...d.projects].sort((a, b) => {
    const ar =
      track && a.tracks.includes(track) ? (a.priority[track] ?? 99) : 1000;
    const br =
      track && b.tracks.includes(track) ? (b.priority[track] ?? 99) : 1000;
    return ar - br;
  });
  lines.push("", "PROJECTS:");
  for (const pr of projects) {
    const rel = track ? pr.tracks.includes(track) : pr.onBaseResume;
    const role = pr.role ? `${pr.role}; ` : "";
    lines.push(
      `- ${pr.name} (${role}${pr.dateLabel})${rel ? " [most relevant here]" : ""}: ${pr.oneLiner}`,
    );
    for (const b of pr.bullets.slice(0, 2)) lines.push(`  • ${b.groundTruth}`);
  }

  lines.push(
    "",
    "WHAT MOTIVATES THE APPLICANT (use this to ground every motivation beat — it is true and durable):",
    p.motivation || SAM_MOTIVATION,
  );

  // Company context — the ONLY source of company-specific facts.
  lines.push(
    "",
    "COMPANY CONTEXT — reference the company using ONLY the facts in this section (the job description and any firm notes). Never state a company fact that is not here.",
  );
  if (input.firmName?.trim()) {
    lines.push(`- Firm: ${input.firmName.trim()}`);
    if (input.role?.trim()) lines.push(`- Role: ${input.role.trim()}`);
    if (input.location?.trim()) lines.push(`- Location: ${input.location.trim()}`);
    if (track) lines.push(`- Track emphasis: ${TRACK_LABEL[track]}`);
  } else {
    lines.push(
      "- No specific firm was selected. The job description below is the sole source of company facts.",
    );
  }
  lines.push(
    "",
    "JOB DESCRIPTION (primary input):",
    input.jobDescription.trim() || "(none pasted)",
  );
  if (input.firmNotes?.trim()) {
    lines.push("", "FIRM RESEARCH NOTES (additional company facts you may use):", input.firmNotes.trim());
  }

  // The task.
  lines.push("", "THE TASK:", `Write a ${outputTypeLabel(input.outputType)}.`);
  if (input.outputType === "short_answer") {
    lines.push(
      "EXACT APPLICATION QUESTION (answer this directly):",
      `"${input.question?.trim() ?? ""}"`,
    );
  }
  if (input.instructions?.trim()) {
    lines.push(
      "",
      "CUSTOM INSTRUCTIONS from the applicant (honor these — tone, emphasis, length, anything):",
      input.instructions.trim(),
    );
  }
  if (input.wordLimit && input.wordLimit > 0) {
    lines.push("", `HARD WORD LIMIT: about ${input.wordLimit} words. Do not exceed it.`);
  }
  lines.push("", formatGuidance(input));

  lines.push("", CRITERIA);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Anthropic call helper (streaming for timeout safety; cached system blocks)
// ---------------------------------------------------------------------------

function getClient(): Anthropic {
  return new Anthropic({ apiKey: anthropic.apiKey });
}

interface CallOptions {
  client: Anthropic;
  ground: string;
  instructions: string;
  userMessage: string;
  maxTokens: number;
  format?: Anthropic.JSONOutputFormat;
}

async function runMessage(opts: CallOptions): Promise<string> {
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: opts.ground, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: opts.instructions,
      cache_control: { type: "ephemeral" },
    },
  ];
  const output_config: Anthropic.OutputConfig = { effort: WRITER_EFFORT };
  if (opts.format) output_config.format = opts.format;

  // Stream + finalMessage(): adaptive thinking at high effort can run long, and
  // streaming avoids the SDK's non-streaming timeout guard.
  const stream = opts.client.messages.stream({
    model: WRITER_MODEL,
    max_tokens: opts.maxTokens,
    thinking: { type: "adaptive" },
    output_config,
    system,
    messages: [{ role: "user", content: opts.userMessage }],
  });
  const msg = await stream.finalMessage();
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function clamp(n: unknown, lo = 0, hi = 10): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function wordCount(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

function safeJsonParse(text: string): unknown | null {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s !== -1 && e > s) {
      try {
        return JSON.parse(t.slice(s, e + 1));
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json|markdown|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

const EM_DASH = /[—―]/; // em dash, horizontal bar
const EN_DASH = /–/;

/** Deterministic last-resort: guarantee zero em/en dashes survive in the output. */
function stripDashes(s: string): string {
  return s
    .replace(/\s*[—―]\s*/g, ", ") // em dash → comma
    .replace(/(\d)\s*–\s*(\d)/g, "$1-$2") // numeric en-dash range → hyphen
    .replace(/\s*–\s*/g, ", ") // other en dash → comma
    .replace(/,\s*,/g, ", ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*\./g, ".")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Banned AI-tell phrases, as word-boundary-aware patterns for a deterministic scan. */
const BANNED_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "I am writing to", re: /\bI am writing to\b/i },
  { label: "passion/passionate", re: /\bpassionate?\b/i },
  { label: "Moreover", re: /\bmoreover\b/i },
  { label: "Furthermore", re: /\bfurthermore\b/i },
  { label: "Additionally", re: /\badditionally\b/i },
  { label: "delve", re: /\bdelve\b/i },
  { label: "tapestry", re: /\btapestry\b/i },
  { label: "testament", re: /\btestament\b/i },
  { label: "leverage", re: /\bleverage\b/i },
  { label: "resonate", re: /\bresonate(s|d)?\b/i },
  { label: "thrilled to", re: /\bthrilled to\b/i },
  { label: "in today's landscape", re: /\bin today'?s landscape\b/i },
  { label: "not only … but also", re: /\bnot only\b/i },
  { label: "at the forefront", re: /\bat the forefront\b/i },
  { label: "seamless", re: /\bseamless(ly)?\b/i },
  { label: "ever-evolving", re: /\bever[- ]evolving\b/i },
  { label: "stands as a", re: /\bstands as a\b/i },
  { label: "boasts", re: /\bboasts?\b/i },
  { label: "honed", re: /\bhoned\b/i },
  { label: "underscores", re: /\bunderscore(s|d)?\b/i },
];

/** Deterministic mechanical issues that warrant a corrective re-polish. */
function scanIssues(body: string, input: WriterInput): string[] {
  const issues: string[] = [];
  if (EM_DASH.test(body) || EN_DASH.test(body)) {
    issues.push(
      "Remove every em-dash and en-dash character; use periods, commas, colons, or parentheses instead.",
    );
  }
  for (const { label, re } of BANNED_PATTERNS) {
    if (re.test(body)) issues.push(`Remove the banned AI tell "${label}".`);
  }
  if (input.wordLimit && input.wordLimit > 0) {
    const wc = wordCount(body);
    if (wc > input.wordLimit) {
      issues.push(
        `Trim to about ${input.wordLimit} words (it is currently ${wc}).`,
      );
    }
  }
  return issues;
}

function pickAngles(n?: number): WriterAngleKey[] {
  const all = WRITER_ANGLE_OPTIONS.map((a) => a.value);
  const count = Math.max(3, Math.min(6, Math.floor(n ?? 4) || 4));
  const out: WriterAngleKey[] = [];
  for (let i = 0; i < count; i++) out.push(all[i % all.length]);
  return out;
}

// ---------------------------------------------------------------------------
// Stage 1 — Draft (parallel, diverse angles)
// ---------------------------------------------------------------------------

const DRAFT_INSTRUCTIONS = `You are a bold, genuine application writer drafting in Samuel Doane's own first-person voice. Using ONLY the grounding above, write one complete ${"${type}"}.

Obey the WRITING CRITERIA and the FORMAT exactly. You will be told which angle to take; commit to it fully and make this draft distinct in opening and structure from the other angles.

Output ONLY the response text — no preamble, no notes, no surrounding quotation marks.`;

async function draftOne(
  client: Anthropic,
  input: WriterInput,
  ground: string,
  angle: WriterAngleKey,
  index: number,
): Promise<WriterDraft | null> {
  const instructions = DRAFT_INSTRUCTIONS.replace(
    "${type}",
    outputTypeLabel(input.outputType),
  );
  const userMessage = [
    `Write the ${outputTypeLabel(input.outputType)} now, from this angle — ${writerAngleLabel(angle)}:`,
    ANGLE_DIRECTION[angle],
    index >= WRITER_ANGLE_OPTIONS.length
      ? "Take a markedly different take than a typical version of this angle."
      : "",
    "",
    "Output ONLY the response text.",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await runMessage({
    client,
    ground,
    instructions,
    userMessage,
    maxTokens: 8000,
  });
  const body = stripFences(text);
  return body ? { angle, body } : null;
}

export async function runDraftStage(input: WriterInput): Promise<WriterDraft[]> {
  const client = getClient();
  const ground = buildGroundContext(input);
  const angles = pickAngles(input.draftCount);
  const drafts = await Promise.all(
    angles.map((angle, i) => draftOne(client, input, ground, angle, i)),
  );
  const out = drafts.filter((d): d is WriterDraft => d !== null);
  if (out.length === 0) throw new Error("The model did not return any drafts.");
  return out;
}

// ---------------------------------------------------------------------------
// Stage 2 — Judge (parallel, adversarial, structured)
// ---------------------------------------------------------------------------

const JUDGE_INSTRUCTIONS = `You are a demanding application-essay judge. Score the draft you are given against the WRITING CRITERIA above, adversarially: assume it can be better and look hard for hedging, AI tells, generic or invented company claims, ungrounded or inflated claims about the applicant, and a missing or fake motivation beat.

Be a tough grader. A 10 is rare. Honesty is the most important dimension: any claim about the applicant that is not grounded in the APPLICANT FACTS, or any inflation, should sink the honesty score and appear in issues. Return your scorecard via the required JSON format only.`;

async function judgeOne(
  client: Anthropic,
  ground: string,
  draft: WriterDraft,
): Promise<WriterJudgedDraft> {
  const userMessage = [
    `Score this draft (written from the "${writerAngleLabel(draft.angle)}" angle):`,
    "",
    '"""',
    draft.body,
    '"""',
  ].join("\n");

  const text = await runMessage({
    client,
    ground,
    instructions: JUDGE_INSTRUCTIONS,
    userMessage,
    maxTokens: 4000,
    format: JUDGE_SCHEMA,
  });

  const parsed = safeJsonParse(text) as Record<string, unknown> | null;
  const j = parsed ?? {};
  const boldness = clamp(j.boldness);
  const humanVoice = clamp(j.humanVoice);
  const companySpecificity = clamp(j.companySpecificity);
  const honesty = clamp(j.honesty);
  const craft = clamp(j.craft);
  const keepLines = Array.isArray(j.keepLines)
    ? (j.keepLines.filter((x) => typeof x === "string") as string[]).slice(0, 3)
    : [];
  const issues = Array.isArray(j.issues)
    ? (j.issues.filter((x) => typeof x === "string") as string[])
    : [];

  const judgment: WriterJudgment = {
    boldness,
    humanVoice,
    companySpecificity,
    honesty,
    craft,
    total: boldness + humanVoice + companySpecificity + honesty + craft,
    motivationBeatPresent: j.motivationBeatPresent === true,
    // Trust the deterministic scan over the model's self-report for em-dashes.
    hasEmDash:
      EM_DASH.test(draft.body) || EN_DASH.test(draft.body) || j.hasEmDash === true,
    wordCount: wordCount(draft.body),
    keepLines,
    issues,
  };
  return { ...draft, judgment };
}

export async function runJudgeStage(
  input: WriterInput,
  drafts: WriterDraft[],
): Promise<WriterJudgedDraft[]> {
  const client = getClient();
  const ground = buildGroundContext(input);
  const judged = await Promise.all(drafts.map((d) => judgeOne(client, ground, d)));
  return judged.sort((a, b) => b.judgment.total - a.judgment.total);
}

// ---------------------------------------------------------------------------
// Stage 3 — Synthesize (one best version)
// ---------------------------------------------------------------------------

const SYNTH_INSTRUCTIONS = `You are the lead writer. You are given several drafts of the same response, each from a different angle, each with a judge's scorecard, keep-lines, and issues. Produce the SINGLE best version.

Graft the strongest lines and ideas from across the drafts. Fix every issue the judges raised. Make it bolder and more human than any single draft, while staying inside the WRITING CRITERIA, the FORMAT, and the honesty contract. Do not average the drafts into something safe; take the most compelling true material and sharpen it.

Output ONLY the final response text — no preamble, no notes, no surrounding quotation marks.`;

export async function runSynthesisStage(
  input: WriterInput,
  judged: WriterJudgedDraft[],
): Promise<string> {
  const client = getClient();
  const ground = buildGroundContext(input);

  const blocks = judged.map((jd, i) => {
    const j = jd.judgment;
    return [
      `DRAFT ${i + 1} — angle: ${writerAngleLabel(jd.angle)} — judge total ${j.total}/50 ` +
        `(bold ${j.boldness}, human ${j.humanVoice}, company ${j.companySpecificity}, honest ${j.honesty}, craft ${j.craft})`,
      j.keepLines.length ? `Keep-lines: ${j.keepLines.join(" | ")}` : "",
      j.issues.length ? `Issues to fix: ${j.issues.join("; ")}` : "",
      '"""',
      jd.body,
      '"""',
      "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const userMessage = [
    "Here are the drafts with their judge feedback. Synthesize the single best version.",
    "",
    ...blocks,
    "Output ONLY the final response text.",
  ].join("\n");

  const text = await runMessage({
    client,
    ground,
    instructions: SYNTH_INSTRUCTIONS,
    userMessage,
    maxTokens: 8000,
  });
  const body = stripFences(text);
  if (!body) throw new Error("The synthesis stage returned nothing.");
  return body;
}

// ---------------------------------------------------------------------------
// Stage 4 — Polish (+ deterministic verify / self-repair)
// ---------------------------------------------------------------------------

const POLISH_INSTRUCTIONS = `You are the final editor. Polish the response so it is ready to paste into an application.

Do all of this: remove EVERY em-dash and en-dash character; remove every banned AI tell listed in the criteria; enforce the exact FORMAT and the length target (respect any hard word limit strictly); confirm there is a genuine motivation beat; and verify honesty — every claim about the applicant must trace to the APPLICANT FACTS, and every company reference must come only from the job description / firm notes. Keep it bold and human; do not sand it into something safe.

Return the final text plus the two notes via the required JSON format only.`;

interface PolishOut {
  body: string;
  companySpecifics: string;
  honestyNote: string;
}

async function polishCall(
  client: Anthropic,
  ground: string,
  userMessage: string,
): Promise<PolishOut> {
  const text = await runMessage({
    client,
    ground,
    instructions: POLISH_INSTRUCTIONS,
    userMessage,
    maxTokens: 8000,
    format: POLISH_SCHEMA,
  });
  const parsed = safeJsonParse(text) as Record<string, unknown> | null;
  const body =
    parsed && typeof parsed.body === "string" ? parsed.body.trim() : "";
  return {
    body: body || stripFences(text),
    companySpecifics:
      parsed && typeof parsed.companySpecifics === "string"
        ? parsed.companySpecifics.trim()
        : "",
    honestyNote:
      parsed && typeof parsed.honestyNote === "string"
        ? parsed.honestyNote.trim()
        : "",
  };
}

export async function runPolishStage(
  input: WriterInput,
  synthesizedBody: string,
): Promise<WriterResult> {
  const client = getClient();
  const ground = buildGroundContext(input);

  let out = await polishCall(
    client,
    ground,
    [
      "Polish this synthesized response and finalize it:",
      "",
      '"""',
      synthesizedBody,
      '"""',
    ].join("\n"),
  );

  // Deterministic verification gate: if mechanical AI tells / em-dashes / an
  // over-limit length survived, do ONE corrective re-polish feeding the exact
  // problems. (Cheap insurance on top of the model's own polish.)
  const issues = scanIssues(out.body, input);
  if (issues.length > 0) {
    const repolished = await polishCall(
      client,
      ground,
      [
        "Your previous polish left these specific problems. Fix EVERY one without weakening the writing, then return the corrected text:",
        ...issues.map((i) => `- ${i}`),
        "",
        '"""',
        out.body,
        '"""',
      ].join("\n"),
    );
    if (repolished.body) {
      out = {
        body: repolished.body,
        companySpecifics: repolished.companySpecifics || out.companySpecifics,
        honestyNote: repolished.honestyNote || out.honestyNote,
      };
    }
  }

  // Final guarantee: strip any surviving em/en dash deterministically.
  const finalBody = stripDashes(out.body);
  if (!finalBody) throw new Error("The polish stage returned nothing.");

  return {
    outputType: input.outputType,
    body: finalBody,
    wordCount: wordCount(finalBody),
    companySpecifics: out.companySpecifics || "",
    honestyNote: out.honestyNote || null,
  };
}

// ---------------------------------------------------------------------------
// One-shot (used for end-to-end testing / a non-staged caller)
// ---------------------------------------------------------------------------

export interface WriterRun {
  result: WriterResult;
  drafts: WriterJudgedDraft[];
}

/**
 * Run the entire pipeline in one call. The UI uses the per-stage functions for
 * live staged progress; this is the convenience/testing path. Validates the
 * honesty-critical invariant (short_answer needs a question) up front.
 */
export async function writeApplicationOneShot(
  input: WriterInput,
): Promise<WriterRun> {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (!input.jobDescription?.trim()) {
    throw new Error("Paste a job description to write from.");
  }
  if (input.outputType === "short_answer" && !input.question?.trim()) {
    throw new Error("A short-answer response needs the exact application question.");
  }
  const drafts = await runDraftStage(input);
  const judged = await runJudgeStage(input, drafts);
  const synthesized = await runSynthesisStage(input, judged);
  const result = await runPolishStage(input, synthesized);
  return { result, drafts: judged };
}
