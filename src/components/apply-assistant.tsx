"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { draftApplicationAction } from "@/app/apply/actions";
import { Card, EmptyState } from "@/components/ui";
import {
  APPLICATION_KIND_OPTIONS,
  TRACK_OPTIONS,
  labelFor,
  type ApplicationKind,
} from "@/lib/labels";

export interface ApplyFirm {
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

export function ApplyAssistant({
  firms,
  aiEnabled,
}: {
  firms: ApplyFirm[];
  aiEnabled: boolean;
}) {
  const [firmId, setFirmId] = useState<number | "">(firms[0]?.id ?? "");
  const [kind, setKind] = useState<ApplicationKind>("why_firm");
  const [question, setQuestion] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [extra, setExtra] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ body: string; note?: string | null } | null>(
    null,
  );
  const [edited, setEdited] = useState("");
  const [copied, setCopied] = useState(false);

  const firm = useMemo(
    () => firms.find((f) => f.id === firmId) ?? null,
    [firms, firmId],
  );
  const isShort = kind === "short_answer";
  const words = edited.trim() ? edited.trim().split(/\s+/).length : 0;
  const limit = wordLimit ? Number(wordLimit) : 0;
  const overLimit = limit > 0 && words > limit;

  async function generate() {
    setError(null);
    if (!firm) {
      setError("Pick a firm from your tracker first.");
      return;
    }
    if (isShort && !question.trim()) {
      setError("Paste the exact application question for a short-answer response.");
      return;
    }
    setPending(true);
    try {
      const d = await draftApplicationAction({
        targetId: firm.id,
        kind,
        question: question.trim() || undefined,
        extra: extra.trim() || undefined,
        wordLimit: wordLimit ? Number(wordLimit) : undefined,
      });
      setDraft(d);
      setEdited(d.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to draft.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(edited);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (firms.length === 0) {
    return (
      <EmptyState
        title="No firms in your tracker yet"
        hint="Add a target on the Tracker or Search pages, then come back to draft application answers for it."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Controls */}
      <Card>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <Label>Firm (from your tracker)</Label>
              <select
                value={firmId}
                onChange={(e) =>
                  setFirmId(e.target.value ? Number(e.target.value) : "")
                }
                className={inputCls}
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.company}
                    {f.role ? ` — ${f.role}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Label>Response type</Label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ApplicationKind)}
                className={inputCls}
              >
                {APPLICATION_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <Label>Word limit (optional)</Label>
              <input
                type="number"
                min={0}
                value={wordLimit}
                onChange={(e) => setWordLimit(e.target.value)}
                className={inputCls}
                placeholder="e.g. 150"
              />
            </label>
          </div>

          {firm ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {labelFor(TRACK_OPTIONS, firm.track)}
              </span>
              {firm.location ? <span>{firm.location}</span> : null}
              {!firm.hasNotes ? (
                <span className="text-amber-700">
                  No firm notes yet — the draft will stay general.{" "}
                  <Link
                    href="/tracker"
                    className="underline hover:text-amber-900"
                  >
                    Add research in the Tracker
                  </Link>{" "}
                  for a sharper answer.
                </span>
              ) : null}
            </div>
          ) : null}

          <label className="block">
            <Label>
              {isShort
                ? "Application question *"
                : "Specific angle to address (optional)"}
            </Label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={isShort ? 3 : 2}
              className={inputCls}
              placeholder={
                isShort
                  ? "Paste the exact prompt, e.g. “Describe a time you solved a hard, ambiguous problem.”"
                  : "e.g. emphasize my quant/ML projects; tie to their systematic trading team"
              }
            />
          </label>

          <label className="block">
            <Label>Extra context (optional)</Label>
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Paste the job description or anything else true that should inform the answer."
            />
          </label>

          {!aiEnabled ? (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              Add <code className="text-xs">ANTHROPIC_API_KEY</code> to
              <code className="text-xs"> .env.local</code> and restart to enable
              AI drafting.
            </p>
          ) : (
            <button
              onClick={generate}
              disabled={pending}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {pending ? "Drafting…" : draft ? "Regenerate" : "Generate draft"}
            </button>
          )}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
        </div>
      </Card>

      {/* Result */}
      <Card>
        {!draft ? (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center">
            <p className="font-medium text-slate-700">Your draft appears here</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Grounded only in your verified profile and this firm&apos;s tracker
              notes. Always read it over, check every claim, and make it yours
              before submitting.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Draft ·{" "}
                <span className={overLimit ? "font-semibold text-rose-600" : undefined}>
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
              rows={16}
              className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {draft.note ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {draft.note}
              </p>
            ) : null}
            <p className="text-[11px] text-slate-400">
              AI-generated from your real profile + firm notes — it can still get
              emphasis or tone wrong. Verify before you send.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
