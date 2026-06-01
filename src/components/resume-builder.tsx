"use client";

import { useState, useTransition } from "react";

import {
  aiSelectProjectsAction,
  autoFitResumeAction,
  buildResumeAction,
  compileResumeAction,
  tailorResumeAction,
  type BuildResumeResult,
  type TailorDiff,
} from "@/app/resume/actions";
import type { ExperienceMeta, ProjectMeta } from "@/lib/resume/data";
import { TRACKS, TRACK_LABEL, type Track } from "@/lib/resume/types";

export function ResumeBuilder({
  projects,
  experiences,
  initial,
  aiEnabled,
}: {
  projects: ProjectMeta[];
  experiences: ExperienceMeta[];
  initial: BuildResumeResult;
  aiEnabled: boolean;
}) {
  const [track, setTrack] = useState<Track>(initial.track);
  const [jd, setJd] = useState("");
  const [result, setResult] = useState<BuildResumeResult>(initial);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [compileMsg, setCompileMsg] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // AI tailoring state
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [diffs, setDiffs] = useState<TailorDiff[] | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI project-selection state
  const [aiSelect, setAiSelect] = useState(false);
  const [aiSelecting, setAiSelecting] = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [aiSelectError, setAiSelectError] = useState<string | null>(null);

  const projectById = new Map(projects.map((p) => [p.id, p]));
  const selected = result.selectedProjectIds;
  const available = projects.filter((p) => !selected.includes(p.id));
  const overrideCount = Object.keys(overrides).length;

  const expById = new Map(experiences.map((e) => [e.id, e]));
  const selectedExp = result.selectedExperienceIds;
  const availableExp = experiences.filter(
    (e) => !selectedExp.includes(e.id) && (!e.tracks || e.tracks.includes(track)),
  );

  function run(input: {
    track: Track;
    jd?: string;
    selectedProjectIds?: string[];
    selectedExperienceIds?: string[];
    bulletOverrides?: Record<string, string>;
  }) {
    startTransition(async () => {
      const next = await buildResumeAction({
        bulletOverrides: overrides,
        ...input,
      });
      setResult(next);
    });
  }

  function changeTrack(next: Track) {
    setTrack(next);
    // Variants differ per track, so AI overrides generated for another track no
    // longer apply — clear them on a track switch.
    setOverrides({});
    if (aiSelect) {
      runAISelect(next, jd || undefined);
    } else {
      startTransition(async () => {
        const r = await buildResumeAction({ track: next, jd: jd || undefined });
        setResult(r);
      });
    }
  }

  // Let Claude pick & order the best projects for the track + JD.
  async function runAISelect(t: Track, j: string | undefined) {
    setAiSelectError(null);
    setAiSelecting(true);
    try {
      const res = await aiSelectProjectsAction({ track: t, jd: j });
      setAiReasons(res.reasons);
      const r = await buildResumeAction({
        track: t,
        jd: j,
        selectedProjectIds: res.ids,
        selectedExperienceIds: result.selectedExperienceIds,
        bulletOverrides: overrides,
      });
      setResult(r);
    } catch (e) {
      setAiSelectError(e instanceof Error ? e.message : "AI selection failed.");
      setAiSelect(false);
    } finally {
      setAiSelecting(false);
    }
  }

  function toggleAiSelect(checked: boolean) {
    setAiSelect(checked);
    if (checked) {
      runAISelect(track, jd || undefined);
    } else {
      setAiReasons({});
      resetSuggestion();
    }
  }

  async function runAITailor() {
    setAiError(null);
    setAiPending(true);
    try {
      const d = await tailorResumeAction({
        track,
        jd: jd || undefined,
        selectedProjectIds: selected,
      });
      setDiffs(d);
      setAccepted(Object.fromEntries(d.map((x) => [x.id, true])));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI tailoring failed.");
    } finally {
      setAiPending(false);
    }
  }

  function applyDiffs() {
    if (!diffs) return;
    const next = { ...overrides };
    for (const d of diffs) {
      if (accepted[d.id]) next[d.id] = d.suggestion;
    }
    setOverrides(next);
    setDiffs(null);
    startTransition(async () => {
      const r = await buildResumeAction({
        track,
        jd: jd || undefined,
        selectedProjectIds: selected,
        selectedExperienceIds: result.selectedExperienceIds,
        bulletOverrides: next,
      });
      setResult(r);
    });
  }

  function clearOverrides() {
    setOverrides({});
    startTransition(async () => {
      const r = await buildResumeAction({
        track,
        jd: jd || undefined,
        selectedProjectIds: selected,
        selectedExperienceIds: result.selectedExperienceIds,
        bulletOverrides: {},
      });
      setResult(r);
    });
  }

  function applyJD() {
    if (aiSelect) runAISelect(track, jd || undefined);
    // Re-rank projects by JD, but keep the user's tailored work history.
    else run({ track, jd: jd || undefined, selectedExperienceIds: selectedExp });
  }

  function toggleProject(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    run({ track, jd: jd || undefined, selectedProjectIds: next, selectedExperienceIds: selectedExp });
  }

  function move(id: string, dir: -1 | 1) {
    const idx = selected.indexOf(id);
    const swap = idx + dir;
    if (swap < 0 || swap >= selected.length) return;
    const next = selected.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    run({ track, jd: jd || undefined, selectedProjectIds: next, selectedExperienceIds: selectedExp });
  }

  function toggleExperience(id: string) {
    const next = selectedExp.includes(id)
      ? selectedExp.filter((x) => x !== id)
      : [...selectedExp, id];
    run({ track, jd: jd || undefined, selectedProjectIds: selected, selectedExperienceIds: next });
  }

  function moveExperience(id: string, dir: -1 | 1) {
    const idx = selectedExp.indexOf(id);
    const swap = idx + dir;
    if (swap < 0 || swap >= selectedExp.length) return;
    const next = selectedExp.slice();
    [next[idx], next[swap]] = [next[swap], next[idx]];
    run({ track, jd: jd || undefined, selectedProjectIds: selected, selectedExperienceIds: next });
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

  function downloadPdfFromBase64(b64: string) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${track}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function autoFit() {
    setCompileMsg(null);
    setCompiling(true);
    try {
      const res = await autoFitResumeAction({
        track,
        jd: jd || undefined,
        selectedProjectIds: selected,
        selectedExperienceIds: selectedExp,
        bulletOverrides: overrides,
      });
      if (res.ok && res.pdfBase64) {
        downloadPdfFromBase64(res.pdfBase64);
        setResult({
          ...result,
          tex: res.tex ?? result.tex,
          selectedProjectIds: res.selectedProjectIds ?? result.selectedProjectIds,
          selectedExperienceIds:
            res.selectedExperienceIds ?? result.selectedExperienceIds,
        });
        const removed = res.removedNames ?? [];
        const added = res.addedNames ?? [];
        const fill = res.fillPercent != null ? ` — ${res.fillPercent}% full` : "";
        const parts: string[] = [];
        if (added.length) parts.push(`added ${added.join(", ")}`);
        if (removed.length) parts.push(`dropped ${removed.join(", ")}`);
        if (res.trimmedBullets)
          parts.push(`trimmed ${res.trimmedBullets} bullet${res.trimmedBullets === 1 ? "" : "s"}`);
        const s = res.spacingScale;
        if (s != null && s <= 0.88) parts.push("spacing tightened");
        else if (s != null && s >= 1.2) parts.push("spacing opened up to fill");
        const detail = parts.length ? ` (${parts.join("; ")})` : "";
        setCompileMsg({
          ok: !!res.fits,
          text: res.fits
            ? `Fit to one page ✓${fill}${detail}. PDF downloaded.`
            : `Still ${res.pages ?? "2+"} pages even at tightest spacing — remove a project or shorten bullets.`,
        });
      } else if (res.needsInstall) {
        setCompileMsg({
          ok: false,
          text: "Tectonic isn't installed. Run  winget install TectonicProject.Tectonic  then restart the server.",
        });
      } else {
        setCompileMsg({
          ok: false,
          text: res.error ? `Compile error: ${res.error.slice(0, 280)}` : "Auto-fit failed.",
        });
      }
    } catch (e) {
      setCompileMsg({ ok: false, text: e instanceof Error ? e.message : "Auto-fit failed." });
    } finally {
      setCompiling(false);
    }
  }

  async function compilePdf() {
    setCompileMsg(null);
    setCompiling(true);
    try {
      const res = await compileResumeAction(result.tex);
      if (res.ok && res.pdfBase64) {
        downloadPdfFromBase64(res.pdfBase64);
        const pages = res.pages ?? 1;
        setCompileMsg({
          ok: pages <= 1,
          text:
            pages <= 1
              ? "Compiled ✓ — downloaded a clean 1-page PDF."
              : `Compiled, but it's ${pages} pages — trim content to fit one page.`,
        });
      } else if (res.needsInstall) {
        setCompileMsg({
          ok: false,
          text: "Tectonic isn't installed. Run  winget install TectonicProject.Tectonic  then restart the server.",
        });
      } else {
        setCompileMsg({
          ok: false,
          text: res.error ? `Compile error: ${res.error.slice(0, 280)}` : "Compile failed.",
        });
      }
    } catch (e) {
      setCompileMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Compile failed.",
      });
    } finally {
      setCompiling(false);
    }
  }

  return (
    <>
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

          {/* AI tailoring */}
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                AI tailoring{" "}
                <span className="font-normal text-slate-400">
                  (truthful — stays within your facts)
                </span>
              </span>
              {overrideCount > 0 ? (
                <button
                  onClick={clearOverrides}
                  disabled={pending}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Clear {overrideCount} AI edit{overrideCount === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
            {aiEnabled ? (
              <button
                onClick={runAITailor}
                disabled={aiPending || pending}
                className="mt-2 rounded-md bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {aiPending ? "Tailoring…" : "AI tailor bullets to this JD"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Add <code className="rounded bg-slate-200 px-1">ANTHROPIC_API_KEY</code>{" "}
                to <code className="rounded bg-slate-200 px-1">.env.local</code> and
                restart to enable AI tailoring.
              </p>
            )}
            {aiError ? (
              <p className="mt-2 text-xs text-rose-600">{aiError}</p>
            ) : null}
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

        {/* Selected experience */}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">
            Experience (in order)
            <span className="ml-2 font-normal text-slate-400">
              tailor your work history per application
            </span>
          </div>
          <ul className="space-y-1.5">
            {selectedExp.map((id, i) => {
              const e = expById.get(id);
              if (!e) return null;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={() => moveExperience(id, -1)}
                      disabled={i === 0 || pending}
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveExperience(id, 1)}
                      disabled={i === selectedExp.length - 1 || pending}
                      className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{e.role}</div>
                    <div className="truncate text-xs text-slate-500">
                      {e.org} · {e.dateLabel}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleExperience(id)}
                    disabled={pending}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          {selectedExp.length === 0 ? (
            <p className="mt-1 text-xs text-amber-600">
              No experience selected — add at least one below.
            </p>
          ) : null}
          {availableExp.length > 0 ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-slate-600">
                Add experience ({availableExp.length} available)
              </summary>
              <ul className="mt-2 space-y-1.5">
                {availableExp.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800">{e.role}</div>
                      <div className="truncate text-xs text-slate-500">
                        {e.org} · {e.dateLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExperience(e.id)}
                      disabled={pending}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      + Add
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        {/* Selected projects */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">
              Selected projects (in order)
            </span>
            {aiSelecting ? (
              <span className="text-xs text-violet-600">AI choosing…</span>
            ) : null}
          </div>

          <label
            className={`mb-3 flex items-start gap-2 rounded-md border p-2.5 text-sm ${
              aiEnabled
                ? "cursor-pointer border-violet-200 bg-violet-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <input
              type="checkbox"
              checked={aiSelect}
              disabled={!aiEnabled || aiSelecting}
              onChange={(e) => toggleAiSelect(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium text-slate-800">
                Let AI choose projects for this role
              </span>
              <span className="block text-xs text-slate-500">
                {aiEnabled
                  ? "Claude picks and orders the most relevant projects for the track + job description. You can still adjust below."
                  : "Add ANTHROPIC_API_KEY to .env.local to enable."}
              </span>
              {aiSelectError ? (
                <span className="block text-xs text-rose-600">{aiSelectError}</span>
              ) : null}
            </span>
          </label>

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
                    {aiReasons[id] ? (
                      <div className="text-xs text-violet-600">
                        AI: {aiReasons[id]}
                      </div>
                    ) : null}
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
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              .tex
            </button>
            <button
              onClick={compilePdf}
              disabled={compiling}
              className="rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
            >
              {compiling ? "Working…" : "Compile to PDF"}
            </button>
            <button
              onClick={autoFit}
              disabled={compiling}
              title="Compile, then density-fit to exactly one full page: tighten spacing and trim trailing lines if over, add real content and expand spacing to fill if under."
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {compiling ? "Working…" : "Auto-fit & fill 1 page"}
            </button>
          </div>
        </div>
        {compileMsg ? (
          <p
            className={`rounded-md px-3 py-2 text-xs ${
              compileMsg.ok
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {compileMsg.text}
          </p>
        ) : null}
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

    {diffs !== null ? (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4">
        <div className="my-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-semibold">Review AI-tailored bullets</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each suggestion stays within your verified facts. Uncheck any you
            don&apos;t want. Nothing is applied until you click Apply.
          </p>
          {diffs.length === 0 ? (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
              No changes suggested — your current bullets already fit well.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {diffs.map((d) => (
                <li key={d.id} className="rounded-md border border-slate-200 p-3">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={accepted[d.id] ?? false}
                      onChange={(e) =>
                        setAccepted((a) => ({ ...a, [d.id]: e.target.checked }))
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-500">
                        {d.label}
                      </div>
                      <div className="mt-1 text-sm text-slate-400 line-through">
                        {d.current}
                      </div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {d.suggestion}
                      </div>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-slate-400">
                          ground truth
                        </summary>
                        <p className="mt-1 text-xs text-slate-500">
                          {d.groundTruth}
                        </p>
                      </details>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDiffs(null)}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={applyDiffs}
              disabled={diffs.length === 0}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Apply selected
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
