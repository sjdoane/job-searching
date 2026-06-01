"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCsv } from "@/lib/csv";
import { validISODateOrNull } from "@/lib/dates";
import {
  createContact,
  createTarget,
  deleteContact,
  deleteTarget,
  targetExistsByUrl,
  updateContact,
  updateTarget,
} from "@/lib/tracker";
import type { NewTarget } from "@/lib/db";

function str(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? undefined : trimmed;
}

function nullableStr(form: FormData, key: string): string | null {
  return str(form, key) ?? null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/tracker");
  revalidatePath("/calendar");
  revalidatePath("/search");
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

function parsePriority(form: FormData): number {
  const p = Number(str(form, "priority"));
  return Number.isFinite(p) && p >= 1 && p <= 3 ? p : 2;
}

function targetFromForm(form: FormData): NewTarget {
  return {
    company: str(form, "company") ?? "Untitled",
    role: nullableStr(form, "role"),
    track: str(form, "track") ?? "other",
    location: nullableStr(form, "location"),
    source: nullableStr(form, "source"),
    url: nullableStr(form, "url"),
    status: str(form, "status") ?? "lead",
    priority: parsePriority(form),
    opensAt: validISODateOrNull(str(form, "opensAt")),
    deadline: validISODateOrNull(str(form, "deadline")),
    appliedAt: validISODateOrNull(str(form, "appliedAt")),
    compNotes: nullableStr(form, "compNotes"),
    notes: nullableStr(form, "notes"),
  };
}

export async function createTargetAction(form: FormData) {
  createTarget(targetFromForm(form));
  revalidateAll();
}

export async function updateTargetAction(form: FormData) {
  const id = Number(form.get("id"));
  if (!id) return;
  updateTarget(id, targetFromForm(form));
  revalidateAll();
}

export async function deleteTargetAction(form: FormData) {
  const id = Number(form.get("id"));
  if (!id) return;
  deleteTarget(id);
  revalidateAll();
}

/** Quick status change from the tracker board without opening the full editor. */
export async function setTargetStatusAction(form: FormData) {
  const id = Number(form.get("id"));
  const status = str(form, "status");
  if (!id || !status) return;
  const patch: Partial<NewTarget> = { status };
  if (status === "applied") patch.appliedAt = new Date().toISOString().slice(0, 10);
  updateTarget(id, patch);
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function createContactAction(form: FormData) {
  const targetIdRaw = str(form, "targetId");
  createContact({
    targetId: targetIdRaw ? Number(targetIdRaw) : null,
    name: str(form, "name") ?? "Unnamed",
    title: nullableStr(form, "title"),
    company: nullableStr(form, "company"),
    email: nullableStr(form, "email"),
    linkedin: nullableStr(form, "linkedin"),
    relationship: nullableStr(form, "relationship"),
    lastContactedAt: validISODateOrNull(str(form, "lastContactedAt")),
    nextFollowUpAt: validISODateOrNull(str(form, "nextFollowUpAt")),
    notes: nullableStr(form, "notes"),
  });
  revalidateAll();
}

export async function updateContactAction(form: FormData) {
  const id = Number(form.get("id"));
  if (!id) return;
  const targetIdRaw = str(form, "targetId");
  updateContact(id, {
    targetId: targetIdRaw ? Number(targetIdRaw) : null,
    name: str(form, "name"),
    title: nullableStr(form, "title"),
    company: nullableStr(form, "company"),
    email: nullableStr(form, "email"),
    linkedin: nullableStr(form, "linkedin"),
    relationship: nullableStr(form, "relationship"),
    lastContactedAt: validISODateOrNull(str(form, "lastContactedAt")),
    nextFollowUpAt: validISODateOrNull(str(form, "nextFollowUpAt")),
    notes: nullableStr(form, "notes"),
  });
  revalidateAll();
}

export async function deleteContactAction(form: FormData) {
  const id = Number(form.get("id"));
  if (!id) return;
  deleteContact(id);
  revalidateAll();
}

/** Promote a search result into the tracker as a new lead (de-duped by URL). */
export async function addPostingToTrackerAction(form: FormData) {
  const url = str(form, "url") ?? null;
  if (url && targetExistsByUrl(url)) {
    revalidateAll();
    return;
  }
  createTarget({
    company: str(form, "company") ?? "Untitled",
    role: nullableStr(form, "role"),
    track: str(form, "track") ?? "other",
    location: nullableStr(form, "location"),
    source: str(form, "source") ?? "search",
    url,
    status: "lead",
    priority: 2,
  });
  revalidateAll();
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

/**
 * Imports targets from an uploaded CSV. Accepts the columns produced by the
 * export route; unknown columns are ignored and missing ones default. Rows
 * whose posting URL already exists are skipped (de-dupe).
 */
export async function importTargetsAction(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/tracker/import?error=nofile");
  }
  const text = await file.text();
  const records = parseCsv(text);

  let imported = 0;
  let skipped = 0;
  for (const r of records) {
    const company = (r.company ?? "").trim();
    if (!company) {
      skipped++;
      continue;
    }
    const url = (r.url ?? "").trim();
    if (url && targetExistsByUrl(url)) {
      skipped++;
      continue;
    }
    const priority = Number(r.priority);
    createTarget({
      company,
      role: r.role || null,
      track: r.track || "other",
      status: r.status || "lead",
      priority: Number.isFinite(priority) && priority >= 1 ? priority : 2,
      location: r.location || null,
      source: r.source || "csv-import",
      url: url || null,
      opensAt: validISODateOrNull(r.opensAt),
      deadline: validISODateOrNull(r.deadline),
      appliedAt: validISODateOrNull(r.appliedAt),
      compNotes: r.compNotes || null,
      notes: r.notes || null,
    });
    imported++;
  }

  revalidateAll();
  redirect(`/tracker?imported=${imported}&skipped=${skipped}`);
}
