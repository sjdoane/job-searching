import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";
import { getResumeData } from "@/lib/resume/data";
import type { Track } from "@/lib/resume/types";

export type OutreachKind =
  | "cold_intro"
  | "referral_request"
  | "coffee_chat"
  | "follow_up"
  | "thank_you";

export interface OutreachInput {
  contactName: string;
  contactTitle?: string | null;
  contactRelationship?: string | null;
  firmName: string;
  firmTrack?: string | null;
  firmNotes?: string | null;
  kind: OutreachKind;
  extra?: string | null;
}

export interface OutreachDraft {
  subject: string;
  message: string;
}

const KIND_GUIDANCE: Record<OutreachKind, string> = {
  cold_intro:
    "A brief cold introduction (e.g. to an alum or employee). Introduce the student, give one specific reason for reaching out, and make a soft, low-pressure ask (to hear about their path/team or any advice).",
  referral_request:
    "A respectful referral request. Acknowledge it's a real ask, give the specific role/team being applied to, briefly say why the student is a credible fit, and make it easy to say no. Never sound entitled.",
  coffee_chat:
    "A request for a short (15-minute) call or coffee chat to learn about their experience and team. Low pressure, flexible on timing.",
  follow_up:
    "A gentle follow-up to a previous message that went unanswered. Reference the earlier note briefly, add no guilt, and restate the small ask.",
  thank_you:
    "A short, specific thank-you note after a conversation or a referral. Warm and concise.",
};

const SYSTEM_PROMPT = `You write short, genuine, personalized networking outreach for a student seeking a full-time new-grad role. The messages must read like a real, thoughtful person — never generic, salesy, or templated.

RULES:
- Use ONLY the facts provided about the student. NEVER invent a shared connection, mutual friend, prior meeting, school club, or any flattery not supported by the facts.
- Reference the firm specifically and accurately using the provided firm notes, but do not overclaim deep knowledge.
- Be concise: ~80-140 words for the body. Address the recipient by first name; sign with the student's first name.
- Warm, respectful, low-pressure. For asks, make it genuinely easy to decline.
- Plain text. No emojis. No markdown.

OUTPUT: Return ONLY JSON: {"subject": "<short email subject>", "message": "<the message body>"}.`;

function profileBlurb(track?: string | null): string {
  const d = getResumeData();
  const p = d.profile;
  const t: Track | undefined =
    track === "quant" || track === "mbb" || track === "pm"
      ? (track as Track)
      : undefined;
  const projects = d.projects
    .filter((pr) => (t ? pr.tracks.includes(t) : pr.onBaseResume))
    .slice(0, 3)
    .map((pr) => `${pr.name} (${pr.oneLiner})`);
  return [
    `Name: ${p.name}`,
    `Education: ${p.education.degree}, ${p.education.school}, GPA ${p.education.gpa}`,
    `Experience: ${d.experiences
      .slice(0, 2)
      .map((e) => `${e.role} at ${e.org}`)
      .join("; ")}`,
    `Relevant projects: ${projects.join("; ")}`,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const s = t.indexOf("{");
    const e = t.lastIndexOf("}");
    if (s !== -1 && e > s) return JSON.parse(t.slice(s, e + 1));
    throw new Error("Could not parse the model response.");
  }
}

export async function draftOutreach(
  input: OutreachInput,
): Promise<OutreachDraft> {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");

  const userMessage = [
    `Message type: ${KIND_GUIDANCE[input.kind]}`,
    "",
    "About the student (use only these facts):",
    profileBlurb(input.firmTrack),
    "",
    "Recipient:",
    `- Name: ${input.contactName}`,
    input.contactTitle ? `- Title: ${input.contactTitle}` : "",
    input.contactRelationship
      ? `- Relationship to student: ${input.contactRelationship}`
      : "",
    "",
    `Firm: ${input.firmName}${input.firmTrack ? ` (${input.firmTrack} track)` : ""}`,
    input.firmNotes ? `Firm notes (for accurate references): ${input.firmNotes}` : "",
    input.extra ? `Extra context from the student: ${input.extra}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const client = new Anthropic({ apiKey: anthropic.apiKey });
  const response = await client.messages.create({
    model: anthropic.model,
    max_tokens: 900,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text) as { subject?: unknown; message?: unknown };
  const subject = typeof parsed.subject === "string" ? parsed.subject.trim() : "";
  const message = typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) throw new Error("The model did not return a message.");
  return { subject: subject || `Reaching out — ${input.firmName}`, message };
}
