import Link from "next/link";

import { InboxList } from "@/components/inbox-list";
import { EmptyState, PageHeader } from "@/components/ui";
import { hasAnthropic, hasGoogleConfig } from "@/lib/config";
import { listRecruitingEmails, type RecruitingEmail } from "@/lib/google/gmail";
import { isConnected } from "@/lib/google/tokens";

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
        <InboxList emails={emails} aiEnabled={hasAnthropic()} />
      )}
    </div>
  );
}
