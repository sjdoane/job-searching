import Link from "next/link";

import { TrackerBoard, type BoardTarget } from "@/components/tracker-board";
import { PageHeader } from "@/components/ui";
import { listTargets } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function TrackerPage() {
  const targets = listTargets();
  const board: BoardTarget[] = targets.map((t) => ({
    id: t.id,
    company: t.company,
    role: t.role,
    track: t.track,
    status: t.status,
    priority: t.priority,
    location: t.location,
    url: t.url,
    opensAt: t.opensAt,
    deadline: t.deadline,
    appliedAt: t.appliedAt,
  }));

  return (
    <div>
      <PageHeader
        title="Tracker"
        subtitle="Every company and role you're targeting across all three tracks. This is your watchlist."
        action={
          <div className="flex gap-2">
            <a
              href="/api/tracker/export"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </a>
            <Link
              href="/tracker/import"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Import CSV
            </Link>
          </div>
        }
      />
      <TrackerBoard targets={board} />
    </div>
  );
}
