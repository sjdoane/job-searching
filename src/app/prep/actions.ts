"use server";

import { revalidatePath } from "next/cache";

import { ASSESSMENT_TYPES, PREP_CATEGORIES, PREP_STATUSES } from "@/lib/db";
import { todayISO, validISODateOrNull } from "@/lib/dates";
import { createTask } from "@/lib/planner";
import { PREP_CURRICULUM } from "@/lib/prep-curriculum";
import {
  countPrepItems,
  createAssessment,
  createPrepItem,
  createPrepItems,
  deleteAssessment,
  deletePrepItem,
  setAssessmentStatus,
  updateAssessment,
  updatePrepItem,
} from "@/lib/tracker";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function num(form: FormData, key: string): number | null {
  const n = Number(str(form, key));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function oneOf<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const ASSESSMENT_STATUSES = ["pending", "scheduled", "done"] as const;

function revalidate() {
  // Assessments feed the calendar + dashboard + plan suggestions; study tasks
  // feed the plan + calendar; prep items live on /prep.
  revalidatePath("/prep");
  revalidatePath("/calendar");
  revalidatePath("/plan");
  revalidatePath("/");
}

// ---- Assessments ----------------------------------------------------------

export async function saveAssessmentAction(form: FormData) {
  const id = num(form, "id");
  const targetId = num(form, "targetId");
  const data = {
    type: oneOf(str(form, "type"), ASSESSMENT_TYPES, "other"),
    title: str(form, "title"),
    dueAt: validISODateOrNull(str(form, "dueAt")),
    status: oneOf(str(form, "status"), ASSESSMENT_STATUSES, "pending"),
    notes: str(form, "notes"),
  };
  if (id) {
    // Edit keeps the existing firm if targetId is absent (can't null a NOT-NULL FK).
    updateAssessment(id, targetId ? { ...data, targetId } : data);
  } else {
    if (!targetId) throw new Error("Pick a firm for this assessment.");
    createAssessment({ ...data, targetId });
  }
  revalidate();
}

export async function deleteAssessmentAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  deleteAssessment(id);
  revalidate();
}

export async function setAssessmentStatusAction(form: FormData) {
  const id = num(form, "id");
  const status = oneOf(str(form, "status"), ASSESSMENT_STATUSES, "pending");
  if (!id) return;
  setAssessmentStatus(id, status);
  revalidate();
}

/** Quick-add a study session as a task (shows up on Plan + Calendar). */
export async function addStudyTaskAction(form: FormData) {
  createTask({
    title: str(form, "title") ?? "Study session",
    kind: "study",
    priority: 2,
    dueAt: validISODateOrNull(str(form, "dueAt")),
    targetId: num(form, "targetId"),
  });
  revalidate();
}

// ---- Prep items -----------------------------------------------------------

export async function savePrepItemAction(form: FormData) {
  const id = num(form, "id");
  const data = {
    category: oneOf(str(form, "category"), PREP_CATEGORIES, "behavioral"),
    topic: str(form, "topic") ?? "Untitled topic",
    status: oneOf(str(form, "status"), PREP_STATUSES, "not_started"),
    resourceUrl: str(form, "resourceUrl"),
    notes: str(form, "notes"),
    lastReviewedAt: validISODateOrNull(str(form, "lastReviewedAt")),
  };
  if (id) updatePrepItem(id, data);
  else createPrepItem({ ...data, sortOrder: 500 });
  revalidate();
}

export async function deletePrepItemAction(form: FormData) {
  const id = num(form, "id");
  if (!id) return;
  deletePrepItem(id);
  revalidate();
}

export async function setPrepStatusAction(form: FormData) {
  const id = num(form, "id");
  const status = oneOf(str(form, "status"), PREP_STATUSES, "not_started");
  if (!id) return;
  // Touching the status counts as a review — stamp the date for recency.
  updatePrepItem(id, { status, lastReviewedAt: todayISO() });
  revalidate();
}

/** Seed the starter checklist for a category (no-op if it already has items). */
export async function loadPrepStarterAction(form: FormData) {
  const category = oneOf(str(form, "category"), PREP_CATEGORIES, "behavioral");
  if (countPrepItems(category) > 0) return;
  const rows = (PREP_CURRICULUM[category] ?? []).map((c, i) => ({
    category,
    topic: c.topic,
    resourceUrl: c.resourceUrl ?? null,
    status: "not_started",
    sortOrder: i,
  }));
  createPrepItems(rows);
  revalidate();
}
