"use server";

import {
  draftApplicationAnswer,
  type ApplicationDraft,
} from "@/lib/apply/assistant";
import type { ApplicationKind } from "@/lib/labels";
import { getTarget } from "@/lib/tracker";

export interface DraftApplicationInput {
  /** A tracker target (firm) id. */
  targetId: number;
  kind: ApplicationKind;
  /** Required for short_answer: the exact application question. */
  question?: string;
  extra?: string;
  wordLimit?: number;
}

/**
 * Look up the firm in the tracker, then draft a grounded application response.
 * Read-only: no DB mutation, so no revalidation needed. The firm's notes are
 * the only firm-specific facts passed to the model.
 */
export async function draftApplicationAction(
  input: DraftApplicationInput,
): Promise<ApplicationDraft> {
  const firm = getTarget(input.targetId);
  if (!firm) throw new Error("That firm is no longer in your tracker.");

  if (input.kind === "short_answer" && !input.question?.trim()) {
    throw new Error(
      "Paste the exact application question for a short-answer response.",
    );
  }

  return draftApplicationAnswer({
    kind: input.kind,
    firmName: firm.company,
    role: firm.role,
    firmTrack: firm.track,
    firmNotes: firm.notes,
    location: firm.location,
    question: input.question?.trim() || null,
    extra: input.extra?.trim() || null,
    wordLimit: input.wordLimit && input.wordLimit > 0 ? input.wordLimit : null,
  });
}
