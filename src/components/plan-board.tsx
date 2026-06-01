"use client";

import { useMemo, useState, useTransition } from "react";

import {
  addGoalAction,
  addSuggestionAction,
  addTaskAction,
  deleteGoalAction,
  deleteTaskAction,
  toggleGoalAction,
  toggleTaskAction,
  updateTaskAction,
  type SuggestionInput,
} from "@/app/plan/actions";
import { Badge, Card } from "@/components/ui";
import { daysUntil, formatDate, relativeDeadline, urgencyClass } from "@/lib/dates";
import {
  GOAL_HORIZON_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_KIND_COLORS,
  TASK_KIND_OPTIONS,
  labelFor,
} from "@/lib/labels";

export interface PlanTask {
  id: number;
  title: string;
  status: string;
  kind: string;
  priority: number;
  dueAt: string | null;
  targetId: number | null;
  goalId: number | null;
  notes: string | null;
  firmCompany: string | null;
}
export interface PlanGoal {
  id: number;
  title: string;
  horizon: string;
  targetDate: string | null;
  status: string;
  notes: string | null;
  total: number;
  done: number;
}
export interface PlanSuggestion {
  key: string;
  title: string;
  kind: string;
  priority: number;
  dueAt: string | null;
  targetId: number | null;
  reason: string;
}
export interface FirmOption {
  id: number;
  company: string;
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4" onClick={onClose}>
      <div className="my-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  return <Badge className={TASK_KIND_COLORS[kind] ?? TASK_KIND_COLORS.todo}>{labelFor(TASK_KIND_OPTIONS, kind)}</Badge>;
}

function TaskRow({
  t,
  onEdit,
}: {
  t: PlanTask;
  onEdit: (t: PlanTask) => void;
}) {
  const [, start] = useTransition();
  const toggle = (done: boolean) => {
    const fd = new FormData();
    fd.set("id", String(t.id));
    fd.set("done", done ? "1" : "0");
    start(() => void toggleTaskAction(fd));
  };
  const remove = () => {
    const fd = new FormData();
    fd.set("id", String(t.id));
    start(() => void deleteTaskAction(fd));
  };
  const done = t.status === "done";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <input type="checkbox" checked={done} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4" />
      <KindBadge kind={t.kind} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-900"}`}>{t.title}</div>
        {t.firmCompany ? <div className="text-xs text-slate-400">{t.firmCompany}</div> : null}
      </div>
      {t.dueAt ? (
        <span className={`w-28 text-right text-xs ${done ? "text-slate-400" : urgencyClass(t.dueAt)}`}>{relativeDeadline(t.dueAt)}</span>
      ) : (
        <span className="w-28 text-right text-xs text-slate-300">no date</span>
      )}
      <button onClick={() => onEdit(t)} className="text-xs font-medium text-slate-500 hover:text-slate-800">Edit</button>
      <button onClick={remove} className="text-xs font-medium text-rose-500 hover:text-rose-700">×</button>
    </li>
  );
}

function TaskForm({ task, firms, goals, onDone }: { task?: PlanTask; firms: FirmOption[]; goals: PlanGoal[]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  async function handle(fd: FormData) {
    setPending(true);
    try {
      if (task) await updateTaskAction(fd);
      else await addTaskAction(fd);
      onDone();
    } finally {
      setPending(false);
    }
  }
  const L = (s: string) => <span className="mb-1 block text-xs font-medium text-slate-600">{s}</span>;
  return (
    <form action={handle} className="space-y-3">
      {task ? <input type="hidden" name="id" value={task.id} /> : null}
      <label>{L("Task *")}<input name="title" required defaultValue={task?.title ?? ""} className={inputCls} placeholder="Apply to … / Reach out to …" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label>{L("Kind")}<select name="kind" defaultValue={task?.kind ?? "todo"} className={inputCls}>{TASK_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label>{L("Priority")}<select name="priority" defaultValue={String(task?.priority ?? 2)} className={inputCls}>{PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label>{L("Due")}<input name="dueAt" type="date" defaultValue={task?.dueAt ?? ""} className={inputCls} /></label>
        <label>{L("Firm")}<select name="targetId" defaultValue={task?.targetId ?? ""} className={inputCls}><option value="">—</option>{firms.map((f) => <option key={f.id} value={f.id}>{f.company}</option>)}</select></label>
      </div>
      <label>{L("Goal (optional)")}<select name="goalId" defaultValue={task?.goalId ?? ""} className={inputCls}><option value="">—</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

function GoalForm({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState(false);
  async function handle(fd: FormData) {
    setPending(true);
    try {
      await addGoalAction(fd);
      onDone();
    } finally {
      setPending(false);
    }
  }
  const L = (s: string) => <span className="mb-1 block text-xs font-medium text-slate-600">{s}</span>;
  return (
    <form action={handle} className="space-y-3">
      <label>{L("Goal *")}<input name="title" required className={inputCls} placeholder="e.g. Apply to 10 quant firms by August" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label>{L("Horizon")}<select name="horizon" defaultValue="short" className={inputCls}>{GOAL_HORIZON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label>{L("Target date")}<input name="targetDate" type="date" className={inputCls} /></label>
      </div>
      <label>{L("Notes")}<textarea name="notes" rows={2} className={inputCls} /></label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
        <button type="submit" disabled={pending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{pending ? "Saving…" : "Add goal"}</button>
      </div>
    </form>
  );
}

export function PlanBoard({ tasks, goals, suggestions, firms }: { tasks: PlanTask[]; goals: PlanGoal[]; suggestions: PlanSuggestion[]; firms: FirmOption[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [, start] = useTransition();

  const open = useMemo(() => tasks.filter((t) => t.status !== "done"), [tasks]);
  const thisWeek = useMemo(
    () => open.filter((t) => !t.dueAt || daysUntil(t.dueAt) <= 7).sort(sortTasks),
    [open],
  );
  const upcoming = useMemo(
    () => open.filter((t) => t.dueAt && daysUntil(t.dueAt) > 7).sort(sortTasks),
    [open],
  );
  const done = useMemo(() => tasks.filter((t) => t.status === "done"), [tasks]);

  function addSuggestion(s: PlanSuggestion) {
    const input: SuggestionInput = { key: s.key, title: s.title, kind: s.kind, priority: s.priority, dueAt: s.dueAt, targetId: s.targetId };
    start(() => void addSuggestionAction(input));
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Suggestions */}
        {suggestions.length > 0 ? (
          <div>
            <h2 className="mb-2 font-semibold">Suggested this week</h2>
            <Card className="p-0">
              <ul className="divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <li key={s.key} className="flex items-center gap-3 px-4 py-2.5">
                    <KindBadge kind={s.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-900">{s.title}</div>
                      <div className="text-xs text-slate-400">{s.reason}{s.dueAt ? ` · ${formatDate(s.dueAt)}` : ""}</div>
                    </div>
                    <button onClick={() => addSuggestion(s)} className="rounded-md border border-indigo-200 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50">+ Add</button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}

        {/* This week */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">This week</h2>
            <button onClick={() => setAdding(true)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">+ Add task</button>
          </div>
          {thisWeek.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-500">Nothing due this week. Add a task or pull one from suggestions above.</div>
          ) : (
            <Card className="p-0"><ul className="divide-y divide-slate-100">{thisWeek.map((t) => <TaskRow key={t.id} t={t} onEdit={setEditing} />)}</ul></Card>
          )}
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 ? (
          <details>
            <summary className="cursor-pointer font-semibold">Upcoming ({upcoming.length})</summary>
            <Card className="mt-2 p-0"><ul className="divide-y divide-slate-100">{upcoming.map((t) => <TaskRow key={t.id} t={t} onEdit={setEditing} />)}</ul></Card>
          </details>
        ) : null}

        {/* Done */}
        {done.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-slate-500">Completed ({done.length})</summary>
            <Card className="mt-2 p-0"><ul className="divide-y divide-slate-100">{done.slice(0, 30).map((t) => <TaskRow key={t.id} t={t} onEdit={setEditing} />)}</ul></Card>
          </details>
        ) : null}
      </div>

      {/* Goals */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Goals</h2>
          <button onClick={() => setAddingGoal(true)} className="text-sm font-medium text-indigo-600 hover:underline">+ Add</button>
        </div>
        {goals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">Set short, medium, and long-term goals to anchor your search.</div>
        ) : (
          <div className="space-y-4">
            {GOAL_HORIZON_OPTIONS.map((h) => {
              const list = goals.filter((g) => g.horizon === h.value);
              if (list.length === 0) return null;
              return (
                <div key={h.value}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{h.label}</div>
                  <Card className="space-y-2 p-3">
                    {list.map((g) => <GoalRow key={g.id} g={g} />)}
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {adding ? <Modal title="Add task" onClose={() => setAdding(false)}><TaskForm firms={firms} goals={goals} onDone={() => setAdding(false)} /></Modal> : null}
      {editing ? <Modal title="Edit task" onClose={() => setEditing(null)}><TaskForm task={editing} firms={firms} goals={goals} onDone={() => setEditing(null)} /></Modal> : null}
      {addingGoal ? <Modal title="Add goal" onClose={() => setAddingGoal(false)}><GoalForm onDone={() => setAddingGoal(false)} /></Modal> : null}
    </div>
  );
}

function GoalRow({ g }: { g: PlanGoal }) {
  const [, start] = useTransition();
  const done = g.status === "done";
  const pct = g.total > 0 ? Math.round((g.done / g.total) * 100) : 0;
  const toggle = (d: boolean) => {
    const fd = new FormData();
    fd.set("id", String(g.id));
    fd.set("done", d ? "1" : "0");
    start(() => void toggleGoalAction(fd));
  };
  const remove = () => {
    const fd = new FormData();
    fd.set("id", String(g.id));
    start(() => void deleteGoalAction(fd));
  };
  return (
    <div>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={done} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-4 w-4" />
        <div className="min-w-0 flex-1">
          <div className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{g.title}</div>
          {g.targetDate ? <div className="text-xs text-slate-400">by {formatDate(g.targetDate)}</div> : null}
          {g.total > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
              <span className="text-[11px] text-slate-400">{g.done}/{g.total}</span>
            </div>
          ) : null}
        </div>
        <button onClick={remove} className="text-xs text-rose-500 hover:text-rose-700">×</button>
      </div>
    </div>
  );
}

function sortTasks(a: PlanTask, b: PlanTask): number {
  const ad = a.dueAt ? daysUntil(a.dueAt) : 999;
  const bd = b.dueAt ? daysUntil(b.dueAt) : 999;
  if (ad !== bd) return ad - bd;
  return a.priority - b.priority;
}
