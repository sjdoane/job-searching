import Link from "next/link";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, relativeDeadline, urgencyClass } from "@/lib/dates";
import {
  DEADLINE_KIND_META,
  STATUS_OPTIONS,
  TRACK_COLORS,
  TRACK_OPTIONS,
} from "@/lib/labels";
import { listTargets, upcomingDeadlines } from "@/lib/tracker";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const targets = listTargets();
  const deadlines = upcomingDeadlines(60);

  const activeStatuses = new Set([
    "lead",
    "researching",
    "networking",
    "applied",
    "assessment",
    "interview",
  ]);
  const active = targets.filter((t) => activeStatuses.has(t.status));
  const applied = targets.filter((t) =>
    ["applied", "assessment", "interview", "offer"].includes(t.status),
  );
  const interviews = targets.filter((t) =>
    ["assessment", "interview"].includes(t.status),
  );

  const byTrack = TRACK_OPTIONS.map((o) => ({
    ...o,
    count: targets.filter((t) => t.track === o.value).length,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your job search at a glance. Timing is the #1 controllable lever — apply week one of open."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active targets" value={active.length} />
        <Stat label="Applied" value={applied.length} />
        <Stat label="In interviews" value={interviews.length} />
        <Stat label="Total tracked" value={targets.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Upcoming & overdue (next 60 days)</h2>
            <Link
              href="/calendar"
              className="text-sm text-indigo-600 hover:underline"
            >
              Full calendar →
            </Link>
          </div>
          {deadlines.length === 0 ? (
            <EmptyState
              title="Nothing dated yet"
              hint="Add open dates and deadlines to your targets so they surface here."
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100">
                {deadlines.slice(0, 12).map((d, i) => {
                  const meta =
                    DEADLINE_KIND_META[d.kind] ?? DEADLINE_KIND_META.deadline;
                  return (
                    <li
                      key={`${d.date}-${d.kind}-${i}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Badge className={meta.color}>{meta.label}</Badge>
                      <span className="flex-1 text-sm">{d.label}</span>
                      <span className="text-sm text-slate-500">
                        {formatDate(d.date)}
                      </span>
                      <span
                        className={`w-28 text-right text-xs ${urgencyClass(d.date)}`}
                      >
                        {relativeDeadline(d.date)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-2 font-semibold">By track</h2>
            <Card className="space-y-2">
              {byTrack.map((t) => (
                <div key={t.value} className="flex items-center justify-between">
                  <Badge className={TRACK_COLORS[t.value] ?? TRACK_COLORS.other}>
                    {t.label}
                  </Badge>
                  <span className="text-sm font-medium">{t.count}</span>
                </div>
              ))}
            </Card>
          </div>

          <div>
            <h2 className="mb-2 font-semibold">By stage</h2>
            <Card className="space-y-1.5">
              {STATUS_OPTIONS.filter((s) =>
                [
                  "applied",
                  "assessment",
                  "interview",
                  "offer",
                  "rejected",
                ].includes(s.value),
              ).map((s) => (
                <div
                  key={s.value}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{s.label}</span>
                  <span className="font-medium">
                    {targets.filter((t) => t.status === s.value).length}
                  </span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Start by adding your targets"
            hint="Go to the Tracker to add companies, or use Search to pull in new-grad roles."
          />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Card>
  );
}
