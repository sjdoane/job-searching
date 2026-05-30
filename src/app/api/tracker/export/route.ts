import { toCsv } from "@/lib/csv";
import { listTargets } from "@/lib/tracker";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "company",
  "role",
  "track",
  "status",
  "priority",
  "location",
  "source",
  "url",
  "opensAt",
  "deadline",
  "appliedAt",
  "compNotes",
  "notes",
];

export function GET() {
  const rows = listTargets();
  const csv = toCsv(rows as unknown as Record<string, unknown>[], COLUMNS);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="job-tracker-${stamp}.csv"`,
    },
  });
}
