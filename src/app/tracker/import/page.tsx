import Link from "next/link";

import { importTargetsAction } from "@/app/actions";
import { Card, PageHeader } from "@/components/ui";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Import CSV"
        subtitle="Bulk-add targets from a spreadsheet. Use the same columns as the export."
      />
      <Card>
        {error === "nofile" ? (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            No file selected. Choose a .csv file and try again.
          </p>
        ) : null}
        <form action={importTargetsAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              CSV file
            </label>
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-700"
            />
          </div>
          <p className="text-xs text-slate-500">
            Expected columns: company, role, track, status, priority, location,
            source, url, opensAt, deadline, appliedAt, compNotes, notes. Only
            <span className="font-medium"> company</span> is required. Rows whose
            URL already exists are skipped.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Import
            </button>
            <Link
              href="/tracker"
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Back to tracker
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
