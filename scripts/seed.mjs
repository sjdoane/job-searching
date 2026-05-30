// Seeds the tracker with Sam's known target firms and their recruiting windows.
// Idempotent: skips a row if the same company+role already exists.
//
// IMPORTANT: the dates below were sourced 2026-05-30 and MOVE EVERY YEAR.
// Treat them as "apply week one of open" reminders, not gospel — verify each
// firm's current dates before relying on them.
//
//   node scripts/seed.mjs

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function getDatabasePath() {
  const override = process.env.JSCC_DATA_DIR;
  const base = override
    ? override
    : process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "JobSearchCommandCenter")
      : path.join(os.homedir(), ".job-search-command-center");
  const dataDir = override ? override : path.join(base, "data");
  mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "app.db");
}

const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL, role TEXT, track TEXT NOT NULL DEFAULT 'other',
  location TEXT, source TEXT, url TEXT, status TEXT NOT NULL DEFAULT 'lead',
  priority INTEGER NOT NULL DEFAULT 2, opens_at TEXT, deadline TEXT,
  applied_at TEXT, comp_notes TEXT, notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);`;

const VERIFY = "VERIFY dates — sourced 2026-05-30, recruiting windows move yearly.";

const SEED = [
  // Consulting (MBB). USC is Bain-strong; near-zero McKinsey OCR → referrals critical.
  { company: "Bain & Company", role: "Associate Consultant (New Grad)", track: "mbb", priority: 1, opens_at: "2026-07-01", deadline: "2026-07-19", notes: `USC is a Bain-strong semi-target. Apply week one. ${VERIFY}` },
  { company: "McKinsey & Company", role: "Business Analyst (New Grad)", track: "mbb", priority: 1, opens_at: "2026-07-01", deadline: "2026-08-11", notes: `Near-zero USC OCR — referral essential. ${VERIFY}` },
  { company: "Boston Consulting Group", role: "Associate (New Grad)", track: "mbb", priority: 1, opens_at: "2026-07-01", notes: `Apply week one of open. ${VERIFY}` },

  // Quant — strict rolling, fills by late October regardless of stated deadline.
  { company: "Jane Street", role: "Quant Trader / Quant Dev (New Grad)", track: "quant", priority: 1, opens_at: "2026-07-01", notes: `Rolling — apply week one. Expect OA. ${VERIFY}` },
  { company: "Hudson River Trading", role: "Algo Developer / Quant (New Grad)", track: "quant", priority: 1, opens_at: "2026-07-01", notes: `Rolling. ${VERIFY}` },
  { company: "Citadel / Citadel Securities", role: "Quant / SWE (New Grad)", track: "quant", priority: 1, opens_at: "2026-07-01", notes: `Rolling; slots fill by Oct. ${VERIFY}` },
  { company: "Optiver", role: "Quant Trader / Researcher (New Grad)", track: "quant", priority: 2, opens_at: "2026-07-01", notes: `Rolling; HackerRank-style OA. ${VERIFY}` },

  // PM / APM — opens later (fall), short 3–4 week windows.
  { company: "Google", role: "Associate Product Manager (APM)", track: "pm", priority: 1, opens_at: "2026-09-01", notes: `Short 3–4 week window in fall. ${VERIFY}` },
];

const db = new Database(getDatabasePath());
db.pragma("journal_mode = WAL");
db.exec(BOOTSTRAP);

const exists = db.prepare(
  "SELECT 1 FROM targets WHERE company = ? AND IFNULL(role,'') = IFNULL(?, '')",
);
const insert = db.prepare(
  `INSERT INTO targets (company, role, track, priority, status, opens_at, deadline, source, notes)
   VALUES (@company, @role, @track, @priority, 'lead', @opens_at, @deadline, 'seed', @notes)`,
);

let added = 0;
let skipped = 0;
for (const row of SEED) {
  if (exists.get(row.company, row.role)) {
    skipped++;
    continue;
  }
  insert.run({ deadline: null, ...row });
  added++;
}

console.log(`Seed complete: ${added} added, ${skipped} already present.`);
console.log(`DB: ${getDatabasePath()}`);
