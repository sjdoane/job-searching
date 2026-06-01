import "server-only";

import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { todayISO } from "./dates";
import {
  assessments,
  contacts,
  db,
  goals,
  targets,
  tasks,
  type NewGoal,
  type NewTask,
  type TaskKind,
} from "./db";

function now() {
  return new Date();
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskWithFirm {
  task: typeof tasks.$inferSelect;
  firmCompany: string | null;
}

export function listTasksWithFirm(): TaskWithFirm[] {
  const rows = db
    .select({ task: tasks, firmCompany: targets.company })
    .from(tasks)
    .leftJoin(targets, eq(tasks.targetId, targets.id))
    .orderBy(asc(tasks.status), asc(tasks.dueAt), asc(tasks.priority))
    .all();
  return rows as TaskWithFirm[];
}

export function createTask(data: NewTask) {
  const ts = now();
  return db
    .insert(tasks)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

export function updateTask(id: number, data: Partial<NewTask>) {
  return db
    .update(tasks)
    .set({ ...data, updatedAt: now() })
    .where(eq(tasks.id, id))
    .returning()
    .get();
}

export function setTaskDone(id: number, done: boolean) {
  return db
    .update(tasks)
    .set({
      status: done ? "done" : "open",
      doneAt: done ? todayISO() : null,
      updatedAt: now(),
    })
    .where(eq(tasks.id, id))
    .returning()
    .get();
}

export function deleteTask(id: number) {
  return db.delete(tasks).where(eq(tasks.id, id)).run();
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export interface GoalWithProgress {
  goal: typeof goals.$inferSelect;
  total: number;
  done: number;
}

export function listGoalsWithProgress(): GoalWithProgress[] {
  const allGoals = db.select().from(goals).orderBy(desc(goals.updatedAt)).all();
  const allTasks = db
    .select({ goalId: tasks.goalId, status: tasks.status })
    .from(tasks)
    .where(isNotNull(tasks.goalId))
    .all();
  return allGoals.map((goal) => {
    const linked = allTasks.filter((t) => t.goalId === goal.id);
    return {
      goal,
      total: linked.length,
      done: linked.filter((t) => t.status === "done").length,
    };
  });
}

export function createGoal(data: NewGoal) {
  const ts = now();
  return db
    .insert(goals)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

export function updateGoal(id: number, data: Partial<NewGoal>) {
  return db
    .update(goals)
    .set({ ...data, updatedAt: now() })
    .where(eq(goals.id, id))
    .returning()
    .get();
}

export function deleteGoal(id: number) {
  return db.delete(goals).where(eq(goals.id, id)).run();
}

// ---------------------------------------------------------------------------
// Smart suggestions — deterministic rules over the current tracker state
// ---------------------------------------------------------------------------

export interface Suggestion {
  key: string;
  title: string;
  kind: TaskKind;
  priority: number;
  dueAt: string | null;
  targetId: number | null;
  reason: string;
}

const APPLY_STATUSES = new Set(["lead", "researching", "networking"]);

export function generateSuggestions(limit = 18): Suggestion[] {
  const today = todayISO();
  const horizon14 = addDays(today, 14);

  // Keys already turned into a task (open OR done) — never re-suggest.
  const usedKeys = new Set(
    db
      .select({ k: tasks.sourceKey })
      .from(tasks)
      .where(isNotNull(tasks.sourceKey))
      .all()
      .map((r) => r.k as string),
  );

  const allTargets = db.select().from(targets).all();
  const allContacts = db.select().from(contacts).all();
  const contactsByTarget = new Map<number, number>();
  for (const c of allContacts) {
    if (c.targetId != null)
      contactsByTarget.set(c.targetId, (contactsByTarget.get(c.targetId) ?? 0) + 1);
  }

  const out: Suggestion[] = [];
  const push = (s: Suggestion) => {
    if (!usedKeys.has(s.key)) out.push(s);
  };

  // 1. Open now -> apply
  for (const t of allTargets) {
    if (!APPLY_STATUSES.has(t.status) || t.appliedAt) continue;
    if (t.opensAt && t.opensAt <= today) {
      push({
        key: `apply:${t.id}`,
        title: `Apply to ${t.company}`,
        kind: "apply",
        priority: 1,
        dueAt: t.deadline ?? addDays(today, 7),
        targetId: t.id,
        reason: "Applications are open now",
      });
    } else if (t.opensAt && t.opensAt > today && t.opensAt <= horizon14) {
      // 2. Opening within 14 days -> prep
      push({
        key: `prep:${t.id}`,
        title: `Prep your application for ${t.company}`,
        kind: "prep",
        priority: 1,
        dueAt: t.opensAt,
        targetId: t.id,
        reason: `Opens ${t.opensAt}`,
      });
    }
    // 6. Deadline approaching
    if (t.deadline && t.deadline >= today && t.deadline <= horizon14 && !t.appliedAt) {
      push({
        key: `deadline:${t.id}`,
        title: `Submit ${t.company} before the deadline`,
        kind: "apply",
        priority: 1,
        dueAt: t.deadline,
        targetId: t.id,
        reason: `Deadline ${t.deadline}`,
      });
    }
  }

  // 3. Researching firms with no contacts -> find an alum (cap to a few)
  const networkCandidates = allTargets
    .filter(
      (t) =>
        t.status === "researching" &&
        !contactsByTarget.get(t.id) &&
        !usedKeys.has(`network:${t.id}`),
    )
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);
  for (const t of networkCandidates) {
    push({
      key: `network:${t.id}`,
      title: `Find a USC alum or contact at ${t.company}`,
      kind: "network",
      priority: 2,
      dueAt: t.opensAt && t.opensAt > today ? t.opensAt : addDays(today, 14),
      targetId: t.id,
      reason: "Researching, no contacts yet — a referral gets you read",
    });
  }

  // 4. Contact follow-ups due
  for (const c of allContacts) {
    if (c.nextFollowUpAt && c.nextFollowUpAt <= addDays(today, 3)) {
      push({
        key: `followup:${c.id}`,
        title: `Follow up with ${c.name}${c.company ? ` (${c.company})` : ""}`,
        kind: "network",
        priority: 1,
        dueAt: c.nextFollowUpAt,
        targetId: c.targetId,
        reason: "Follow-up due",
      });
    }
  }

  // 5. Assessments due soon
  const dueAssessments = db
    .select()
    .from(assessments)
    .where(and(isNotNull(assessments.dueAt), eq(assessments.status, "pending")))
    .all();
  for (const a of dueAssessments) {
    if (a.dueAt && a.dueAt >= today && a.dueAt <= horizon14) {
      const parent = allTargets.find((t) => t.id === a.targetId);
      push({
        key: `assess:${a.id}`,
        title: `Prepare ${a.type.toUpperCase()}${parent ? ` for ${parent.company}` : ""}`,
        kind: "prep",
        priority: 1,
        dueAt: a.dueAt,
        targetId: a.targetId,
        reason: `Assessment due ${a.dueAt}`,
      });
    }
  }

  // 7. No goals set yet
  const goalCount = db.select({ id: goals.id }).from(goals).all().length;
  if (goalCount === 0) {
    push({
      key: "setgoals",
      title: "Set your short, medium, and long-term goals",
      kind: "admin",
      priority: 2,
      dueAt: null,
      targetId: null,
      reason: "Goals keep the search on track",
    });
  }

  return out
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");
    })
    .slice(0, limit);
}
