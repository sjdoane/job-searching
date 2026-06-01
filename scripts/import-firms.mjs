// Imports researched firms (samcontext/research/firms_*.json) into the tracker
// as quant leads. Idempotent: skips a company already in the DB (case-insensitive)
// and de-dupes within the batch. Run after the research agents finish:
//   node scripts/import-firms.mjs

import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const isoOrNull = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
    ? s
    : null;

function priorityFor(category, bigName) {
  const c = (category || "").toLowerCase();
  if (c.includes("hft") || c.includes("prop") || c.includes("multi"))
    return bigName ? 1 : 2;
  if (c.includes("passive") || c.includes("bank")) return 3;
  return 2;
}

function buildNotes(f) {
  const parts = [];
  if (f.category) parts.push(`Category: ${f.category}${f.bigName ? " (Big Name)" : ""}`);
  if (f.hiresNewGrad === false) parts.push("Does NOT appear to hire new grads.");
  else if (f.hiresNewGrad === "unknown") parts.push("New-grad hiring: unclear.");
  if (f.applicationTiming) parts.push(`Timing: ${f.applicationTiming}`);
  if (f.process) parts.push(`Process: ${f.process}`);
  if (f.notes) parts.push(f.notes);
  if (f.confidence) parts.push(`[confidence: ${f.confidence}]`);
  return parts.join(" — ") || null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const researchDir = path.join(__dirname, "..", "samcontext", "research");

let files = [];
try {
  files = readdirSync(researchDir).filter((f) => /^firms_.*\.json$/i.test(f));
} catch {
  console.error(`No research dir at ${researchDir}. Run the research agents first.`);
  process.exit(1);
}

const firms = [];
for (const file of files) {
  try {
    const data = JSON.parse(readFileSync(path.join(researchDir, file), "utf8"));
    if (Array.isArray(data)) firms.push(...data);
  } catch (e) {
    console.warn(`Skipping ${file}: ${e.message}`);
  }
}

const db = new Database(getDatabasePath());
db.pragma("journal_mode = WAL");
db.exec(BOOTSTRAP);

const existing = new Set(
  db
    .prepare("SELECT lower(company) AS c FROM targets")
    .all()
    .map((r) => r.c),
);
const insert = db.prepare(
  `INSERT INTO targets (company, role, track, status, priority, location, source, url, opens_at, deadline, notes)
   VALUES (@company, @role, 'quant', 'lead', @priority, @location, 'research', @url, @opens_at, @deadline, @notes)`,
);

let added = 0;
let skipped = 0;
const seen = new Set();
for (const f of firms) {
  const company = (f.company || "").trim();
  if (!company) continue;
  const key = company.toLowerCase();
  if (existing.has(key) || seen.has(key)) {
    skipped++;
    continue;
  }
  seen.add(key);
  insert.run({
    company,
    role: (f.newGradRoles || "Quant — New Grad").toString().slice(0, 160),
    priority: priorityFor(f.category, f.bigName),
    location: f.locations || null,
    url: f.careersUrl || null,
    opens_at: isoOrNull(f.opensAtISO),
    deadline: isoOrNull(f.deadlineISO),
    notes: buildNotes(f),
  });
  added++;
}

console.log(`Firms import complete: ${added} added, ${skipped} skipped (already tracked or dup).`);
console.log(`Read ${firms.length} firm records from ${files.length} file(s).`);
console.log(`DB: ${getDatabasePath()}`);
