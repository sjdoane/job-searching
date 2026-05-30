import "server-only";

import { asc, desc, eq, isNotNull } from "drizzle-orm";

import {
  assessments,
  contacts,
  db,
  targets,
  type NewAssessment,
  type NewContact,
  type NewTarget,
} from "./db";

function now() {
  return new Date();
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export function listTargets() {
  return db
    .select()
    .from(targets)
    .orderBy(asc(targets.priority), desc(targets.updatedAt))
    .all();
}

export function getTarget(id: number) {
  return db.select().from(targets).where(eq(targets.id, id)).get();
}

export function createTarget(data: NewTarget) {
  const ts = now();
  return db
    .insert(targets)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

export function updateTarget(id: number, data: Partial<NewTarget>) {
  return db
    .update(targets)
    .set({ ...data, updatedAt: now() })
    .where(eq(targets.id, id))
    .returning()
    .get();
}

export function deleteTarget(id: number) {
  return db.delete(targets).where(eq(targets.id, id)).run();
}

/** True if a target with this posting URL already exists (search de-dupe). */
export function targetExistsByUrl(url: string) {
  if (!url) return false;
  return Boolean(
    db.select({ id: targets.id }).from(targets).where(eq(targets.url, url)).get(),
  );
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export function listContacts() {
  return db.select().from(contacts).orderBy(desc(contacts.updatedAt)).all();
}

export function listContactsForTarget(targetId: number) {
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.targetId, targetId))
    .orderBy(desc(contacts.updatedAt))
    .all();
}

export function createContact(data: NewContact) {
  const ts = now();
  return db
    .insert(contacts)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

export function updateContact(id: number, data: Partial<NewContact>) {
  return db
    .update(contacts)
    .set({ ...data, updatedAt: now() })
    .where(eq(contacts.id, id))
    .returning()
    .get();
}

export function deleteContact(id: number) {
  return db.delete(contacts).where(eq(contacts.id, id)).run();
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export function listAssessments() {
  return db.select().from(assessments).orderBy(asc(assessments.dueAt)).all();
}

export function listAssessmentsForTarget(targetId: number) {
  return db
    .select()
    .from(assessments)
    .where(eq(assessments.targetId, targetId))
    .orderBy(asc(assessments.dueAt))
    .all();
}

export function createAssessment(data: NewAssessment) {
  const ts = now();
  return db
    .insert(assessments)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

export function updateAssessment(id: number, data: Partial<NewAssessment>) {
  return db
    .update(assessments)
    .set({ ...data, updatedAt: now() })
    .where(eq(assessments.id, id))
    .returning()
    .get();
}

export function deleteAssessment(id: number) {
  return db.delete(assessments).where(eq(assessments.id, id)).run();
}

// ---------------------------------------------------------------------------
// Deadline aggregation (feeds the calendar view)
// ---------------------------------------------------------------------------

export type DeadlineKind =
  | "opens"
  | "deadline"
  | "assessment"
  | "follow-up";

export interface DeadlineItem {
  date: string; // ISO YYYY-MM-DD
  kind: DeadlineKind;
  label: string;
  company?: string | null;
  track?: string | null;
  targetId?: number | null;
}

/**
 * Collects every dated thing across the tracker into one flat list the calendar
 * can render: application open dates, deadlines, assessment due dates, and
 * contact follow-ups.
 */
export function listDeadlines(): DeadlineItem[] {
  const items: DeadlineItem[] = [];

  const allTargets = db.select().from(targets).all();

  for (const t of allTargets) {
    if (t.opensAt) {
      items.push({
        date: t.opensAt,
        kind: "opens",
        label: `Apps open: ${t.company}${t.role ? ` — ${t.role}` : ""}`,
        company: t.company,
        track: t.track,
        targetId: t.id,
      });
    }
    if (t.deadline) {
      items.push({
        date: t.deadline,
        kind: "deadline",
        label: `Deadline: ${t.company}${t.role ? ` — ${t.role}` : ""}`,
        company: t.company,
        track: t.track,
        targetId: t.id,
      });
    }
  }

  const due = db
    .select()
    .from(assessments)
    .where(isNotNull(assessments.dueAt))
    .all();
  for (const a of due) {
    const parent = db
      .select()
      .from(targets)
      .where(eq(targets.id, a.targetId))
      .get();
    items.push({
      date: a.dueAt as string,
      kind: "assessment",
      label: `${a.type.toUpperCase()}${a.title ? `: ${a.title}` : ""}${
        parent ? ` — ${parent.company}` : ""
      }`,
      company: parent?.company,
      track: parent?.track,
      targetId: a.targetId,
    });
  }

  const followUps = db
    .select()
    .from(contacts)
    .where(isNotNull(contacts.nextFollowUpAt))
    .all();
  for (const c of followUps) {
    items.push({
      date: c.nextFollowUpAt as string,
      kind: "follow-up",
      label: `Follow up: ${c.name}${c.company ? ` (${c.company})` : ""}`,
      company: c.company,
      targetId: c.targetId,
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Upcoming + overdue dated items, for the dashboard. */
export function upcomingDeadlines(withinDays = 60): DeadlineItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + withinDays);

  return listDeadlines().filter((item) => {
    const d = new Date(`${item.date}T00:00:00`);
    return d <= horizon; // include overdue (past) and anything up to the horizon
  });
}
