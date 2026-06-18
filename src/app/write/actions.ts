"use server";

import { hasAnthropic } from "@/lib/config";
import type {
  WriterJudgedDraft,
  WriterDraft,
  WriterOutputType,
  WriterResult,
} from "@/lib/labels";
import {
  runDraftStage,
  runJudgeStage,
  runPolishStage,
  runSynthesisStage,
  type WriterInput,
} from "@/lib/apply/writer-pipeline";
import { getTarget } from "@/lib/tracker";

/**
 * The Application Writer is driven as four sequential server actions (one per
 * pipeline stage) so the client can show genuine staged progress —
 * Drafting → Judging → Synthesizing → Polishing — and surface the scored drafts
 * for transparency. Drafts/judgments travel back through the client between
 * stages; the honesty-critical grounding (profile facts) is rebuilt server-side
 * each stage and never leaves the server. Read-only: no DB mutation, so no
 * revalidation.
 */

export interface WriteRequest {
  outputType: WriterOutputType;
  jobDescription: string;
  /** Required for short_answer. */
  question?: string;
  instructions?: string;
  wordLimit?: number;
  /** Optional tracker target (firm) id — pulls its notes/role/track/location. */
  targetId?: number;
  /** Number of diverse drafts (default 4). */
  draftCount?: number;
}

/**
 * Resolve a client request into the grounded pipeline input: validate the
 * honesty-critical invariants and, if a firm was picked, pull its tracker
 * facts. Throws on anything that would let the model fabricate.
 */
function resolveInput(req: WriteRequest): WriterInput {
  if (!hasAnthropic()) throw new Error("ANTHROPIC_API_KEY is not set.");
  if (!req.jobDescription?.trim()) {
    throw new Error("Paste the job description to write from.");
  }
  if (req.outputType === "short_answer" && !req.question?.trim()) {
    throw new Error(
      "Paste the exact application question for a short-answer response.",
    );
  }

  const input: WriterInput = {
    outputType: req.outputType,
    jobDescription: req.jobDescription.trim(),
    question: req.question?.trim() || null,
    instructions: req.instructions?.trim() || null,
    wordLimit: req.wordLimit && req.wordLimit > 0 ? req.wordLimit : null,
    draftCount: req.draftCount,
  };

  if (req.targetId) {
    const firm = getTarget(req.targetId);
    if (!firm) throw new Error("That firm is no longer in your tracker.");
    input.firmName = firm.company;
    input.role = firm.role;
    input.firmTrack = firm.track;
    input.firmNotes = firm.notes;
    input.location = firm.location;
  }

  return input;
}

export async function draftStageAction(
  req: WriteRequest,
): Promise<WriterDraft[]> {
  return runDraftStage(resolveInput(req));
}

export async function judgeStageAction(
  req: WriteRequest,
  drafts: WriterDraft[],
): Promise<WriterJudgedDraft[]> {
  return runJudgeStage(resolveInput(req), drafts);
}

export async function synthesizeStageAction(
  req: WriteRequest,
  judged: WriterJudgedDraft[],
): Promise<string> {
  return runSynthesisStage(resolveInput(req), judged);
}

export async function polishStageAction(
  req: WriteRequest,
  synthesizedBody: string,
): Promise<WriterResult> {
  return runPolishStage(resolveInput(req), synthesizedBody);
}
