"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createTargetAction,
  deleteTargetAction,
  setTargetStatusAction,
  updateTargetAction,
} from "@/app/actions";
import { Badge } from "@/components/ui";
import { TargetForm, type TargetFormValues } from "@/components/target-form";
import { formatDate, relativeDeadline, urgencyClass } from "@/lib/dates";
import {
  STATUS_COLORS,
  STATUS_OPTIONS,
  TRACK_COLORS,
  TRACK_OPTIONS,
  labelFor,
} from "@/lib/labels";

export interface BoardTarget {
  id: number;
  company: string;
  role: string | null;
  track: string;
  status: string;
  priority: number;
  location: string | null;
  url: string | null;
  opensAt: string | null;
  deadline: string | null;
  appliedAt: string | null;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function StatusSelect({ target }: { target: BoardTarget }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={target.status}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("id", String(target.id));
        fd.set("status", e.target.value);
        startTransition(() => {
          void setTargetStatusAction(fd);
        });
      }}
      className={`rounded-full px-2 py-1 text-xs font-medium ${
        STATUS_COLORS[target.status] ?? "bg-slate-100 text-slate-700"
      } ${pending ? "opacity-50" : ""}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TrackerBoard({ targets }: { targets: BoardTarget[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<BoardTarget | null>(null);
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      trackFilter === "all"
        ? targets
        : targets.filter((t) => t.track === trackFilter),
    [targets, trackFilter],
  );

  function remove(id: number) {
    if (!confirm("Delete this target? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    startTransition(() => {
      void deleteTargetAction(fd);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setAdding(true)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add target
        </button>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setTrackFilter("all")}
            className={`rounded-md px-3 py-1.5 text-sm ${
              trackFilter === "all"
                ? "bg-slate-200 font-medium text-slate-900"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All
          </button>
          {TRACK_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setTrackFilter(o.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                trackFilter === o.value
                  ? "bg-slate-200 font-medium text-slate-900"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="font-medium text-slate-700">No targets yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add companies/roles here, or pull them in from the Search page.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company / Role</th>
                <th className="px-4 py-3 font-medium">Track</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {t.url ? (
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {t.company}
                        </a>
                      ) : (
                        t.company
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.role ?? "—"}
                      {t.location ? ` · ${t.location}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        TRACK_COLORS[t.track] ?? TRACK_COLORS.other
                      }
                    >
                      {labelFor(TRACK_OPTIONS, t.track)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect target={t} />
                  </td>
                  <td className="px-4 py-3">
                    {t.deadline ? (
                      <div>
                        <div>{formatDate(t.deadline)}</div>
                        <div className={`text-xs ${urgencyClass(t.deadline)}`}>
                          {relativeDeadline(t.deadline)}
                        </div>
                      </div>
                    ) : t.opensAt ? (
                      <div className="text-xs text-emerald-600">
                        Opens {formatDate(t.opensAt)}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(t)}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(t.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding ? (
        <Modal title="Add target" onClose={() => setAdding(false)}>
          <TargetForm
            action={createTargetAction}
            onDone={() => setAdding(false)}
            submitLabel="Add target"
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit target" onClose={() => setEditing(null)}>
          <TargetForm
            action={updateTargetAction}
            target={editing as TargetFormValues}
            onDone={() => setEditing(null)}
            submitLabel="Save changes"
          />
        </Modal>
      ) : null}
    </div>
  );
}
