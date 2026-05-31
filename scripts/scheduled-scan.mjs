// Headless scheduled scan — runs WITHOUT the Next dev server (for Windows Task
// Scheduler). It does the safe, deterministic, one-way work only: push tracker
// deadlines/assessments/follow-ups to Google Calendar. It never modifies Gmail
// and never auto-adds tracker rows (Gmail stays suggest-only in the UI).
//
//   node scripts/scheduled-scan.mjs
//
// Reads Google client creds from .env.local and the stored login token from the
// local data dir (same files the app uses). Logs a summary to the data dir.

import Database from "better-sqlite3";
import { google } from "googleapis";
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function dataDir() {
  const override = process.env.JSCC_DATA_DIR;
  const base = override
    ? override
    : process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "JobSearchCommandCenter")
      : path.join(os.homedir(), ".job-search-command-center");
  const dir = override ? override : path.join(base, "data");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readEnvLocal() {
  const out = {};
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(path.join(dataDir(), "scheduled-scan.log"), line + "\n");
  } catch {}
}

function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Collect dated items from the DB (mirrors lib/tracker.ts listDeadlines()).
function collectDeadlines(db) {
  const items = [];
  for (const t of db.prepare("SELECT * FROM targets").all()) {
    if (t.opens_at)
      items.push({ kind: "opens", date: t.opens_at, targetId: t.id, company: t.company, label: `Apps open: ${t.company}${t.role ? ` — ${t.role}` : ""}` });
    if (t.deadline)
      items.push({ kind: "deadline", date: t.deadline, targetId: t.id, company: t.company, label: `Deadline: ${t.company}${t.role ? ` — ${t.role}` : ""}` });
  }
  for (const a of db.prepare("SELECT a.*, t.company AS company FROM assessments a JOIN targets t ON a.target_id = t.id WHERE a.due_at IS NOT NULL").all()) {
    items.push({ kind: "assessment", date: a.due_at, targetId: a.target_id, company: a.company, label: `${String(a.type).toUpperCase()}${a.title ? `: ${a.title}` : ""} — ${a.company}` });
  }
  for (const c of db.prepare("SELECT * FROM contacts WHERE next_follow_up_at IS NOT NULL").all()) {
    items.push({ kind: "follow-up", date: c.next_follow_up_at, targetId: c.target_id, company: c.company, label: `Follow up: ${c.name}${c.company ? ` (${c.company})` : ""}` });
  }
  return items;
}

function stableKey(item) {
  return `${item.kind}:${item.targetId ?? item.company ?? "na"}:${item.date}`;
}

async function findEventIdByKey(cal, key) {
  try {
    const res = await cal.events.list({
      calendarId: "primary",
      privateExtendedProperty: [`jsccKey=${key}`],
      maxResults: 1,
      showDeleted: false,
    });
    return res.data.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function eventBody(item, key) {
  return {
    summary: item.label,
    description: `${item.kind}${item.company ? ` · ${item.company}` : ""}\n(Synced from Job Search Command Center)`,
    start: { date: item.date },
    end: { date: nextDay(item.date) },
    transparency: "transparent",
    extendedProperties: { private: { jsccKey: key } },
  };
}

async function main() {
  const env = readEnvLocal();
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/oauth/callback";
  if (!clientId || !clientSecret) {
    log("Google creds missing in .env.local — nothing to do.");
    return;
  }

  const tokenPath = path.join(dataDir(), "google-token.json");
  if (!existsSync(tokenPath)) {
    log("Not connected (no google-token.json) — nothing to do.");
    return;
  }
  const tokens = JSON.parse(readFileSync(tokenPath, "utf8"));
  if (!tokens.refresh_token) {
    log("Stored token has no refresh_token — reconnect in the app.");
    return;
  }

  const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth.setCredentials(tokens);
  // Persist refreshed access tokens, preserving the refresh_token (merge).
  oauth.on("tokens", (tok) => {
    const merged = { ...tokens, ...tok, refresh_token: tok.refresh_token ?? tokens.refresh_token };
    writeFileSync(tokenPath, JSON.stringify(merged, null, 2), { mode: 0o600 });
  });

  const cal = google.calendar({ version: "v3", auth: oauth });
  const dbPath = path.join(dataDir(), "app.db");
  if (!existsSync(dbPath)) {
    log("No app.db found — nothing to sync.");
    return;
  }
  const db = new Database(dbPath);
  db.exec(`CREATE TABLE IF NOT EXISTS calendar_links (item_key TEXT PRIMARY KEY, google_event_id TEXT NOT NULL, summary TEXT, synced_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000));`);

  const items = collectDeadlines(db);
  const getLink = db.prepare("SELECT google_event_id FROM calendar_links WHERE item_key = ?");
  const upsertLink = db.prepare("INSERT INTO calendar_links (item_key, google_event_id, summary, synced_at) VALUES (?,?,?,?) ON CONFLICT(item_key) DO UPDATE SET google_event_id=excluded.google_event_id, summary=excluded.summary, synced_at=excluded.synced_at");

  let created = 0, updated = 0, failed = 0;
  for (const item of items) {
    const key = stableKey(item);
    const body = eventBody(item, key);
    const link = getLink.get(key);
    let eventId = link?.google_event_id ?? null;
    if (!eventId) eventId = await findEventIdByKey(cal, key);
    try {
      if (eventId) {
        try {
          await cal.events.patch({ calendarId: "primary", eventId, requestBody: body });
          updated++;
        } catch {
          const res = await cal.events.insert({ calendarId: "primary", requestBody: body });
          eventId = res.data.id ?? "";
          created++;
        }
      } else {
        const res = await cal.events.insert({ calendarId: "primary", requestBody: body });
        eventId = res.data.id ?? "";
        created++;
      }
      upsertLink.run(key, eventId, item.label, Date.now());
    } catch {
      failed++;
    }
  }
  log(`Calendar sync: ${items.length} items — ${created} created, ${updated} updated, ${failed} failed.`);
}

main().catch((e) => log(`ERROR: ${e?.message ?? e}`));
