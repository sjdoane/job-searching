import { SettingsIntegrations } from "@/components/settings-integrations";
import { PageHeader } from "@/components/ui";
import { anthropic, hasAnthropic, hasGoogleConfig } from "@/lib/config";
import { connectedEmail, isConnected } from "@/lib/google/tokens";

export const dynamic = "force-dynamic";

const BANNERS: Record<string, { ok: boolean; text: string }> = {
  "1": { ok: true, text: "Google connected." },
  state: { ok: false, text: "Sign-in could not be verified (state mismatch). Try again." },
  exchange: { ok: false, text: "Could not complete Google sign-in. Try again." },
  noconfig: { ok: false, text: "Add Google credentials to .env.local first." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const bannerKey = sp.connected ?? sp.error;
  const banner = bannerKey ? BANNERS[bannerKey] : undefined;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Connect Gmail, Google Calendar, and AI tailoring. All credentials live in your local .env.local and token files — never committed."
      />
      {banner ? (
        <p
          className={`mb-5 rounded-md px-3 py-2 text-sm ${
            banner.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
          }`}
        >
          {banner.text}
        </p>
      ) : null}
      <SettingsIntegrations
        googleConfigured={hasGoogleConfig()}
        googleConnected={isConnected()}
        googleEmail={connectedEmail()}
        anthropicConfigured={hasAnthropic()}
        anthropicModel={anthropic.model}
      />
    </div>
  );
}
