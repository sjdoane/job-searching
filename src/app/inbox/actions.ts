"use server";

import { revalidatePath } from "next/cache";

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
    notes: get("notes"),
  });
  revalidatePath("/tracker");
  revalidatePath("/inbox");
}
