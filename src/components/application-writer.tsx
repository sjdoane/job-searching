"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  draftStageAction,
  judgeStageAction,
  polishStageAction,
  synthesizeStageAction,
  type WriteRequest,
} from "@/app/write/actions";
import { Card } from "@/components/ui";
import {
  TRACK_OPTIONS,
  WRITER_OUTPUT_TYPE_OPTIONS,
  labelFor,
  writerAngleLabel,
  type WriterJudgedDraft,
  type WriterOutputType,
  type WriterResult,
} from "@/lib/labels";

export interface WriterFirm {
  id: number;
  company: string;
  role: string | null;
  track: string;
  location: string | null;
  hasNotes: boolean;
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

type Stage = "idle" | "drafting" | "judging" | "synthesizing" | "polishing" | "done";

const STEPS: { key: Stage; label: string; hint: string }[] = [
  { key: "drafting", label: "Drafting", hint: "diverse takes, in parallel" },
  { key: "judging", label: "Judging", hint: "scoring each one adversarially" },
  { key: "synthesizing", label: "Synthesizing", hint: "grafting the best material" },
  { key: "polishing", label: "Polishing", hint: "stripping AI tells, checking honesty" },
];

const ORDER: Stage[] = ["drafting", "judging", "synthesizing", "polishing", "done"];

function StagedProgress({ stage }: { stage: Stage }) {
  const current = ORDER.indexOf(stage);
  return (
    <div className="space-y-3">
      {STEPS.map((step) => {
        const idx = ORDER.indexOf(step.key);
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                done
                  ? "bg-emerald-100 text-emerald-700"
                  : active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓" : idx + 1}
            </span>
            <div>
              <span
                className={`text-sm font-medium ${
                  active
                    ? "text-violet-700"
                    : done
                      ? "text-slate-700"
                      : "text-slate-400"
                }`}
              >
                {step.label}
                {active ? "…" : ""}
              </span>
              <span className="ml-2 text-xs text-slate-400">{step.hint}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] text-slate-500">{label}</span>
      <span className="h-1.5 flex-1 rounded-full bg-slate-100">
        <span
          className="block h-1.5 rounded-full bg-violet-400"
          style={{ width: `${value * 10}%` }}
        />
      </span>
      <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-slate-500">
        {value}
      </span>
    </div>
  );
}

function DraftCard({ draft }: { draft: WriterJudgedDraft }) {
  const [open, setOpen] = useState(false);
  const j = draft.judgment;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-slate-700">
          {writerAngleLabel(draft.angle)}
        </span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
            {j.total}/50
          </span>
          <span>{open ? "Hide" : "Show"}</span>
        </span>
      </button>
      {open ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-1.5">
            <ScoreBar label="Bold" value={j.boldness} />
            <ScoreBar label="Human" value={j.humanVoice} />
            <ScoreBar label="Company" value={j.companySpecificity} />
            <ScoreBar label="Honest" value={j.honesty} />
            <ScoreBar label="Craft" value={j.craft} />
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span
              className={`rounded-full px-2 py-0.5 ${
                j.motivationBeatPresent
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {j.motivationBeatPresent ? "motivation beat ✓" : "no motivation beat"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
              {j.wordCount} words
            </span>
            {j.hasEmDash ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                had em-dash
              </span>
            ) : null}
          </div>
          {j.issues.length ? (
            <div className="text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">Judge issues: </span>
              {j.issues.join("; ")}
            </div>
          ) : null}
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-slate-700">
            {draft.body}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function ApplicationWriter({
  firms,
  aiEnabled,
}: {
  firms: WriterFirm[];
  aiEnabled: boolean;
}) {
  const [outputType, setOutputType] = useState<WriterOutputType>("cover_letter");
  const [firmId, setFirmId] = useState<number | "">("");
  const [draftCount, setDraftCount] = useState(4);
  const [jobDescription, setJobDescription] = useState("");
  const [question, setQuestion] = useState("");
  const [instructions, setInstructions] = useState("");
  const [wordLimit, setWordLimit] = useState("");

  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<WriterJudgedDraft[] | null>(null);
  const [result, setResult] = useState<WriterResult | null>(null);
  const [edited, setEdited] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  const firm = useMemo(
    () => firms.find((f) => f.id === firmId) ?? null,
    [firms, firmId],
  );
  const isShort = outputType === "short_answer";
  const pending = stage !== "idle" && stage !== "done";
  const words = edited.trim() ? edited.trim().split(/\s+/).length : 0;
  const limit = wordLimit ? Number(wordLimit) : 0;
  const overLimit = limit > 0 && words > limit;

  async function generate() {
    setError(null);
    if (!jobDescription.trim()) {
      setError("Paste the job description to write from.");
      return;
    }
    if (isShort && !question.trim()) {
      setError("Paste the exact application question for a short-answer response.");
      return;
    }
    const req: WriteRequest = {
      outputType,
      jobDescription: jobDescription.trim(),
      question: question.trim() || undefined,
      instructions: instructions.trim() || undefined,
      wordLimit: wordLimit ? Number(wordLimit) : undefined,
      targetId: firmId ? Number(firmId) : undefined,
      draftCount,
    };

    setResult(null);
    setDrafts(null);
    try {
      setStage("drafting");
      const d = await draftStageAction(req);
      setStage("judging");
      const judged = await judgeStageAction(req, d);
      setDrafts(judged);
      setStage("synthesizing");
      const synth = await synthesizeStageAction(req, judged);
      setStage("polishing");
      const r = await polishStageAction(req, synth);
      setResult(r);
      setEdited(r.body);
      setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to write.");
      setStage("idle");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Label>What do you need?</Label>
              <select
                value={outputType}
                onChange={(e) =>
                  setOutputType(e.target.value as WriterOutputType)
                }
                className={inputCls}
              >
                {WRITER_OUTPUT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <Label>Firm (optional, from tracker)</Label>
              <select
                value={firmId}
                onChange={(e) =>
                  setFirmId(e.target.value ? Number(e.target.value) : "")
                }
                className={inputCls}
              >
                <option value="">— Use the job description only —</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.company}
                    {f.role ? ` — ${f.role}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <Label>Drafts</Label>
                <select
                  value={draftCount}
                  onChange={(e) => setDraftCount(Number(e.target.value))}
                  className={inputCls}
                >
                  {[3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Label>Word limit</Label>
                <input
                  type="number"
                  min={0}
                  value={wordLimit}
                  onChange={(e) => setWordLimit(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 300"
                />
              </label>
            </div>
          </div>

          {firm ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {labelFor(TRACK_OPTIONS, firm.track)}
              </span>
              {firm.location ? <span>{firm.location}</span> : null}
              {!firm.hasNotes ? (
                <span className="text-amber-700">
                  No firm notes yet — company facts will come only from the JD.{" "}
                  <Link href="/tracker" className="underline hover:text-amber-900">
                    Add research
                  </Link>{" "}
                  for sharper references.
                </span>
              ) : null}
            </div>
          ) : null}

          <label className="block">
            <Label>Job description *</Label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              className={inputCls}
              placeholder="Paste the full job description here. This is the primary input and the source of company facts."
            />
          </label>

          {isShort ? (
            <label className="block">
              <Label>Application question *</Label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Paste the exact prompt, e.g. “Tell us about a time you built something people actually used.”"
              />
            </label>
          ) : null}

          <label className="block">
            <Label>Custom instructions (optional)</Label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Tone, emphasis, length, anything. e.g. “lead with the Kalshi trading system; keep it punchy; mention I can start in June.”"
            />
          </label>

          {!aiEnabled ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Add <code className="text-xs">ANTHROPIC_API_KEY</code> to
              <code className="text-xs"> .env.local</code> and restart to enable
              the writer.
            </p>
          ) : (
            <button
              onClick={generate}
              disabled={pending}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {pending
                ? "Writing…"
                : result
                  ? "Regenerate"
                  : "Write it"}
            </button>
          )}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <p className="text-[11px] text-slate-400">
            Deep multi-pass: {draftCount} drafts → judged → synthesized → polished
            on Claude Opus 4.8. One run makes several model calls and takes about a
            minute or two.
          </p>
        </div>
      </Card>

      {/* Result */}
      <Card>
        {pending ? (
          <div className="flex h-full min-h-[16rem] flex-col justify-center">
            <p className="mb-4 text-sm font-medium text-slate-700">
              Writing your {isShort ? "answer" : "draft"}…
            </p>
            <StagedProgress stage={stage} />
          </div>
        ) : !result ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center">
            <p className="font-medium text-slate-700">Your draft appears here</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Bold, human, and honest by construction: grounded only in your
              verified profile and the firm&apos;s facts. Always read it over and
              make it yours before sending.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Final ·{" "}
                <span
                  className={overLimit ? "font-semibold text-rose-600" : undefined}
                >
                  {words} word{words === 1 ? "" : "s"}
                  {limit > 0 ? ` / ${limit}` : ""}
                </span>{" "}
                · editable
              </span>
              <button
                onClick={copy}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              rows={18}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {result.companySpecifics ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                <span className="font-medium">Company specifics used:</span>{" "}
                {result.companySpecifics}
              </p>
            ) : null}
            {result.honestyNote ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {result.honestyNote}
              </p>
            ) : null}
            <p className="text-[11px] text-slate-400">
              AI-generated from your real profile + the firm&apos;s facts. It can
              still get emphasis or tone wrong. Verify every claim before you send.
            </p>

            {drafts && drafts.length ? (
              <div className="border-t border-slate-100 pt-3">
                <button
                  onClick={() => setShowDrafts((s) => !s)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  {showDrafts ? "Hide" : "Show"} the {drafts.length} scored drafts
                </button>
                {showDrafts ? (
                  <div className="mt-3 space-y-2">
                    {drafts.map((d, i) => (
                      <DraftCard key={`${d.angle}-${i}`} draft={d} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
