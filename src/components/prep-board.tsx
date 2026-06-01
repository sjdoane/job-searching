"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  addStudyTaskAction,
  deleteAssessmentAction,
  deletePrepItemAction,
  loadPrepStarterAction,
  savePrepItemAction,
  saveAssessmentAction,
  setAssessmentStatusAction,
  setPrepStatusAction,
} from "@/app/prep/actions";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate, relativeDeadline, urgencyClass } from "@/lib/dates";
import {
  ASSESSMENT_STATUS_OPTIONS,
  ASSESSMENT_TYPE_OPTIONS,
  PREP_CATEGORY_OPTIONS,
  PREP_STATUS_COLORS,
  PREP_STATUS_OPTIONS,
  labelFor,
} from "@/lib/labels";

export interface PrepFirmOption {
  id: number;
  company: string;
  track: string;
}
export interface PrepAssessment {
  id: number;
  targetId: number | null;
  type: string;
  title: string | null;
  dueAt: string | null;
  status: string;
  notes: string | null;
  firmCompany: string | null;
  firmTrack: string | null;
}
export interface PrepItemRow {
  id: number;
  category: string;
  topic: string;
  status: string;
  resourceUrl: string | null;
  notes: string | null;
  lastReviewedAt: string | null;
}
export interface StudyTaskRow {
  id: number;
  title: string;
  firmCompany: string | null;
  dueAt: string | null;
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const L = (s: string) => (
  <span className="mb-1 block text-xs font-medium text-slate-600">{s}</span>
);

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SubmitRow({ pending, onCancel, label }: { pending: boolean; onCancel: () => void; label: string }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
        Cancel
      </button>
      <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

function AssessmentForm({
  firms,
  assessment,
  onDone,
}: {
  firms: PrepFirmOption[];
  assessment?: PrepAssessment;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  if (firms.length === 0) {
    return (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Add a firm on the <Link href="/tracker" className="text-indigo-600 hover:underline">Tracker</Link> first — every assessment is tied to a firm.</p>
        <div className="flex justify-end"><button onClick={onDone} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Close</button></div>
      </div>
    );
  }
  async function handle(formData: FormData) {
    setPending(true);
    try {
      await saveAssessmentAction(formData);
      onDone();
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={handle} className="space-y-3">
      {assessment ? <input type="hidden" name="id" value={assessment.id} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>{L("Firm *")}
          <select name="targetId" required defaultValue={assessment?.targetId ?? firms[0]?.id} className={inputCls}>
            {firms.map((f) => (<option key={f.id} value={f.id}>{f.company}</option>))}
          </select>
        </label>
        <label>{L("Type")}
          <select name="type" defaultValue={assessment?.type ?? "oa"} className={inputCls}>
            {ASSESSMENT_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
        <label>{L("Title / detail")}<input name="title" defaultValue={assessment?.title ?? ""} className={inputCls} placeholder="e.g. HackerRank OA, Round 1 case" /></label>
        <label>{L("Due / scheduled date")}<input name="dueAt" type="date" defaultValue={assessment?.dueAt ?? ""} className={inputCls} /></label>
        <label>{L("Status")}
          <select name="status" defaultValue={assessment?.status ?? "pending"} className={inputCls}>
            {ASSESSMENT_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
      </div>
      <label>{L("Notes")}<textarea name="notes" rows={2} defaultValue={assessment?.notes ?? ""} className={inputCls} placeholder="Format, topics, window length, login link…" /></label>
      <SubmitRow pending={pending} onCancel={onDone} label={assessment ? "Save" : "Add assessment"} />
    </form>
  );
}

function StudyTaskModal({ assessment, onClose }: { assessment: PrepAssessment; onClose: () => void }) {
  const [pending, setPending] = useState(false);
  const firm = assessment.firmCompany ?? "firm";
  const typeLabel = labelFor(ASSESSMENT_TYPE_OPTIONS, assessment.type);
  async function handle(formData: FormData) {
    setPending(true);
    try {
      await addStudyTaskAction(formData);
      onClose();
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal title="Schedule a study session" onClose={onClose}>
      <form action={handle} className="space-y-3">
        {assessment.targetId ? <input type="hidden" name="targetId" value={assessment.targetId} /> : null}
        <label>{L("Task")}<input name="title" defaultValue={`Prep ${firm} — ${typeLabel}`} className={inputCls} /></label>
        <label>{L("When")}<input name="dueAt" type="date" defaultValue={assessment.dueAt ?? ""} className={inputCls} /></label>
        <p className="text-[11px] text-slate-400">Adds a study task to your Plan and Calendar.</p>
        <SubmitRow pending={pending} onCancel={onClose} label="Add to plan" />
      </form>
    </Modal>
  );
}

function PrepItemForm({ item, presetCategory, onDone }: { item?: PrepItemRow; presetCategory?: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  async function handle(formData: FormData) {
    setPending(true);
    try {
      await savePrepItemAction(formData);
      onDone();
    } finally {
      setPending(false);
    }
  }
  return (
    <form action={handle} className="space-y-3">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>{L("Category")}
          <select name="category" defaultValue={item?.category ?? presetCategory ?? "behavioral"} className={inputCls}>
            {PREP_CATEGORY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
        <label>{L("Status")}
          <select name="status" defaultValue={item?.status ?? "not_started"} className={inputCls}>
            {PREP_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </label>
      </div>
      <label>{L("Topic *")}<input name="topic" required defaultValue={item?.topic ?? ""} className={inputCls} placeholder="e.g. Expected value & conditional probability" /></label>
      <label>{L("Resource link")}<input name="resourceUrl" defaultValue={item?.resourceUrl ?? ""} className={inputCls} placeholder="https://…" /></label>
      <label>{L("Last reviewed")}<input name="lastReviewedAt" type="date" defaultValue={item?.lastReviewedAt ?? ""} className={inputCls} /></label>
      <label>{L("Notes")}<textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} className={inputCls} /></label>
      <SubmitRow pending={pending} onCancel={onDone} label={item ? "Save" : "Add topic"} />
    </form>
  );
}

function AssessmentStatusSelect({ assessment }: { assessment: PrepAssessment }) {
  const [, start] = useTransition();
  return (
    <select
      defaultValue={assessment.status}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("id", String(assessment.id));
        fd.set("status", e.target.value);
        start(() => void setAssessmentStatusAction(fd));
      }}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
    >
      {ASSESSMENT_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

function PrepStatusSelect({ item }: { item: PrepItemRow }) {
  const [, start] = useTransition();
  return (
    <select
      defaultValue={item.status}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("id", String(item.id));
        fd.set("status", e.target.value);
        start(() => void setPrepStatusAction(fd));
      }}
      className={`rounded-full px-2 py-1 text-xs font-medium ${PREP_STATUS_COLORS[item.status] ?? PREP_STATUS_COLORS.not_started}`}
    >
      {PREP_STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

function AssessmentRow({
  a,
  onStudy,
  onEdit,
  onDelete,
}: {
  a: PrepAssessment;
  onStudy: (a: PrepAssessment) => void;
  onEdit: (a: PrepAssessment) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
      <Badge className="bg-slate-100 text-slate-600">{labelFor(ASSESSMENT_TYPE_OPTIONS, a.type)}</Badge>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">
          {a.firmCompany ?? "—"}
          {a.title ? <span className="font-normal text-slate-500"> · {a.title}</span> : null}
        </div>
        <div className="text-xs text-slate-500">
          {a.dueAt ? <span className={urgencyClass(a.dueAt)}>{relativeDeadline(a.dueAt)} · {formatDate(a.dueAt)}</span> : "No date set"}
        </div>
      </div>
      {/* keyed by status so the uncontrolled select resyncs after a modal edit */}
      <AssessmentStatusSelect key={`${a.id}:${a.status}`} assessment={a} />
      <button onClick={() => onStudy(a)} className="rounded border border-violet-200 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50">+ study</button>
      <button onClick={() => onEdit(a)} className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Edit</button>
      <button onClick={() => onDelete(a.id)} className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
    </li>
  );
}

export function PrepBoard({
  assessments,
  prepItems,
  studyTasks,
  firms,
}: {
  assessments: PrepAssessment[];
  prepItems: PrepItemRow[];
  studyTasks: StudyTaskRow[];
  firms: PrepFirmOption[];
}) {
  const [addingAssessment, setAddingAssessment] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<PrepAssessment | null>(null);
  const [studyFor, setStudyFor] = useState<PrepAssessment | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null); // preset category
  const [editingItem, setEditingItem] = useState<PrepItemRow | null>(null);
  const [, start] = useTransition();

  const { upcoming, done } = useMemo(() => {
    const up = assessments
      .filter((a) => a.status !== "done")
      .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
    const dn = assessments.filter((a) => a.status === "done");
    return { upcoming: up, done: dn };
  }, [assessments]);

  const itemsByCategory = useMemo(() => {
    const m = new Map<string, PrepItemRow[]>();
    for (const it of prepItems) {
      const list = m.get(it.category) ?? [];
      list.push(it);
      m.set(it.category, list);
    }
    return m;
  }, [prepItems]);

  function removeAssessment(id: number) {
    if (!confirm("Delete this assessment?")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    start(() => void deleteAssessmentAction(fd));
  }
  function removeItem(id: number) {
    if (!confirm("Delete this prep topic?")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    start(() => void deletePrepItemAction(fd));
  }
  function loadStarter(category: string) {
    const fd = new FormData();
    fd.set("category", category);
    start(() => void loadPrepStarterAction(fd));
  }

  return (
    <div className="space-y-8">
      {/* SECTION A — Assessments & interviews */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Assessments &amp; interviews</h2>
          <button onClick={() => setAddingAssessment(true)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">+ Add assessment</button>
        </div>
        {assessments.length === 0 ? (
          <EmptyState title="No assessments tracked yet" hint="Add an OA, case, or interview the moment you're invited — quant OAs especially have short windows. Due dates show on your Calendar and Dashboard." />
        ) : (
          <div className="space-y-4">
            {upcoming.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Upcoming · {upcoming.length}</div>
                <ul className="divide-y divide-slate-100">{upcoming.map((a) => <AssessmentRow key={a.id} a={a} onStudy={setStudyFor} onEdit={setEditingAssessment} onDelete={removeAssessment} />)}</ul>
              </div>
            ) : null}
            {done.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white opacity-75">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Done · {done.length}</div>
                <ul className="divide-y divide-slate-100">{done.map((a) => <AssessmentRow key={a.id} a={a} onStudy={setStudyFor} onEdit={setEditingAssessment} onDelete={removeAssessment} />)}</ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Study schedule (reuses tasks; managed on Plan) */}
      {studyTasks.length > 0 ? (
        <Card className="border-violet-200 bg-violet-50/50">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-violet-900">Upcoming study sessions</div>
            <Link href="/plan" className="text-xs text-indigo-600 hover:underline">Manage on Plan →</Link>
          </div>
          <ul className="space-y-1">
            {studyTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                {t.dueAt ? <span className={`text-xs ${urgencyClass(t.dueAt)}`}>{relativeDeadline(t.dueAt)}</span> : <span className="text-xs text-slate-400">no date</span>}
                <span className="font-medium text-slate-800">{t.title}</span>
                {t.firmCompany ? <span className="text-slate-500">· {t.firmCompany}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* SECTION B — Prep readiness */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Prep readiness</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PREP_CATEGORY_OPTIONS.map((cat) => {
            const items = itemsByCategory.get(cat.value) ?? [];
            const ready = items.filter((i) => i.status === "ready").length;
            return (
              <Card key={cat.value}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    {cat.label}
                    {items.length > 0 ? <span className="ml-2 text-xs font-normal text-slate-400">{ready}/{items.length} ready</span> : null}
                  </h3>
                  <button onClick={() => setAddingItem(cat.value)} className="text-xs font-medium text-indigo-600 hover:underline">+ add</button>
                </div>
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center">
                    <p className="text-xs text-slate-500">No topics yet.</p>
                    <button onClick={() => loadStarter(cat.value)} className="mt-2 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">Load starter checklist</button>
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((it) => (
                      <li key={it.id} className="flex items-center gap-2">
                        <PrepStatusSelect key={`${it.id}:${it.status}`} item={it} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-slate-800">
                            {it.resourceUrl ? (
                              <a href={it.resourceUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-600 hover:underline">{it.topic}</a>
                            ) : it.topic}
                          </div>
                          {it.lastReviewedAt ? <div className="text-[11px] text-slate-400">reviewed {formatDate(it.lastReviewedAt)}</div> : null}
                        </div>
                        <button onClick={() => setEditingItem(it)} className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100">Edit</button>
                        <button onClick={() => removeItem(it.id)} className="rounded px-1.5 py-0.5 text-xs text-rose-600 hover:bg-rose-50">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {addingAssessment ? (
        <Modal title="Add assessment" onClose={() => setAddingAssessment(false)}>
          <AssessmentForm firms={firms} onDone={() => setAddingAssessment(false)} />
        </Modal>
      ) : null}
      {editingAssessment ? (
        <Modal title="Edit assessment" onClose={() => setEditingAssessment(null)}>
          <AssessmentForm firms={firms} assessment={editingAssessment} onDone={() => setEditingAssessment(null)} />
        </Modal>
      ) : null}
      {studyFor ? <StudyTaskModal assessment={studyFor} onClose={() => setStudyFor(null)} /> : null}
      {addingItem ? (
        <Modal title="Add prep topic" onClose={() => setAddingItem(null)}>
          <PrepItemForm presetCategory={addingItem} onDone={() => setAddingItem(null)} />
        </Modal>
      ) : null}
      {editingItem ? (
        <Modal title="Edit prep topic" onClose={() => setEditingItem(null)}>
          <PrepItemForm item={editingItem} onDone={() => setEditingItem(null)} />
        </Modal>
      ) : null}
    </div>
  );
}
