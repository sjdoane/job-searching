"use client";

import { useState, useTransition } from "react";

import {
  disconnectGoogleAction,
  syncCalendarAction,
  type CalendarSyncResponse,
} from "@/app/settings/actions";
import { Card } from "@/components/ui";

export function SettingsIntegrations({
  googleConfigured,
  googleConnected,
  googleEmail,
  anthropicConfigured,
  anthropicModel,
}: {
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
  anthropicConfigured: boolean;
  anthropicModel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [sync, setSync] = useState<CalendarSyncResponse | null>(null);

  function runSync() {
    setSync(null);
    startTransition(async () => setSync(await syncCalendarAction()));
  }

  function disconnect() {
    if (!confirm("Disconnect Google? Your local data stays; this only revokes the stored login.")) return;
    startTransition(async () => {
      await disconnectGoogleAction();
      location.reload();
    });
  }

  return (
    <div className="space-y-6">
      {/* Google */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Google — Gmail + Calendar</h2>
            <p className="mt-1 text-sm text-slate-500">
              Read-only recruiting-mail scanning and one-way calendar sync of your
              deadlines.
            </p>
          </div>
          <StatusPill
            ok={googleConnected}
            warn={googleConfigured && !googleConnected}
            label={
              googleConnected
                ? "Connected"
                : googleConfigured
                  ? "Not connected"
                  : "Not configured"
            }
          />
        </div>

        {!googleConfigured ? (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_ID</code>{" "}
            and{" "}
            <code className="rounded bg-amber-100 px-1">GOOGLE_CLIENT_SECRET</code>{" "}
            to <code className="rounded bg-amber-100 px-1">.env.local</code> (see{" "}
            <code className="rounded bg-amber-100 px-1">.env.example</code> for the
            one-time Google Cloud setup), then restart the dev server.
          </p>
        ) : googleConnected ? (
          <div className="mt-4">
            <p className="text-sm text-slate-600">
              Connected as{" "}
              <span className="font-medium">{googleEmail ?? "your account"}</span>.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={runSync}
                disabled={pending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {pending ? "Syncing…" : "Sync deadlines to Google Calendar"}
              </button>
              <button
                onClick={disconnect}
                disabled={pending}
                className="rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Disconnect
              </button>
            </div>
            {sync ? (
              <p
                className={`mt-3 rounded-md px-3 py-2 text-sm ${
                  sync.ok
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {sync.ok && sync.result
                  ? `Synced ${sync.result.total} item(s): ${sync.result.created} created, ${sync.result.updated} updated${sync.result.failed ? `, ${sync.result.failed} failed` : ""}.`
                  : sync.error}
              </p>
            ) : null}
          </div>
        ) : (
          <a
            href="/api/google/oauth/start"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Connect Google
          </a>
        )}
      </Card>

      {/* Anthropic */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Anthropic — AI résumé tailoring</h2>
            <p className="mt-1 text-sm text-slate-500">
              Powers the optional, truthful bullet-tailoring in the Résumé builder.
            </p>
          </div>
          <StatusPill ok={anthropicConfigured} label={anthropicConfigured ? "Configured" : "Not configured"} />
        </div>
        {anthropicConfigured ? (
          <p className="mt-4 text-sm text-slate-600">
            Using model <code className="rounded bg-slate-100 px-1">{anthropicModel}</code>.
          </p>
        ) : (
          <p className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-800">
            Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code>{" "}
            to <code className="rounded bg-amber-100 px-1">.env.local</code> and
            restart.
          </p>
        )}
      </Card>
    </div>
  );
}

function StatusPill({
  ok,
  warn,
  label,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
}) {
  const cls = ok
    ? "bg-emerald-100 text-emerald-800"
    : warn
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-600";
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
