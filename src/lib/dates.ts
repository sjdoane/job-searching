/** Pure date helpers. ISO date strings are "YYYY-MM-DD". */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True only for a real calendar date in strict YYYY-MM-DD form. */
export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Returns the string if it's a valid ISO date, else null (for sanitizing input). */
export function validISODateOrNull(s: string | null | undefined): string | null {
  return s && isValidISODate(s) ? s : null;
}

/** Whole days from today until the given ISO date. Negative = overdue. */
export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${iso}T00:00:00`);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeDeadline(iso: string): string {
  const n = daysUntil(iso);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${Math.abs(n)} days overdue`;
  return `in ${n} days`;
}

/** Tailwind text color reflecting urgency of an upcoming date. */
export function urgencyClass(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return "text-rose-600";
  if (n <= 7) return "text-rose-600";
  if (n <= 21) return "text-amber-600";
  return "text-slate-500";
}
