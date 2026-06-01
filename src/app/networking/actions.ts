"use server";

import { revalidatePath } from "next/cache";

import { validISODateOrNull } from "@/lib/dates";
import {
  draftOutreach,
  type OutreachDraft,
  type OutreachKind,
} from "@/lib/networking/outreach";
import {
  createContact,
  deleteContact,
  getContactWithFirm,
  getTarget,
  setContactStage,
  updateContact,
} from "@/lib/tracker";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function revalidate() {
  revalidatePath("/networking");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function saveContactAction(form: FormData) {
  const id = Number(form.get("id")) || 0;
  const targetIdRaw = str(form, "targetId");
  const data = {
    targetId: targetIdRaw ? Number(targetIdRaw) : null,
    name: str(form, "name") ?? "Unnamed",
    title: str(form, "title"),
    company: str(form, "company"),
    email: str(form, "email"),
    linkedin: str(form, "linkedin"),
    relationship: str(form, "relationship"),
    outreachStage: str(form, "outreachStage") ?? "to_contact",
    lastContactedAt: validISODateOrNull(str(form, "lastContactedAt")),
    nextFollowUpAt: validISODateOrNull(str(form, "nextFollowUpAt")),
    notes: str(form, "notes"),
  };
  if (id) updateContact(id, data);
  else createContact(data);
  revalidate();
}

export async function deleteContactAction(form: FormData) {
  const id = Number(form.get("id"));
  if (!id) return;
  deleteContact(id);
  revalidate();
}

export async function setStageAction(form: FormData) {
  const id = Number(form.get("id"));
  const stage = str(form, "outreachStage");
  if (!id || !stage) return;
  setContactStage(id, stage);
  revalidate();
}

export interface DraftOutreachInput {
  contactId: number;
  kind: OutreachKind;
  extra?: string;
}

export async function draftOutreachAction(
  input: DraftOutreachInput,
): Promise<OutreachDraft> {
  const cwf = getContactWithFirm(input.contactId);
  if (!cwf) throw new Error("Contact not found.");
  const c = cwf.contact;
  const firmNotes =
    c.targetId != null ? (getTarget(c.targetId)?.notes ?? null) : null;
  return draftOutreach({
    contactName: c.name,
    contactTitle: c.title,
    contactRelationship: c.relationship,
    firmName: cwf.firmCompany ?? c.company ?? "the firm",
    firmTrack: cwf.firmTrack,
    firmNotes,
    kind: input.kind,
    extra: input.extra?.trim() || null,
  });
}
