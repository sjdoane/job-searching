"use server";

import { revalidatePath } from "next/cache";

import { TASK_KINDS } from "@/lib/db";
import { validISODateOrNull } from "@/lib/dates";
import {
  createGoal,
  createTask,
  deleteGoal,
  deleteTask,
  setTaskDone,
  updateGoal,
  updateTask,
} from "@/lib/planner";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Positive-integer id or null (drops NaN/negative/garbage before it hits a FK). */
function posIntOrNull(value: number | string | null): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

function num(form: FormData, key: string): number | null {
  return posIntOrNull(str(form, key));
}

/** Constrain a free-string kind to the known set. */
function kindOf(value: string | null): string {
  return value && (TASK_KINDS as readonly string[]).includes(value)
    ? value
    : "todo";
}

function revalidate() {
  revalidatePath("/plan");
  revalidatePath("/");
}

// ---- Tasks ----------------------------------------------------------------

export async function addTaskAction(form: FormData) {
  const priority = num(form, "priority");
  createTask({
    title: str(form, "title") ?? "Untitled task",
    kind: kindOf(str(form, "kind")),
    priority: priority && priority >= 1 && priority <= 3 ? priority : 2,
    dueAt: validISODateOrNull(str(form, "dueAt")),
    targetId: num(form, "targetId"),
    goalId: num(form, "goalId"),
    notes: str(form, "notes"),
  });
  revalidate();
}

/** Add a generated suggestion to the task list (carries its sourceKey). */
export interface SuggestionInput {
  key: string;
  title: string;
  kind: string;
  priority: number;
  dueAt: string | null;
  targetId: number | null;
}

export async function addSuggestionAction(s: SuggestionInput) {
  createTask({
    title: s.title,
    kind: kindOf(s.kind),
    priority: s.priority >= 1 && s.priority <= 3 ? s.priority : 2,
    dueAt: validISODateOrNull(s.dueAt),
    targetId: posIntOrNull(s.targetId),
    sourceKey: s.key,
  });
  revalidate();
}

export async function toggleTaskAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  setTaskDone(id, str(form, "done") === "1");
  revalidate();
}

export async function deleteTaskAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  deleteTask(id);
  revalidate();
}

export async function updateTaskAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  const priority = num(form, "priority");
  const kindRaw = str(form, "kind");
  updateTask(id, {
    title: str(form, "title") ?? undefined,
    kind: kindRaw ? kindOf(kindRaw) : undefined,
    priority: priority && priority >= 1 && priority <= 3 ? priority : undefined,
    dueAt: validISODateOrNull(str(form, "dueAt")),
    goalId: num(form, "goalId"),
    notes: str(form, "notes"),
  });
  revalidate();
}

// ---- Goals ----------------------------------------------------------------

export async function addGoalAction(form: FormData) {
  createGoal({
    title: str(form, "title") ?? "Untitled goal",
    horizon: str(form, "horizon") ?? "short",
    targetDate: validISODateOrNull(str(form, "targetDate")),
    notes: str(form, "notes"),
  });
  revalidate();
}

export async function toggleGoalAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  updateGoal(id, { status: str(form, "done") === "1" ? "done" : "active" });
  revalidate();
}

export async function deleteGoalAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  deleteGoal(id);
  revalidate();
}
