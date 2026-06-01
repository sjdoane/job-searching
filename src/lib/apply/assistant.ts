import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";
import type { ApplicationKind } from "@/lib/labels";
import { getResumeData } from "@/lib/resume/data";
import { TRACK_LABEL, type Track } from "@/lib/resume/types";

/**
 * The AI Application Assistant: drafts genuine, first-person application
 * responses ("why this firm" / "why this role" / short-answer / cover letter),
 * grounded ONLY in Sam's audited résumé bank and the firm's tracker notes.
 *
 * Honesty model (same discipline as ai-tailor.ts / outreach.ts): the model may
 * only use the facts we hand it. We ground on the reconciled `resumeData` bank
 * — specifically each bullet's immutable `groundTruth`, not the polished
 * per-track variants — because that bank is the audited single source of truth
 * for Sam's experience. Firm references may use ONLY the tracker notes/role.
 */

export interface ApplicationInput {
  kind: ApplicationKind;
  firmName: string;
  role?: string | null;
  /** Tracker track value: "pm" | "quant" | "mbb" | "other". */
  firmTrack?: string | null;
  /** The firm's tracker notes — the ONLY firm-specific facts the model may use. */
  firmNotes?: string | null;
  location?: string | null;
  /** For short_answer: the exact prompt pasted from the application. */
  question?: string | null;
  /** Optional extra context the student adds (a JD snippet, an angle, etc). */
  extra?: string | null;
  /** Optional hard word cap to respect. */
  wordLimit?: number | null;
}

export interface ApplicationDraft {
  body: string;
  /** Optional one-line, honest caveat about grounding (e.g. thin firm notes). */
  note?: string | null;
}

const KIND_GUIDANCE: Record<ApplicationKind, string> = {
  why_firm:
    'Answer the question "Why do you want to work at this firm?" Connect the student\'s genuine, relevant interests and background to what is actually known about the firm (from the notes). Be concrete and sincere, not flattering or generic.',
  why_role:
    'Answer "Why are you a strong fit for this role?" / "Why this role?" Map the student\'s real, relevant experience, projects, and skills to the role with specific evidence. Do not overstate seniority or scope.',
  short_answer:
    "Answer the exact application question provided, directly and specifically, drawing on real experience. Match the length implied by the question (and any word limit).",
  cover_letter:
    "Write a short cover letter (a greeting line is optional). Open with a genuine, specific hook (never a template line), give one or two short paragraphs of concrete evidence from real experience/projects mapped to the role and firm, and close briefly. Sign as the student.",
};

const SYSTEM_PROMPT = `You help a university student draft genuine, specific written responses for job and internship applications — "why this firm" answers, "why this role" answers, short-answer essay questions, and short cover letters. You write in the student's own voice: first person, sincere, concrete, and free of clichés and corporate filler.

TRUTHFULNESS — the most important rule, overriding everything else:
- Use ONLY the facts in the APPLICANT FACTS block about the student. NEVER invent or embellish a number, metric, title, employer, project, skill, award, GPA, date, or experience that is not stated there. Never inflate scope or seniority ("contributed to" is not "led"; a simulation is not a deployed product).
- Reference the firm using ONLY the provided firm details and the student's research notes. NEVER fabricate firm-specific facts — products, teams, culture, values, mission statements, recent news, or achievements — that are not in those notes. If the firm details are thin, keep firm references honest and general and let the student's genuine motivations and relevant background carry the answer.
- Do not claim feelings or knowledge the facts do not support (no "I have long admired…" unless it is grounded). Sincere and modest beats effusive and fabricated.
- If the question cannot be answered honestly from the facts, write the strongest honest partial answer you can and say plainly (briefly, within the body) what the student would need to add.

STYLE:
- First person, plain prose. No markdown, no headings, no bullet points (unless the question explicitly asks for a list).
- Specific over generic: name a real project or experience and what was actually done.
- Match the requested length. Default to ~120–180 words for "why firm" / "why role" / short answers, and ~250–350 words for a cover letter. Respect any stated word limit strictly.
- No emojis. Do not open with "I am writing to express my interest" or similar tired template lines.

OUTPUT: Return ONLY a JSON object: {"body": "<the response text>", "note": "<optional: one short, honest caveat about grounding — e.g. what firm context was missing — or an empty string if none>"}.`;

function toResumeTrack(track?: string | null): Track | undefined {
  return track === "quant" || track === "mbb" || track === "pm"
    ? track
    : undefined;
}

/**
 * Builds the fact-only grounding block from the audited résumé bank. Uses each
 * bullet's `groundTruth` (immutable facts), orders the active track's material
 * first, and includes detail for track-relevant projects (oneLiner-only for the
 * rest) to keep the prompt focused and bounded. Cached as a system block so
 * regenerations re-read it for free.
 */
function buildApplicantContext(track?: Track): string {
  const d = getResumeData();
  const p = d.profile;
  const edu = p.education;
  const coursework =
    (track && edu.courseworkByTrack?.[track]) || edu.coursework;

  // Track-relevant skills first; names only (all are true facts).
  const skills = [...p.skills]
    .sort((a, b) => {
      const ar = track && a.tracks.includes(track) ? 0 : 1;
      const br = track && b.tracks.includes(track) ? 0 : 1;
      return ar - br;
    })
    .map((s) => s.name);

  const lines: string[] = [
    "APPLICANT FACTS — the complete, verified record of the student. Use ONLY these facts; never state anything about the student beyond them.",
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

  // Projects: track-relevant first (by that track's priority), then the rest.
  // Detail (groundTruth bullets) only for relevant ones; others get a oneLiner.
  const isRel = (pr: (typeof d.projects)[number]) =>
    track ? pr.tracks.includes(track) : pr.onBaseResume;
  const projects = [...d.projects].sort((a, b) => {
    const ar = track && a.tracks.includes(track) ? (a.priority[track] ?? 99) : 1000;
    const br = track && b.tracks.includes(track) ? (b.priority[track] ?? 99) : 1000;
    return ar - br;
  });
  lines.push("", "PROJECTS:");
  for (const pr of projects) {
    const rel = isRel(pr);
    const role = pr.role ? `${pr.role}; ` : "";
    lines.push(
      `- ${pr.name} (${role}${pr.dateLabel})${rel ? " [most relevant here]" : ""}: ${pr.oneLiner}`,
    );
    if (rel) for (const b of pr.bullets.slice(0, 2)) lines.push(`  • ${b.groundTruth}`);
  }

  return lines.join("\n");
}

function buildUserMessage(input: ApplicationInput, track?: Track): string {
  const parts: string[] = [
    `Task: ${KIND_GUIDANCE[input.kind]}`,
    `Track emphasis: ${track ? TRACK_LABEL[track] : "general (no specific track)"}`,
    "",
    "FIRM (reference the firm using ONLY these details and notes):",
    `- Firm: ${input.firmName}`,
    `- Role: ${input.role?.trim() || "(role not specified)"}`,
  ];
  if (input.location) parts.push(`- Location: ${input.location}`);
  parts.push(
    "- The student's own research notes on this firm (the only firm facts you may use):",
    input.firmNotes?.trim()
      ? input.firmNotes.trim()
      : "(none recorded — keep all firm references honest and general; do not invent firm specifics)",
  );

  if (input.kind === "short_answer") {
    parts.push(
      "",
      "APPLICATION QUESTION (answer this exactly and directly):",
      `"${input.question?.trim() ?? ""}"`,
    );
  } else if (input.question?.trim()) {
    parts.push("", `Specific angle to address: ${input.question.trim()}`);
  }

  if (input.extra?.trim()) {
    parts.push(
      "",
      `Additional context from the student (e.g. the job description): ${input.extra.trim()}`,
    );
  }
  if (input.wordLimit && input.wordLimit > 0) {
    parts.push("", `Hard word limit: about ${input.wordLimit} words. Do not exceed it.`);
  }
  return parts.join("\n");
}

/** Best-effort JSON extraction; returns null instead of throwing (we fall back). */
function extractJson(text: string): unknown | null {
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

/**
 * Draft one application response. Grounds the model on the audited profile bank
 * (cached) + the firm's tracker notes, and returns the body for the user to
 * review/edit before using. Never persisted — generate-and-copy.
 */
export async function draftApplicationAnswer(
  input: ApplicationInput,
): Promise<ApplicationDraft> {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");
  // The honesty contract lives here, not just in the action: a short-answer with
  // no question would otherwise let the model invent the question it answers.
  if (input.kind === "short_answer" && !input.question?.trim()) {
    throw new Error(
      "A short-answer response needs the exact application question.",
    );
  }

  const track = toResumeTrack(input.firmTrack);
  const context = buildApplicantContext(track);
  const userMessage = buildUserMessage(input, track);

  const client = new Anthropic({ apiKey: anthropic.apiKey });
  const response = await client.messages.create({
    model: anthropic.model,
    max_tokens: 1500,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: context, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text);
  const obj =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { body?: unknown; note?: unknown })
      : null;
  let body = obj && typeof obj.body === "string" ? obj.body.trim() : "";
  const note =
    obj && typeof obj.note === "string" && obj.note.trim()
      ? obj.note.trim()
      : null;

  // Fallback: the model returned prose instead of JSON — use it directly.
  if (!body) body = stripFences(text);
  if (!body) throw new Error("The model did not return a draft.");

  return { body, note };
}
