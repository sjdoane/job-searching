import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { getDatabasePath } from "./paths";
import * as schema from "./schema";

/**
 * Idempotent DDL. Runs on every startup so the user never has to run a
 * migration command — first launch just works. Keep these statements in sync
 * with src/lib/db/schema.ts. For schema *changes* down the road, use
 * drizzle-kit (see drizzle.config.ts) to generate proper migrations.
 */
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  role TEXT,
  track TEXT NOT NULL DEFAULT 'other',
  location TEXT,
  source TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  priority INTEGER NOT NULL DEFAULT 2,
  opens_at TEXT,
  deadline TEXT,
  applied_at TEXT,
  comp_notes TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER REFERENCES targets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  email TEXT,
  linkedin TEXT,
  relationship TEXT,
  outreach_stage TEXT NOT NULL DEFAULT 'to_contact',
  last_contacted_at TEXT,
  next_follow_up_at TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_id INTEGER NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other',
  title TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS calendar_links (
  item_key TEXT PRIMARY KEY,
  google_event_id TEXT NOT NULL,
  summary TEXT,
  synced_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  horizon TEXT NOT NULL DEFAULT 'short',
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  kind TEXT NOT NULL DEFAULT 'todo',
  priority INTEGER NOT NULL DEFAULT 2,
  due_at TEXT,
  target_id INTEGER REFERENCES targets(id) ON DELETE SET NULL,
  goal_id INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  source_key TEXT,
  notes TEXT,
  done_at TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS prep_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'behavioral',
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  resource_url TEXT,
  notes TEXT,
  last_reviewed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source_key);
CREATE INDEX IF NOT EXISTS idx_prep_category ON prep_items(category);

CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_track ON targets(track);
CREATE INDEX IF NOT EXISTS idx_contacts_target ON contacts(target_id);
CREATE INDEX IF NOT EXISTS idx_assessments_target ON assessments(target_id);
`;

/**
 * Additive migrations for databases created before a column existed. CREATE
 * TABLE IF NOT EXISTS never alters an existing table, so new columns are added
 * here idempotently (checked against PRAGMA table_info).
 */
function runMigrations(sqlite: Database.Database) {
  const ensureColumn = (table: string, column: string, ddl: string) => {
    const cols = sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  };
  ensureColumn(
    "contacts",
    "outreach_stage",
    "outreach_stage TEXT NOT NULL DEFAULT 'to_contact'",
  );
}

function createConnection() {
  const sqlite = new Database(getDatabasePath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP_SQL);
  runMigrations(sqlite);
  return drizzle(sqlite, { schema });
}

// Cache the connection across Next.js dev hot-reloads so we don't reopen the
// file on every module reload.
const globalForDb = globalThis as unknown as {
  __jscc_db?: ReturnType<typeof createConnection>;
};

export const db = globalForDb.__jscc_db ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__jscc_db = db;
}

export * from "./schema";
