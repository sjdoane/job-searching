// Applies researched application dates to tracker firms. Reads
// samcontext/research/dates_*.json (objects with company, opensAtISO,
// deadlineISO, cycleStatus, evidence) and updates matching targets by exact
// (case-insensitive) company name. Only sets real YYYY-MM-DD dates; records the
// cycle status/evidence in notes. Idempotent. Run after the date agents finish:
//   node scripts/apply-firm-dates.mjs

import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function dbPath() {
  const base = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "JobSearchCommandCenter")
    : path.join(process.env.HOME || ".", ".job-search-command-center");
  return path.join(base, "data", "app.db");
}

const isoOrNull = (s) =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
    ? s
    : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "samcontext", "research");

let records = [];
for (const f of readdirSync(dir).filter((f) => /^dates_.*\.json$/i.test(f))) {
  try {
    const d = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    if (Array.isArray(d)) records.push(...d);
  } catch (e) {
    console.warn(`Skipping ${f}: ${e.message}`);
  }
}

const db = new Database(dbPath());
const now = Date.now();
const findByName = db.prepare(
  "SELECT id, company, opens_at, deadline, notes FROM targets WHERE lower(company) = lower(?)",
);
const update = db.prepare(
  "UPDATE targets SET opens_at = ?, deadline = ?, notes = ?, updated_at = ? WHERE id = ?",
);

let updated = 0;
let unmatched = [];
for (const r of records) {
  const company = (r.company || "").trim();
  if (!company) continue;
  const row = findByName.get(company);
  if (!row) {
    unmatched.push(company);
    continue;
  }
  const opens = isoOrNull(r.opensAtISO) ?? row.opens_at;
  const deadline = isoOrNull(r.deadlineISO) ?? row.deadline;
  const stamp = [r.cycleStatus, r.evidence].filter(Boolean).join(" — ");
  let notes = row.notes || "";
  if (stamp && !notes.includes(stamp)) {
    notes = (notes ? notes + " | " : "") + `Cycle (verified): ${stamp}`;
  }
  // Only write if something changed.
  if (opens !== row.opens_at || deadline !== row.deadline || notes !== row.notes) {
    update.run(opens, deadline, notes, now, row.id);
    updated++;
    const dateInfo = [
      opens && opens !== row.opens_at ? `opens ${opens}` : null,
      deadline && deadline !== row.deadline ? `deadline ${deadline}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`  ${company}${dateInfo ? ` -> ${dateInfo}` : " (status note)"}`);
  }
}

console.log(`\nUpdated ${updated} firm(s).`);
if (unmatched.length) console.log(`Unmatched (no tracker row): ${unmatched.join(", ")}`);
console.log(`Read ${records.length} date records. DB: ${dbPath()}`);
