import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { makeOAuthClient } from "@/lib/google/client";
import { saveTokens } from "@/lib/google/tokens";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const settings = (q: string) =>
    NextResponse.redirect(new URL(`/settings?${q}`, origin));

  // Verify CSRF state against the httpOnly cookie set in /start (exact name match).
  const savedState = (await cookies()).get("g_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    const res = settings("error=state");
    res.cookies.delete("g_oauth_state");
    return res;
  }

  try {
    const client = makeOAuthClient();
    const { tokens } = await client.getToken(code);
    saveTokens({
      access_token: tokens.access_token ?? undefined,
      refresh_token: tokens.refresh_token ?? undefined,
      scope: tokens.scope ?? undefined,
      token_type: tokens.token_type ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    });

    // Best-effort: record which account connected (for display only).
    try {
      client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const me = await oauth2.userinfo.get();
      if (me.data.email) saveTokens({ email: me.data.email });
    } catch {
      // non-fatal — connection still works without the email label
    }

    const res = settings("connected=1");
    res.cookies.delete("g_oauth_state");
    return res;
  } catch {
    const res = settings("error=exchange");
    res.cookies.delete("g_oauth_state");
    return res;
  }
}
