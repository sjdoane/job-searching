"use client";

import { useState } from "react";

import {
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  TRACK_OPTIONS,
} from "@/lib/labels";

export interface TargetFormValues {
  id?: number;
  company?: string | null;
  role?: string | null;
  track?: string | null;
  status?: string | null;
  priority?: number | null;
  location?: string | null;
  source?: string | null;
  url?: string | null;
  opensAt?: string | null;
  deadline?: string | null;
  appliedAt?: string | null;
  compNotes?: string | null;
  notes?: string | null;
}

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "block text-xs font-medium text-slate-600 mb-1";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function TargetForm({
  action,
  target,
  onDone,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => Promise<void>;
  target?: TargetFormValues;
  onDone?: () => void;
  submitLabel?: string;
}) {
  const [pending, setPending] = useState(false);

  async function handle(formData: FormData) {
    setPending(true);
    try {
      await action(formData);
      onDone?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handle} className="space-y-4">
      {target?.id ? <input type="hidden" name="id" value={target.id} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Company *">
          <input
            name="company"
            required
            defaultValue={target?.company ?? ""}
            className={inputClass}
            placeholder="Jane Street"
          />
        </Field>
        <Field label="Role">
          <input
            name="role"
            defaultValue={target?.role ?? ""}
            className={inputClass}
            placeholder="Quant Trader — New Grad"
          />
        </Field>
        <Field label="Track">
          <select
            name="track"
            defaultValue={target?.track ?? "other"}
            className={inputClass}
          >
            {TRACK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            name="status"
            defaultValue={target?.status ?? "lead"}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            name="priority"
            defaultValue={String(target?.priority ?? 2)}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            name="location"
            defaultValue={target?.location ?? ""}
            className={inputClass}
            placeholder="NYC / Remote"
          />
        </Field>
        <Field label="Source">
          <input
            name="source"
            defaultValue={target?.source ?? ""}
            className={inputClass}
            placeholder="greenhouse / referral / web"
          />
        </Field>
        <Field label="Posting URL">
          <input
            name="url"
            type="url"
            defaultValue={target?.url ?? ""}
            className={inputClass}
            placeholder="https://..."
          />
        </Field>
        <Field label="Applications open">
          <input
            name="opensAt"
            type="date"
            defaultValue={target?.opensAt ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Deadline">
          <input
            name="deadline"
            type="date"
            defaultValue={target?.deadline ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Applied on">
          <input
            name="appliedAt"
            type="date"
            defaultValue={target?.appliedAt ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Comp notes">
          <input
            name="compNotes"
            defaultValue={target?.compNotes ?? ""}
            className={inputClass}
            placeholder="$120k base + bonus"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          name="notes"
          defaultValue={target?.notes ?? ""}
          rows={3}
          className={inputClass}
          placeholder="Referral via USC alum; OA expected; apply week one."
        />
      </Field>

      <div className="flex justify-end gap-2">
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
