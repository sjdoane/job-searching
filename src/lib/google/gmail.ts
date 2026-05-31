import "server-only";

import { google } from "googleapis";

import { getAuthedClient } from "./client";

export interface RecruitingEmail {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  date: string;
  snippet: string;
  /** Heuristic company guess from the sender domain (user can edit). */
  guessCompany: string;
}

// Recruiting-ish signal terms. Read-only — we only LIST and READ metadata.
const QUERY = [
  "newer_than:120d",
  "(",
  [
    "recruiting",
    "recruiter",
    '"your application"',
    '"we received your application"',
    "interview",
    '"online assessment"',
    '"coding challenge"',
    '"phone screen"',
    '"next steps"',
    '"info session"',
    '"information session"',
    "networking",
    '"superday"',
    '"hackerrank"',
  ].join(" OR "),
  ")",
].join(" ");

function header(
  headers: { name?: string | null; value?: string | null }[] | undefined,
  name: string,
): string {
  return (
    headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  );
}

function parseEmailAddress(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

const ATS_DOMAINS = new Set([
  "greenhouse.io",
  "us.greenhouse-mail.io",
  "greenhouse-mail.io",
  "hire.lever.co",
  "lever.co",
  "myworkday.com",
  "ashbyhq.com",
  "gmail.com",
  "google.com",
]);

function guessCompanyFromEmail(addr: string): string {
  const domain = addr.split("@")[1] ?? "";
  if (!domain || ATS_DOMAINS.has(domain)) {
    // ATS relay — company unknown from domain; leave for the user to fill.
    return "";
  }
  const parts = domain.split(".");
  const sld = parts.length >= 2 ? parts[parts.length - 2] : domain;
  return sld ? sld.charAt(0).toUpperCase() + sld.slice(1) : "";
}

/** Read-only list of recent recruiting-related emails (metadata + snippet). */
export async function listRecruitingEmails(
  maxResults = 25,
): Promise<RecruitingEmail[]> {
  const client = getAuthedClient();
  const gmail = google.gmail({ version: "v1", auth: client });

  const list = await gmail.users.messages.list({
    userId: "me",
    q: QUERY,
    maxResults,
  });
  const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean);

  const emails: RecruitingEmail[] = [];
  for (const id of ids) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: id as string,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });
    const headers = msg.data.payload?.headers ?? undefined;
    const from = header(headers, "From");
    const fromEmail = parseEmailAddress(from);
    emails.push({
      id: id as string,
      from,
      fromEmail,
      subject: header(headers, "Subject"),
      date: header(headers, "Date"),
      snippet: msg.data.snippet ?? "",
      guessCompany: guessCompanyFromEmail(fromEmail),
    });
  }
  return emails;
}
