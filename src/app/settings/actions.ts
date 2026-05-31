"use server";

import { revalidatePath } from "next/cache";

import { syncCalendarDeadlines, type SyncResult } from "@/lib/google/calendar";
import { clearTokens } from "@/lib/google/tokens";

export async function disconnectGoogleAction(): Promise<void> {
  clearTokens();
  revalidatePath("/settings");
  revalidatePath("/inbox");
}

export interface CalendarSyncResponse {
  ok: boolean;
  result?: SyncResult;
  error?: string;
}

export async function syncCalendarAction(): Promise<CalendarSyncResponse> {
  try {
    const result = await syncCalendarDeadlines();
    revalidatePath("/calendar");
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Calendar sync failed.",
    };
  }
}
