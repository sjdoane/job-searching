"use server";

import { revalidatePath } from "next/cache";

import { validISODateOrNull } from "@/lib/dates";
import {
  extractRecruitingInfo,
  type EmailExtraction,
  type EmailInput,
} from "@/lib/google/email-extract";
import { createTarget } from "@/lib/tracker";

/** Suggest-only: create a tracker lead from a recruiting email the user picked. */
export async function addEmailToTrackerAction(form: FormData) {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  createTarget({
    company: get("company") ?? "Unknown",
    role: get("role"),
    track: "other",
    status: "lead",
    source: "gmail",
    deadline: validISODateOrNull(get("deadline")),
    notes: get("notes"),
  });
  revalidatePath("/tracker");
  revalidatePath("/inbox");
}

/** AI extraction of company/role/deadline/type for a batch of emails. */
export async function extractEmailsAction(
  emails: EmailInput[],
): Promise<EmailExtraction[]> {
  return extractRecruitingInfo(emails);
}
