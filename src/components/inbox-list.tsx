"use client";

import { useState } from "react";

import { addEmailToTrackerAction, extractEmailsAction } from "@/app/inbox/actions";
import { Card } from "@/components/ui";
import type { EmailExtraction } from "@/lib/google/email-extract";
import type { RecruitingEmail } from "@/lib/google/gmail";

const TYPE_BADGE: Record<string, string> = {
  application: "bg-indigo-100 text-indigo-800",
  assessment: "bg-amber-100 text-amber-800",
  interview: "bg-purple-100 text-purple-800",
  event: "bg-blue-100 text-blue-800",
  offer: "bg-emerald-100 text-emerald-800",
  other: "bg-slate-100 text-slate-600",
};

const inputCls =
  "rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function InboxList({
  emails,
  aiEnabled,
}: {
  emails: RecruitingEmail[];
  aiEnabled: boolean;
}) {
  const [ext, setExt] = useState<Record<string, EmailExtraction>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setError(null);
    setAnalyzing(true);
    try {
      const res = await extractEmailsAction(
        emails.map((e) => ({
          id: e.id,
          from: e.from,
          subject: e.subject,
          snippet: e.snippet,
        })),
      );
      setExt(Object.fromEntries(res.map((r) => [r.id, r])));
      setAnalyzed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div>
      {aiEnabled ? (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            onClick={analyze}
            disabled={analyzing}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {analyzing ? "Analyzing…" : analyzed ? "Re-analyze with AI" : "Analyze with AI"}
          </button>
          <span className="text-xs text-slate-500">
            Detects company, role, and deadlines from each email — review before adding.
          </span>
          {error ? <span className="text-xs text-rose-600">{error}</span> : null}
        </div>
      ) : null}

      <ul className="space-y-3">
        {emails.map((m) => {
          const x = ext[m.id];
          const company = x?.company ?? m.guessCompany;
          const role = x?.role ?? m.subject;
          const deadline = x?.deadline ?? "";
          return (
            <li key={m.id}>
              <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {m.subject || "(no subject)"}
                      </span>
                      {x?.type ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[x.type] ?? TYPE_BADGE.other}`}
                        >
                          {x.type}
                        </span>
                      ) : null}
                      {x ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                          {x.confidence} conf.
                        </span>
                      ) : null}
                      {x?.deadline ? (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                          deadline {x.deadline}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.from} · {m.date}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {m.snippet}
                    </p>
                  </div>

                  <form
                    key={x ? `ai-${m.id}` : `raw-${m.id}`}
                    action={addEmailToTrackerAction}
                    className="flex shrink-0 flex-wrap items-end gap-2 lg:w-[22rem]"
                  >
                    <label className="text-xs text-slate-500">
                      <span className="mb-0.5 block">Company</span>
                      <input name="company" defaultValue={company} className={`w-28 ${inputCls}`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      <span className="mb-0.5 block">Role</span>
                      <input name="role" defaultValue={role} className={`w-32 ${inputCls}`} />
                    </label>
                    <label className="text-xs text-slate-500">
                      <span className="mb-0.5 block">Deadline</span>
                      <input
                        name="deadline"
                        type="date"
                        defaultValue={deadline}
                        className={`w-36 ${inputCls}`}
                      />
                    </label>
                    <input type="hidden" name="notes" value={m.snippet} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      + Add lead
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
