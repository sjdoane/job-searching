import "server-only";

import { eq } from "drizzle-orm";
import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";

import { calendarLinks, db } from "@/lib/db";
import { listDeadlines, type DeadlineItem } from "@/lib/tracker";
import { getAuthedClient } from "./client";

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Stable key so re-syncing UPDATES the same event instead of duplicating. */
function stableKey(item: DeadlineItem): string {
  return `${item.kind}:${item.targetId ?? item.company ?? "na"}:${item.date}`;
}

function eventBody(item: DeadlineItem, key: string): calendar_v3.Schema$Event {
  return {
    summary: item.label,
    description: `${item.kind}${item.company ? ` · ${item.company}` : ""}\n(Synced from Job Search Command Center)`,
    start: { date: item.date },
    end: { date: nextDay(item.date) },
    transparency: "transparent",
    extendedProperties: { private: { jsccKey: key } },
  };
}

/** Find an existing event by our stable key, so a reset DB doesn't duplicate. */
async function findEventIdByKey(
  cal: calendar_v3.Calendar,
  key: string,
): Promise<string | null> {
  try {
    const res = await cal.events.list({
      calendarId: "primary",
      privateExtendedProperty: [`jsccKey=${key}`],
      maxResults: 1,
      showDeleted: false,
    });
    return res.data.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
}

/**
 * One-way push of every dated tracker item (open dates, deadlines, assessment
 * due dates, contact follow-ups) into the user's primary Google Calendar.
 * Idempotent: a stored item-key -> event-id mapping turns re-syncs into updates.
 */
export async function syncCalendarDeadlines(): Promise<SyncResult> {
  const client = getAuthedClient();
  const cal = google.calendar({ version: "v3", auth: client });
  const items = listDeadlines();

  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const item of items) {
    const key = stableKey(item);
    const body = eventBody(item, key);
    const link = db
      .select()
      .from(calendarLinks)
      .where(eq(calendarLinks.itemKey, key))
      .get();

    // Resolve the target event id: local mapping first, else reconcile against
    // Google by our stable key (covers a reset/lost local DB).
    let eventId = link?.googleEventId ?? null;
    if (!eventId) eventId = await findEventIdByKey(cal, key);

    try {
      if (eventId) {
        try {
          await cal.events.patch({
            calendarId: "primary",
            eventId,
            requestBody: body,
          });
          updated++;
        } catch {
          // Event was deleted in Google — recreate.
          const res = await cal.events.insert({
            calendarId: "primary",
            requestBody: body,
          });
          eventId = res.data.id ?? "";
          created++;
        }
      } else {
        const res = await cal.events.insert({
          calendarId: "primary",
          requestBody: body,
        });
        eventId = res.data.id ?? "";
        created++;
      }

      // Persist (or refresh) the mapping.
      if (link) {
        db.update(calendarLinks)
          .set({ googleEventId: eventId, summary: item.label, syncedAt: new Date() })
          .where(eq(calendarLinks.itemKey, key))
          .run();
      } else {
        db.insert(calendarLinks)
          .values({ itemKey: key, googleEventId: eventId, summary: item.label })
          .run();
      }
    } catch {
      failed++;
    }
  }

  return { total: items.length, created, updated, failed };
}
