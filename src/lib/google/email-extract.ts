import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";

export interface EmailInput {
  id: string;
  from: string;
  subject: string;
  snippet: string;
}

export type RecruitingType =
  | "application"
  | "assessment"
  | "interview"
  | "event"
  | "offer"
  | "other";

export interface EmailExtraction {
  id: string;
  isRecruiting: boolean;
  company: string | null;
  role: string | null;
  /** Concrete date as YYYY-MM-DD if one is explicitly stated/resolvable, else null. */
  deadline: string | null;
  type: RecruitingType | null;
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You extract structured recruiting information from emails. You are STRICTLY FACTUAL.

RULES:
- Only extract what is explicitly stated in the email. Never guess, infer a company from an unrelated domain, or invent a date/role.
- company: the actual HIRING company (not the applicant-tracking system, job board, or email relay like Greenhouse/Lever/Workday/Gmail). If you cannot tell, use null.
- role: the specific job title if mentioned, else null.
- deadline: a concrete application or assessment deadline as YYYY-MM-DD. Resolve explicit relative dates ("by this Friday", "within 7 days", "by EOD tomorrow") using the provided today's date. If no real deadline is stated, use null. Do NOT use the email's send date as a deadline.
- type: one of application | assessment | interview | event | offer | other (best fit), or null if not recruiting.
- isRecruiting: true only if the email is genuinely about a job application, recruiting event, assessment, interview, or offer.
- confidence: high | medium | low — your confidence in company+role.

OUTPUT: Return ONLY a JSON array (no prose) of objects with keys:
{"id","isRecruiting","company","role","deadline","type","confidence"}. Include every id exactly once. Use null (not "") for unknown string fields.`;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildUserMessage(emails: EmailInput[]): string {
  const list = emails
    .map(
      (e) =>
        `- id: ${e.id}\n  from: ${e.from}\n  subject: ${e.subject}\n  snippet: ${e.snippet}`,
    )
    .join("\n");
  return [`Today's date: ${todayISO()}`, "", "Emails:", list].join("\n");
}

function extractJsonArray(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("[");
    const end = t.lastIndexOf("]");
    if (start !== -1 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("Could not parse a JSON array from the model response.");
  }
}

const TYPES = new Set([
  "application",
  "assessment",
  "interview",
  "event",
  "offer",
  "other",
]);

function isoOrNull(v: unknown): string | null {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeConfidence(v: unknown): "high" | "medium" | "low" {
  if (v === "high" || v === "medium" || v === "low") return v;
  if (typeof v === "number") return v >= 0.8 ? "high" : v >= 0.5 ? "medium" : "low";
  return "low";
}

/** Extract structured recruiting info from a batch of emails (strict, no fabrication). */
export async function extractRecruitingInfo(
  emails: EmailInput[],
): Promise<EmailExtraction[]> {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (emails.length === 0) return [];

  const client = new Anthropic({ apiKey: anthropic.apiKey });
  const response = await client.messages.create({
    model: anthropic.model,
    max_tokens: 2500,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildUserMessage(emails) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed)) throw new Error("Model did not return a JSON array.");

  const validIds = new Set(emails.map((e) => e.id));
  const out: EmailExtraction[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !validIds.has(r.id)) continue;
    const type = typeof r.type === "string" && TYPES.has(r.type)
      ? (r.type as RecruitingType)
      : null;
    const confidence = normalizeConfidence(r.confidence);
    out.push({
      id: r.id,
      isRecruiting: r.isRecruiting === true,
      company: strOrNull(r.company),
      role: strOrNull(r.role),
      deadline: isoOrNull(r.deadline),
      type,
      confidence,
    });
  }
  return out;
}
