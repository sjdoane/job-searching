/**
 * UI-facing constants and labels. Pure data, safe to import in client
 * components (does NOT pull in the DB layer). Keep the keys aligned with the
 * string unions in src/lib/db/schema.ts.
 */

export const TRACK_OPTIONS = [
  { value: "pm", label: "Product / PM" },
  { value: "quant", label: "Quant" },
  { value: "mbb", label: "Consulting (MBB)" },
  { value: "other", label: "Other" },
] as const;

export const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "researching", label: "Researching" },
  { value: "networking", label: "Networking" },
  { value: "applied", label: "Applied" },
  { value: "assessment", label: "Assessment" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: 1, label: "High" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Low" },
] as const;

export const ASSESSMENT_TYPE_OPTIONS = [
  { value: "oa", label: "Online Assessment" },
  { value: "case", label: "Case" },
  { value: "game", label: "Game / Sim" },
  { value: "phone", label: "Phone Screen" },
  { value: "onsite", label: "Onsite / Final" },
  { value: "other", label: "Other" },
] as const;

export const ASSESSMENT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "done", label: "Done" },
] as const;

export function labelFor(
  options: ReadonlyArray<{ value: string | number; label: string }>,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return options.find((o) => o.value === value)?.label ?? String(value);
}

export const TRACK_COLORS: Record<string, string> = {
  pm: "bg-sky-100 text-sky-800 border-sky-200",
  quant: "bg-violet-100 text-violet-800 border-violet-200",
  mbb: "bg-amber-100 text-amber-800 border-amber-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export const STATUS_COLORS: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700",
  researching: "bg-slate-100 text-slate-700",
  networking: "bg-blue-100 text-blue-800",
  applied: "bg-indigo-100 text-indigo-800",
  assessment: "bg-amber-100 text-amber-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-700",
  archived: "bg-slate-100 text-slate-500",
};

export const TASK_KIND_OPTIONS = [
  { value: "apply", label: "Apply" },
  { value: "network", label: "Network" },
  { value: "prep", label: "Prep" },
  { value: "study", label: "Study" },
  { value: "admin", label: "Admin" },
  { value: "todo", label: "To-do" },
] as const;

export const TASK_KIND_COLORS: Record<string, string> = {
  apply: "bg-rose-100 text-rose-800",
  network: "bg-blue-100 text-blue-800",
  prep: "bg-amber-100 text-amber-800",
  study: "bg-violet-100 text-violet-800",
  admin: "bg-slate-100 text-slate-700",
  todo: "bg-slate-100 text-slate-700",
};

export const GOAL_HORIZON_OPTIONS = [
  { value: "short", label: "Short-term" },
  { value: "medium", label: "Medium-term" },
  { value: "long", label: "Long-term" },
] as const;

export const OUTREACH_STAGE_OPTIONS = [
  { value: "to_contact", label: "To contact" },
  { value: "reached_out", label: "Reached out" },
  { value: "replied", label: "Replied" },
  { value: "meeting", label: "Meeting" },
  { value: "referred", label: "Referred" },
  { value: "archived", label: "Archived" },
] as const;

export const OUTREACH_STAGE_COLORS: Record<string, string> = {
  to_contact: "bg-slate-100 text-slate-700",
  reached_out: "bg-blue-100 text-blue-800",
  replied: "bg-indigo-100 text-indigo-800",
  meeting: "bg-purple-100 text-purple-800",
  referred: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-100 text-slate-500",
};

export const RELATIONSHIP_OPTIONS = [
  { value: "alum", label: "USC Alum" },
  { value: "recruiter", label: "Recruiter" },
  { value: "referral", label: "Referral" },
  { value: "employee", label: "Employee" },
  { value: "friend", label: "Friend / Personal" },
  { value: "other", label: "Other" },
] as const;

export const OUTREACH_KIND_OPTIONS = [
  { value: "cold_intro", label: "Cold intro (alum/employee)" },
  { value: "referral_request", label: "Referral request" },
  { value: "coffee_chat", label: "Coffee chat / call ask" },
  { value: "follow_up", label: "Follow-up nudge" },
  { value: "thank_you", label: "Thank-you note" },
] as const;

/**
 * Application-answer types for the AI Application Assistant. The union derived
 * here is the single source of truth — both the client UI and the server-only
 * assistant module import `ApplicationKind` from this file.
 */
export const APPLICATION_KIND_OPTIONS = [
  { value: "why_firm", label: "“Why this firm?”" },
  { value: "why_role", label: "“Why this role?” / fit" },
  { value: "short_answer", label: "Short-answer question" },
  { value: "cover_letter", label: "Cover letter" },
] as const;

export type ApplicationKind = (typeof APPLICATION_KIND_OPTIONS)[number]["value"];

export const DEADLINE_KIND_META: Record<
  string,
  { label: string; color: string }
> = {
  opens: { label: "Opens", color: "bg-emerald-100 text-emerald-800" },
  deadline: { label: "Deadline", color: "bg-rose-100 text-rose-800" },
  assessment: { label: "Assessment", color: "bg-amber-100 text-amber-800" },
  "follow-up": { label: "Follow-up", color: "bg-blue-100 text-blue-800" },
};
