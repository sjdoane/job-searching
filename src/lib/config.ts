import "server-only";

/**
 * Central, server-only access to environment configuration. Never import this
 * into a client component — it would leak secrets into the browser bundle.
 * Features gate gracefully on whether their keys are present.
 */

export const anthropic = {
  apiKey: (process.env.ANTHROPIC_API_KEY ?? "").trim(),
  model: (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6").trim(),
  /**
   * The Application Writer pipeline (src/lib/apply/writer-pipeline.ts) is a
   * deliberate, multi-pass draft → judge → synthesize → polish loop where
   * quality matters far more than per-run cost, so it defaults to the most
   * capable model (Opus 4.8) regardless of the cheaper default the other AI
   * surfaces use. Override with ANTHROPIC_WRITER_MODEL if needed.
   */
  writerModel: (process.env.ANTHROPIC_WRITER_MODEL ?? "claude-opus-4-8").trim(),
  /**
   * Reasoning effort for the writer pipeline ("high" | "xhigh" | "max" | …).
   * Higher = more deliberate drafting/judging at the cost of latency. Default
   * "high" balances quality and turnaround across ~11 Opus calls per run.
   */
  writerEffort: (process.env.ANTHROPIC_WRITER_EFFORT ?? "high").trim(),
};

export function hasAnthropic(): boolean {
  return anthropic.apiKey.length > 0;
}

export const google = {
  clientId: (process.env.GOOGLE_CLIENT_ID ?? "").trim(),
  clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "").trim(),
  redirectUri: (
    process.env.GOOGLE_REDIRECT_URI ??
    "http://localhost:3000/api/google/oauth/callback"
  ).trim(),
};

export function hasGoogleConfig(): boolean {
  return google.clientId.length > 0 && google.clientSecret.length > 0;
}

/** Scopes requested at consent: read-only Gmail + write access to own events. */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];
