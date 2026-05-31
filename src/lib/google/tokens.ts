import "server-only";

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getDataDir } from "@/lib/db/paths";

/**
 * Google OAuth tokens, stored as plaintext JSON in the local data dir (outside
 * the repo and outside OneDrive — same place as the SQLite DB). For a
 * single-user localhost app this is an acceptable threat model: anyone who can
 * read this file can also read .env.local and the DB. Tokens are NEVER sent to
 * the browser or logged.
 */
export interface StoredTokens {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  email?: string;
}

function tokenPath(): string {
  return path.join(getDataDir(), "google-token.json");
}

export function readTokens(): StoredTokens | null {
  const p = tokenPath();
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Merge-and-persist. CRITICAL: Google omits `refresh_token` on token refreshes,
 * so we must keep the existing one unless a new one is explicitly provided.
 * Overwriting it with undefined would silently break reconnection.
 */
export function saveTokens(incoming: StoredTokens): StoredTokens {
  const existing = readTokens() ?? {};
  const merged: StoredTokens = {
    ...existing,
    ...incoming,
    refresh_token: incoming.refresh_token ?? existing.refresh_token,
    email: incoming.email ?? existing.email,
  };
  writeFileSync(tokenPath(), JSON.stringify(merged, null, 2), { mode: 0o600 });
  return merged;
}

export function clearTokens(): void {
  const p = tokenPath();
  if (existsSync(p)) rmSync(p);
}

export function isConnected(): boolean {
  const t = readTokens();
  return Boolean(t?.refresh_token);
}

export function connectedEmail(): string | null {
  return readTokens()?.email ?? null;
}
