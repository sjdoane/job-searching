import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Career tracks Sam is applying to. Kept as a plain string union (not an enum
 * table) for simplicity — these rarely change.
 */
export const TRACKS = ["pm", "quant", "mbb", "other"] as const;
export type Track = (typeof TRACKS)[number];

/**
 * Application pipeline stages, in rough chronological order. Used for the
 * tracker board and filtering.
 */
export const STATUSES = [
  "lead", // found it, not yet acting
  "researching", // reading up, prepping
  "networking", // reaching out for a referral
  "applied", // submitted
  "assessment", // OA / case / game in progress
  "interview", // phone/onsite stage
  "offer",
  "rejected",
  "archived",
] as const;
export type Status = (typeof STATUSES)[number];

/** The main tracker row: one role at one company that Sam is targeting. */
export const targets = sqliteTable("targets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  role: text("role"),
  track: text("track").notNull().default("other"),
  location: text("location"),
  source: text("source"), // greenhouse | lever | ashby | github | web | manual ...
  url: text("url"),
  status: text("status").notNull().default("lead"),
  priority: integer("priority").notNull().default(2), // 1 = high, 2 = med, 3 = low
  // Date-only fields stored as ISO "YYYY-MM-DD" strings for easy <input type=date>.
  opensAt: text("opens_at"), // when applications open ("apply week one of open")
  deadline: text("deadline"),
  appliedAt: text("applied_at"),
  compNotes: text("comp_notes"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Outreach pipeline stages for a networking contact. */
export const OUTREACH_STAGES = [
  "to_contact", // identified, not yet reached out
  "reached_out", // sent an intro / referral request
  "replied", // they responded
  "meeting", // call / coffee chat scheduled or done
  "referred", // they referred you / put you forward
  "archived",
] as const;
export type OutreachStage = (typeof OUTREACH_STAGES)[number];

/** Networking contacts, optionally linked to a target. */
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetId: integer("target_id").references(() => targets.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  title: text("title"),
  company: text("company"),
  email: text("email"),
  linkedin: text("linkedin"),
  relationship: text("relationship"), // alum, recruiter, referral, friend ...
  outreachStage: text("outreach_stage").notNull().default("to_contact"),
  lastContactedAt: text("last_contacted_at"),
  nextFollowUpAt: text("next_follow_up_at"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Assessments/interviews tied to a target: OAs, cases, games, onsites. */
export const ASSESSMENT_TYPES = [
  "oa", // online assessment / coding test
  "case", // consulting case
  "game", // pymetrics / Imbellus-style
  "phone",
  "onsite",
  "other",
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const assessments = sqliteTable("assessments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetId: integer("target_id")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("other"),
  title: text("title"),
  dueAt: text("due_at"),
  status: text("status").notNull().default("pending"), // pending | scheduled | done
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Maps a deadline item (stable key) to the Google Calendar event it created, so
 * one-way sync can UPDATE instead of duplicating. See lib/google/calendar.ts.
 */
export const calendarLinks = sqliteTable("calendar_links", {
  itemKey: text("item_key").primaryKey(),
  googleEventId: text("google_event_id").notNull(),
  summary: text("summary"),
  syncedAt: integer("synced_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type CalendarLink = typeof calendarLinks.$inferSelect;

export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Assessment = typeof assessments.$inferSelect;
export type NewAssessment = typeof assessments.$inferInsert;
