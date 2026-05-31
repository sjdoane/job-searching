import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { hasGoogleConfig } from "@/lib/config";
import { buildAuthUrl } from "@/lib/google/client";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!hasGoogleConfig()) {
    return NextResponse.redirect(new URL("/settings?error=noconfig", origin));
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
