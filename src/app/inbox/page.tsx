import Link from "next/link";

import { Card, EmptyState, PageHeader } from "@/components/ui";
import { hasGoogleConfig } from "@/lib/config";
import { listRecruitingEmails, type RecruitingEmail } from "@/lib/google/gmail";
import { isConnected } from "@/lib/google/tokens";

import { addEmailToTrackerAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const subtitle =
    "Read-only scan of recent recruiting mail. Suggestions only — nothing is added until you click.";

  if (!hasGoogleConfig() || !isConnected()) {
    return (
      <div>
        <PageHeader title="Recruiting Inbox" subtitle={subtitle} />
        <EmptyState
          title="Connect Google to scan recruiting mail"
          hint="Set it up on the Settings page (Gmail read-only access)."
        />
        <div className="mt-4">
          <Link href="/settings" className="text-sm text-indigo-600 hover:underline">
            Go to Settings →
          </Link>
        </div>
      </div>
    );
  }

  let emails: RecruitingEmail[] = [];
  let error: string | null = null;
  try {
    emails = await listRecruitingEmails(25);
  } catch (e) {
    error = e instanceof Error ? e.message : "Could not read Gmail.";
  }

  return (
    <div>
      <PageHeader title="Recruiting Inbox" subtitle={subtitle} />
      {error ? (
        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error} (Try reconnecting on Settings.)
        </p>
      ) : null}
      {emails.length === 0 && !error ? (
        <EmptyState
          title="No recruiting mail found"
          hint="We scanned the last 120 days for recruiting-related messages."
        />
      ) : (
        <ul className="space-y-3">
          {emails.map((m) => (
            <li key={m.id}>
              <Card>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">
                      {m.subject || "(no subject)"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {m.from} · {m.date}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {m.snippet}
                    </p>
                  </div>
                  <form
                    action={addEmailToTrackerAction}
                    className="flex shrink-0 flex-wrap items-end gap-2 md:w-80"
                  >
                    <label className="text-xs text-slate-500">
                      <span className="mb-0.5 block">Company</span>
                      <input
                        name="company"
                        defaultValue={m.guessCompany}
                        placeholder="Company"
                        className="w-32 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="text-xs text-slate-500">
                      <span className="mb-0.5 block">Role</span>
                      <input
                        name="role"
                        defaultValue={m.subject}
                        className="w-40 rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <input type="hidden" name="notes" value={m.snippet} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      + Add lead
                    </button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
