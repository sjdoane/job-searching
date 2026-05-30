import Link from "next/link";

import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate, relativeDeadline, todayISO, urgencyClass } from "@/lib/dates";
import { DEADLINE_KIND_META } from "@/lib/labels";
import { listDeadlines, type DeadlineItem } from "@/lib/tracker";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = sp.m ? Number(sp.m) - 1 : now.getMonth(); // 0-indexed

  const deadlines = listDeadlines();
  const byDate = new Map<string, DeadlineItem[]>();
  for (const d of deadlines) {
    const list = byDate.get(d.date) ?? [];
    list.push(d);
    byDate.set(d.date, list);
  }

  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayISO();

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ iso: `${year}-${pad(month + 1)}-${pad(day)}`, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = month === 0 ? { y: year - 1, m: 12 } : { y: year, m: month };
  const nextMonth =
    month === 11 ? { y: year + 1, m: 1 } : { y: year, m: month + 2 };

  const upcoming = deadlines.filter((d) => d.date >= today).slice(0, 25);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Open dates, deadlines, assessments, and follow-ups across every target."
      />

      <Card className="mb-6 p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <Link
            href={`/calendar?y=${prevMonth.y}&m=${prevMonth.m}`}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            ← Prev
          </Link>
          <h2 className="font-semibold">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Link
            href={`/calendar?y=${nextMonth.y}&m=${nextMonth.m}`}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Next →
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={idx}
                  className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50"
                />
              );
            }
            const items = byDate.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            return (
              <div
                key={idx}
                className="min-h-24 border-b border-r border-slate-100 p-1.5"
              >
                <div
                  className={`mb-1 text-xs ${
                    isToday
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
                      : "text-slate-400"
                  }`}
                >
                  {cell.day}
                </div>
                <div className="space-y-1">
                  {items.map((it, i) => {
                    const meta =
                      DEADLINE_KIND_META[it.kind] ??
                      DEADLINE_KIND_META.deadline;
                    return (
                      <div
                        key={i}
                        title={it.label}
                        className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${meta.color}`}
                      >
                        {it.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <h2 className="mb-2 font-semibold">Upcoming</h2>
      {upcoming.length === 0 ? (
        <EmptyState
          title="Nothing scheduled ahead"
          hint="Add open dates and deadlines to targets, or assessment due dates."
        />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {upcoming.map((d, i) => {
              const meta =
                DEADLINE_KIND_META[d.kind] ?? DEADLINE_KIND_META.deadline;
              return (
                <li
                  key={`${d.date}-${i}`}
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
  );
}
