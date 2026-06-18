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

/**
 * Keep the main app.db file current so committed data can never be stranded in
 * an un-checkpointed (and possibly orphaned) WAL sidecar.
 *
 * Why this matters: in WAL mode, commits land in `app.db-wal` and only fold
 * into `app.db` on a *checkpoint*. SQLite's default auto-checkpoint is ~1000
 * pages (~4 MB), and the Next dev server is almost always killed hard (Ctrl+C,
 * a crash, or scripts/free-port.mjs) WITHOUT a clean SQLite close — so the
 * checkpoint never runs, the WAL grows for weeks, and `app.db` stays a near-
 * empty 4 KB stub. If that WAL is ever decoupled from the main file (a reset,
 * a copy, a sync hiccup), every target/task/note vanishes from the app even
 * though the bytes still exist in the orphaned WAL. That actually happened.
 *
 * Defenses, in order of importance:
 *  1. `wal_autocheckpoint = 1` — fold the WAL into app.db after *every* commit,
 *     so the main file is always current (the durable copy is never only in the
 *     WAL). Trivial cost for a single-user local app.
 *  2. A `wal_checkpoint(TRUNCATE)` on startup — flush + shrink any WAL that a
 *     prior hard-killed session left behind.
 *  3. A best-effort checkpoint on normal process exit.
 */
function harden(sqlite: Database.Database) {
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("wal_autocheckpoint = 1");
}

let exitHookInstalled = false;
function installCheckpointOnExit(sqlite: Database.Database) {
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  // 'exit' fires on clean shutdown and process.exit(); the better-sqlite3
  // pragma is synchronous, so it completes here. We deliberately do NOT hijack
  // SIGINT/SIGTERM (that would fight Next's own dev-server shutdown) — defense
  // #1 already guarantees app.db is current after every write, so a hard kill
  // loses nothing.
  process.once("exit", () => {
    try {
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      /* shutting down anyway */
    }
  });
}

function createConnection() {
  const sqlite = new Database(getDatabasePath());
  harden(sqlite);
  sqlite.exec(BOOTSTRAP_SQL);
  runMigrations(sqlite);
  // Fold any WAL a previously hard-killed session left behind into app.db now.
  try {
    sqlite.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    /* non-fatal */
  }
  installCheckpointOnExit(sqlite);
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
