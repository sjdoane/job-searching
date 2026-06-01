import "server-only";

import { asc, desc, eq, isNotNull } from "drizzle-orm";

import {
  assessments,
  contacts,
  db,
  prepItems,
  targets,
  type NewAssessment,
  type NewContact,
  type NewPrepItem,
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

export interface ContactWithFirm {
  contact: typeof contacts.$inferSelect;
  firmCompany: string | null;
  firmTrack: string | null;
}

/** All contacts joined with the firm (target) they're linked to. */
export function listContactsWithFirm(): ContactWithFirm[] {
  const rows = db
    .select({
      contact: contacts,
      firmCompany: targets.company,
      firmTrack: targets.track,
    })
    .from(contacts)
    .leftJoin(targets, eq(contacts.targetId, targets.id))
    .orderBy(desc(contacts.updatedAt))
    .all();
  return rows as ContactWithFirm[];
}

/** Lightweight {id, company} list for linking a contact to a tracked firm. */
export function listFirmsForPicker() {
  return db
    .select({ id: targets.id, company: targets.company, track: targets.track })
    .from(targets)
    .orderBy(asc(targets.company))
    .all();
}

/** Contacts with a follow-up due within `withinDays` (includes overdue). */
export function dueFollowUps(withinDays = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + withinDays);
  return listContactsWithFirm().filter((c) => {
    const d = c.contact.nextFollowUpAt;
    if (!d) return false;
    return new Date(`${d}T00:00:00`) <= horizon;
  });
}

export function setContactStage(id: number, outreachStage: string) {
  return db
    .update(contacts)
    .set({ outreachStage, updatedAt: now() })
    .where(eq(contacts.id, id))
    .returning()
    .get();
}

export function getContactWithFirm(id: number): ContactWithFirm | undefined {
  const row = db
    .select({
      contact: contacts,
      firmCompany: targets.company,
      firmTrack: targets.track,
    })
    .from(contacts)
    .leftJoin(targets, eq(contacts.targetId, targets.id))
    .where(eq(contacts.id, id))
    .get();
  return row as ContactWithFirm | undefined;
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

export function setAssessmentStatus(id: number, status: string) {
  return db
    .update(assessments)
    .set({ status, updatedAt: now() })
    .where(eq(assessments.id, id))
    .returning()
    .get();
}

export interface AssessmentWithFirm {
  assessment: typeof assessments.$inferSelect;
  firmCompany: string | null;
  firmTrack: string | null;
}

/** All assessments joined with their firm (target), soonest due first. */
export function listAssessmentsWithFirm(): AssessmentWithFirm[] {
  const rows = db
    .select({
      assessment: assessments,
      firmCompany: targets.company,
      firmTrack: targets.track,
    })
    .from(assessments)
    .leftJoin(targets, eq(assessments.targetId, targets.id))
    .orderBy(asc(assessments.status), asc(assessments.dueAt))
    .all();
  return rows as AssessmentWithFirm[];
}

// ---------------------------------------------------------------------------
// Prep items (interview/OA readiness checklist; cross-firm)
// ---------------------------------------------------------------------------

export function listPrepItems() {
  return db
    .select()
    .from(prepItems)
    .orderBy(asc(prepItems.sortOrder), asc(prepItems.id))
    .all();
}

export function createPrepItem(data: NewPrepItem) {
  const ts = now();
  return db
    .insert(prepItems)
    .values({ ...data, createdAt: ts, updatedAt: ts })
    .returning()
    .get();
}

/** Bulk insert (used to seed a starter checklist for a category). */
export function createPrepItems(rows: NewPrepItem[]) {
  if (rows.length === 0) return [];
  const ts = now();
  return db
    .insert(prepItems)
    .values(rows.map((r) => ({ ...r, createdAt: ts, updatedAt: ts })))
    .returning()
    .all();
}

export function updatePrepItem(id: number, data: Partial<NewPrepItem>) {
  return db
    .update(prepItems)
    .set({ ...data, updatedAt: now() })
    .where(eq(prepItems.id, id))
    .returning()
    .get();
}

export function deletePrepItem(id: number) {
  return db.delete(prepItems).where(eq(prepItems.id, id)).run();
}

/** How many prep items exist in a category (to gate the "load starter" button). */
export function countPrepItems(category: string) {
  return db
    .select({ id: prepItems.id })
    .from(prepItems)
    .where(eq(prepItems.category, category))
    .all().length;
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
