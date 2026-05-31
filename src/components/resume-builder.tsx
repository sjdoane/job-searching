"use client";

import { useState, useTransition } from "react";

import {
  buildResumeAction,
  type BuildResumeResult,
} from "@/app/resume/actions";
import type { ProjectMeta } from "@/lib/resume/data";
import { TRACKS, TRACK_LABEL, type Track } from "@/lib/resume/types";

export function ResumeBuilder({
  projects,
  initial,
}: {
  projects: ProjectMeta[];
  initial: BuildResumeResult;
}) {
  const [track, setTrack] = useState<Track>(initial.track);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<BuildResumeResult>(initial);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const selected = result.selectedProjectIds;
  const available = projects.filter((p) => !selected.includes(p.id));

  function run(input: {
    track: Track;
    jd?: string;
    selectedProjectIds?: string[];
  }) {
    startTransition(async () => {
      const next = await buildResumeAction(input);
      setResult(next);
    });
  }

  function changeTrack(next: Track) {
    setTrack(next);
    run({ track: next, jd: jd || undefined }); // fresh suggestion, drop manual selection
  }

  function applyJD() {
    run({ track, jd: jd || undefined });
  }

  function toggleProject(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    run({ track, jd: jd || undefined, selectedProjectIds: next });
  }

  function move(id: string, dir: -1 | 1) {
    const idx = selected.indexOf(id);
    const swap = idx + dir;
    if (swap < 0 || swap >= selected.length) return;
    const next = selected.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    run({ track, jd: jd || undefined, selectedProjectIds: next });
  }

  function resetSuggestion() {
    run({ track, jd: jd || undefined }); // omit selection => recompute default/tailored
  }

  async function copyTex() {
    await navigator.clipboard.writeText(result.tex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadTex() {
    const blob = new Blob([result.tex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${track}.tex`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ---- Controls ---- */}
      <div className="space-y-5">
        {/* Track */}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Track</div>
          <div className="flex gap-1">
            {TRACKS.map((t) => (
              <button
                key={t}
                onClick={() => changeTrack(t)}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  track === t
                    ? "bg-indigo-600 font-medium text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {TRACK_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* JD */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Job description (optional)
          </label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            rows={5}
            placeholder="Paste a job description to surface the most relevant projects and skills…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={applyJD}
              disabled={pending}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? "Working…" : "Apply / re-rank"}
            </button>
            <button
              onClick={resetSuggestion}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Reset to suggestion
            </button>
          </div>
          {result.matchedKeywords.length > 0 ? (
            <div className="mt-3">
              <div className="mb-1 text-xs font-medium text-slate-500">
                Matched keywords (in your true content):
              </div>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Selected projects */}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">
            Selected projects (in order)
          </div>
          <ul className="space-y-1.5">
            {selected.map((id, i) => {
              const p = projectById.get(id);
              if (!p) return null;
              const score = result.projectScores[id] ?? 0;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(id, -1)}
                      disabled={i === 0 || pending}
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => move(id, 1)}
                      disabled={i === selected.length - 1 || pending}
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{p.name}</span>
                      {score > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          {score} match{score === 1 ? "" : "es"}
                        </span>
                      ) : null}
                      {!p.onBaseResume ? (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                          not on base resume
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {p.oneLiner}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleProject(id)}
                    disabled={pending}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          {available.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-600">
                Add a project ({available.length} available)
              </summary>
              <ul className="mt-2 space-y-1.5">
                {available.map((p) => {
                  const score = result.projectScores[p.id] ?? 0;
                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">
                            {p.name}
                          </span>
                          {score > 0 ? (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              {score} match{score === 1 ? "" : "es"}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {p.oneLiner}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleProject(p.id)}
                        disabled={pending}
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        + Add
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </div>
      </div>

      {/* ---- LaTeX output ---- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700">
            LaTeX (paste into Overleaf)
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyTex}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={downloadTex}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Download .tex
            </button>
          </div>
        </div>
        <textarea
          readOnly
          value={result.tex}
          className="h-[640px] w-full rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800"
        />
        <p className="text-xs text-slate-400">
          Tip: in Overleaf, create a blank project and paste this as
          <code className="mx-1 rounded bg-slate-100 px-1">main.tex</code>, then
          Recompile. Everything here is drawn only from your verified content
          bank — review against <code>VERIFICATION.md</code> before sending.
        </p>
      </div>
    </div>
  );
}
