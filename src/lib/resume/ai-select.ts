import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { anthropic, hasAnthropic } from "@/lib/config";
import { TRACK_LABEL, type ResumeData, type Track } from "./types";

export interface ProjectCandidate {
  id: string;
  name: string;
  oneLiner: string;
  tracks: Track[];
  onBaseResume: boolean;
  /** Concatenated ground-truth facts, so the model judges real substance. */
  facts: string;
}

export interface AISelection {
  id: string;
  reason: string;
}

const MAX_SELECT = 6;

const SYSTEM_PROMPT = `You are a résumé strategist choosing which projects belong on a ONE-PAGE résumé for a specific role. Optimize for ROLE-RELEVANCE PER LINE, not raw impressiveness.

METHOD:
1. From the target track + job description, infer the role's 4-6 competency clusters (e.g. for a quant/trading role: probability/statistics, market/trading reasoning, disciplined experimentation & out-of-sample validation, coding/data rigor, risk awareness, collaboration).
2. Score each candidate project on those clusters using its "facts" (the real, verified work).
3. Select 3-6 projects that maximize coverage of the clusters with the strongest credible evidence. Fewer, sharper projects beat a long list.
4. Order best-first.

JUDGEMENT RULES:
- Prefer concrete evidence/validation over generic "impressive." A project that proves the role's core abilities beats a flashier but off-domain one.
- Reward complementary coverage; PENALIZE redundancy — if two projects prove the same thing, prefer keeping one unless the second adds a distinct cluster (e.g. one shows research/validation infrastructure, the other shows live execution + risk controls).
- Value metrics by usefulness to THIS role: validation/benchmark/error/risk metrics > scale metrics (tests, dataset size, lines of code) > context metrics. Do not select a project just because it has big numbers.
- You may pick from any track if it genuinely serves the role, but prefer track-aligned projects.
- Only use project ids from the provided candidates. Never invent an id.
- A "reason" must be <= 12 words, cite the real relevance, and not embellish.

OUTPUT: Return ONLY JSON: {"selected": [{"id": "<id>", "reason": "<short why>"}]} in priority order, no prose.`;

function buildUserMessage(
  track: Track,
  jd: string,
  candidates: ProjectCandidate[],
): string {
  const list = candidates
    .map(
      (c) =>
        `- id: ${c.id}\n  name: ${c.name}\n  tracks: ${c.tracks.join(", ")}\n  onBaseResume: ${c.onBaseResume}\n  summary: ${c.oneLiner}\n  facts: ${c.facts}`,
    )
    .join("\n");
  return [
    `Target track: ${TRACK_LABEL[track]}`,
    "",
    "Job description:",
    jd.trim() || "(none provided — optimize generally for the track)",
    "",
    "Candidate projects:",
    list,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("Could not parse JSON from the model response.");
  }
}

/** Build the candidate list the model reasons over (all projects in the bank). */
export function buildCandidates(data: ResumeData): ProjectCandidate[] {
  return data.projects.map((p) => ({
    id: p.id,
    name: p.name,
    oneLiner: p.oneLiner,
    tracks: p.tracks,
    onBaseResume: p.onBaseResume,
    facts: p.bullets.map((b) => b.groundTruth).join(" "),
  }));
}

/** Ask Claude to choose and order the best projects. Returns validated ids+reasons. */
export async function selectProjectsWithAI(
  track: Track,
  jd: string,
  candidates: ProjectCandidate[],
): Promise<AISelection[]> {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (candidates.length === 0) return [];

  const client = new Anthropic({ apiKey: anthropic.apiKey });
  const response = await client.messages.create({
    model: anthropic.model,
    max_tokens: 1000,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: buildUserMessage(track, jd, candidates) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const parsed = extractJson(text) as { selected?: unknown };
  const selected = Array.isArray(parsed.selected) ? parsed.selected : [];

  const validIds = new Set(candidates.map((c) => c.id));
  const seen = new Set<string>();
  const out: AISelection[] = [];
  for (const entry of selected) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    const reason = (entry as { reason?: unknown }).reason;
    if (typeof id !== "string" || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      reason: typeof reason === "string" ? reason.trim() : "",
    });
    if (out.length >= MAX_SELECT) break;
  }
  return out;
}
