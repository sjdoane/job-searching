import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The SQLite database MUST live outside OneDrive. OneDrive's file sync can
 * corrupt a live SQLite database (it copies the file mid-write). The code stays
 * in OneDrive; the data does not.
 *
 * On Windows we use %LOCALAPPDATA% (e.g. C:\Users\<you>\AppData\Local), which is
 * a per-machine location OneDrive never touches. Other platforms fall back to a
 * dotfolder in the home directory.
 */
export function getDataDir(): string {
  const override = process.env.JSCC_DATA_DIR;
  if (override) {
    mkdirSync(override, { recursive: true });
    return override;
  }

  const localAppData = process.env.LOCALAPPDATA;
  const base = localAppData
    ? path.join(localAppData, "JobSearchCommandCenter")
    : path.join(os.homedir(), ".job-search-command-center");

  const dataDir = path.join(base, "data");
  mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function getDatabasePath(): string {
  return path.join(getDataDir(), "app.db");
}
