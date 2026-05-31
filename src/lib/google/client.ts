import "server-only";

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

import { GOOGLE_SCOPES, google as googleConfig } from "@/lib/config";
import { readTokens, saveTokens } from "./tokens";

export function makeOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri,
  );
}

/** Consent URL that forces a durable refresh token. */
export function buildAuthUrl(state: string): string {
  return makeOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // re-issue a refresh token every time during dev
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state,
  });
}

/**
 * An OAuth2 client primed with stored credentials. Attaches a `tokens` listener
 * that MERGE-persists on auto-refresh (Google omits refresh_token on refresh —
 * saveTokens preserves the existing one). Throws if not connected.
 */
export function getAuthedClient(): OAuth2Client {
  const stored = readTokens();
  if (!stored?.refresh_token) {
    throw new Error("Google account is not connected.");
  }
  const client = makeOAuthClient();
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    scope: stored.scope,
    token_type: stored.token_type,
    expiry_date: stored.expiry_date,
  });
  client.on("tokens", (tok) => {
    saveTokens({
      access_token: tok.access_token ?? undefined,
      refresh_token: tok.refresh_token ?? undefined,
      scope: tok.scope ?? undefined,
      token_type: tok.token_type ?? undefined,
      expiry_date: tok.expiry_date ?? undefined,
    });
  });
  return client;
}
