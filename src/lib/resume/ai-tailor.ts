import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";
import { TRACK_LABEL, type Track } from "./types";

export interface TailorItem {
  id: string;
  /** Where the bullet appears, for the model's context (e.g. "ADAProsthetics"). */
  label: string;
  /** Immutable facts the suggestion must stay within. */
  groundTruth: string;
  /** The current bullet text. */
  current: string;
}

export interface TailorSuggestion {
  id: string;
  suggestion: string;
}

const SYSTEM_PROMPT = `You are a precise résumé-bullet editor. You rewrite résumé bullets to better match a target job description.

ABSOLUTE RULES — truthfulness first:
- You may ONLY use facts contained in the bullet's "groundTruth". You may rephrase, reorder, re-emphasize, tighten, and pick stronger action verbs.
- You must NEVER invent or add a number, metric, percentage, technology, tool, scope, team size, title, employer, or achievement that is not already present in the groundTruth. If it is not in groundTruth, it does not exist.
- Do not inflate. "Contributed to X" must not become "Led X". A simulation result must not become a hardware result.
- If the job description offers no honest angle for a bullet, return it essentially unchanged.

STYLE:
- One concise résumé line per bullet (aim <= 240 characters), action-verb first, no first-person pronouns, no trailing period.
- Plain text only (no markdown, no LaTeX).

OUTPUT:
- Return ONLY a JSON array, no prose, of objects: [{"id": "<id>", "suggestion": "<rewritten bullet>"}].
- Include every id you were given exactly once.`;

function buildUserMessage(
  track: Track,
  jd: string,
  items: TailorItem[],
): string {
  const list = items
    .map(
      (it) =>
        `- id: ${it.id}\n  where: ${it.label}\n  groundTruth: ${it.groundTruth}\n  current: ${it.current}`,
    )
    .join("\n");
  return [
    `Target track: ${TRACK_LABEL[track]}`,
    "",
    "Target job description:",
    jd.trim() || "(none provided — optimize generally for the track)",
    "",
    "Bullets to tailor (stay strictly within each groundTruth):",
    list,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Could not parse a JSON array from the model response.");
  }
}

/**
 * Ask Claude to rewrite the given bullets toward the JD, strictly within each
 * bullet's groundTruth. Returns suggestions keyed by bullet id. The caller is
 * expected to show a diff and let the user accept/reject each.
 */
export async function tailorBullets(
  track: Track,
  jd: string,
  items: TailorItem[],
): Promise<TailorSuggestion[]> {
  if (!hasAnthropic()) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  if (items.length === 0) return [];

  const client = new Anthropic({ apiKey: anthropic.apiKey });
  const response = await client.messages.create({
    model: anthropic.model,
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(track, jd, items) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Model did not return a JSON array.");
  }

  const validIds = new Set(items.map((i) => i.id));
  const out: TailorSuggestion[] = [];
  for (const entry of parsed) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string" &&
      typeof (entry as { suggestion?: unknown }).suggestion === "string"
    ) {
      const { id, suggestion } = entry as { id: string; suggestion: string };
      const clean = suggestion.replace(/\s+/g, " ").trim();
      if (validIds.has(id) && clean) out.push({ id, suggestion: clean });
    }
  }
  return out;
}
