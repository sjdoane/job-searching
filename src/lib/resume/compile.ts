import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

import { PDFDocument } from "pdf-lib";

/**
 * Compiles LaTeX to PDF locally using the Tectonic engine, if installed. This
 * powers in-app "Compile to PDF" (no Overleaf) and the one-page lint check.
 *
 * Install once: `winget install TectonicProject.Tectonic` (Windows), or see
 * https://tectonic-typesetting.github.io/. Point TECTONIC_PATH at the binary if
 * it isn't on PATH. When absent, the UI falls back to copy/download .tex.
 */

export interface CompileResult {
  ok: boolean;
  pdfBase64?: string;
  pages?: number;
  error?: string;
  /** True when Tectonic isn't installed (vs. a compile error). */
  needsInstall?: boolean;
  /**
   * Fraction of the text block filled on the LAST content page (0..1), when the
   * .tex was rendered with `measure: true`. >1 (or undefined with pages>1) means
   * it overflows. Powers the density-aware auto-fit. Undefined if not measured.
   */
  fillRatio?: number;
}

const SP_PER_PT = 65536;

/** Pull a zref-savepos marker's vertical position (sp, from page bottom). */
function readPosY(aux: string, name: string): number | null {
  const m = aux.match(
    new RegExp(`zref@newlabel\\{${name}\\}\\{[^]*?\\\\posy\\{(-?\\d+)\\}`),
  );
  return m ? Number(m[1]) : null;
}

/**
 * Page fill = used content height ÷ text-block height, from the top/bottom zref
 * markers and the \typeout'd \textheight. This is only meaningful (and only
 * used) for single-page output — both markers are then on page 1. Null if the
 * markers/geometry couldn't be read (caller falls back to page count only).
 */
function computeFillRatio(aux: string, log: string): number | null {
  const topY = readPosY(aux, "jsccTop");
  const endY = readPosY(aux, "jsccEnd");
  const th = log.match(/JSCC_GEO th=([\d.]+)pt/);
  if (topY == null || endY == null || !th) return null;
  const textHeightPt = Number(th[1]);
  const usedPt = (topY - endY) / SP_PER_PT;
  if (!(textHeightPt > 0) || !(usedPt > 0)) return null;
  return usedPt / textHeightPt;
}

// Mutable default (not a const literal) so the bundler can't fold it into the
// spawn() call site and treat the binary name as a static module path — that
// triggers a Turbopack context-module over-bundling warning.
let defaultTectonicBin = "tectonic";

/**
 * Resolve the Tectonic binary robustly, in priority order:
 *  1. TECTONIC_PATH (if set and the file actually exists),
 *  2. the app's own install location under %LOCALAPPDATA%\JobSearchCommandCenter\
 *     bin\ (and the home-dir equivalent) — so compile/auto-fit work even when the
 *     dev server was started without .env.local loaded (a common foot-gun),
 *  3. the bare `tectonic` command on PATH.
 * This means "Tectonic isn't installed" can only appear when it truly is absent.
 */
function tectonicBin(): string {
  const configured = process.env.TECTONIC_PATH?.trim();
  const localAppData = process.env.LOCALAPPDATA;
  const home = homedir();
  const candidates = [
    configured && configured.length > 0 ? configured : null,
    localAppData
      ? path.join(localAppData, "JobSearchCommandCenter", "bin", "tectonic.exe")
      : null,
    // winget installs a shim here and adds it to PATH.
    localAppData
      ? path.join(localAppData, "Microsoft", "WinGet", "Links", "tectonic.exe")
      : null,
    home ? path.join(home, ".job-search-command-center", "bin", "tectonic") : null,
  ].filter((c): c is string => Boolean(c));
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return defaultTectonicBin;
}

// Referenced so the binding stays mutable (prevents constant folding).
export function setTectonicBinForTesting(bin: string): void {
  defaultTectonicBin = bin;
}

export function tectonicAvailable(): boolean {
  const bin = tectonicBin();
  // If we resolved to a real binary file, it's installed — trust the file's
  // existence instead of spawning `--version`, which can false-negative on a
  // cold/slow/AV-scanned 49MB exe or in a restricted process. A genuine run
  // problem then surfaces as a real compile error, not "isn't installed".
  if (bin !== defaultTectonicBin && existsSync(bin)) return true;
  try {
    const r = spawnSync(bin, ["--version"], {
      timeout: 20000,
      encoding: "utf8",
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

/** Accurate page count via a real PDF parser (Tectonic compresses the PDF, so
 * text-scanning the bytes does not work). */
async function countPages(pdf: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(pdf, { updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return 1;
  }
}

export async function compileResumeToPdf(
  tex: string,
  opts: { metricsOnly?: boolean } = {},
): Promise<CompileResult> {
  if (!tectonicAvailable()) {
    return { ok: false, needsInstall: true, error: "Tectonic is not installed." };
  }
  const dir = mkdtempSync(path.join(tmpdir(), "jscc-tex-"));
  try {
    const texPath = path.join(dir, "resume.tex");
    writeFileSync(texPath, tex, "utf8");
    const r = spawnSync(
      tectonicBin(),
      // keep-intermediates/keep-logs so the .aux (zref fill markers) and .log
      // (page geometry) land in outdir — Tectonic omits them by default.
      [
        "--outdir",
        dir,
        "--chatter",
        "minimal",
        "--keep-intermediates",
        "--keep-logs",
        texPath,
      ],
      { timeout: 90_000, encoding: "utf8", windowsHide: true },
    );
    if (r.error || r.status !== 0) {
      const log = (r.stderr || r.stdout || "").trim();
      if (log) return { ok: false, error: log.slice(-1800) };
      // No output at all -> Tectonic never really ran (a process-LAUNCH failure,
      // e.g. Windows 0xC0000142 DLL-init in a restricted/non-interactive dev
      // server, or a spawn error). Give an actionable message, not a bare
      // "Compilation failed".
      const code = r.error
        ? ((r.error as NodeJS.ErrnoException).code ?? r.error.message)
        : `0x${((r.status ?? 0) >>> 0).toString(16)}`;
      return {
        ok: false,
        error: `Tectonic could not start (${code}) — the LaTeX itself is fine. This usually means the dev server is in a restricted state; stop it and run \`npm run dev\` from your own terminal, then retry.`,
      };
    }
    const pdf = readFileSync(path.join(dir, "resume.pdf"));
    const pages = await countPages(pdf);
    // Best-effort fill measurement (present only when rendered with measure:true).
    // Only meaningful for single-page output — the zref \posy markers are
    // page-relative, so on a 2-page render top/end live in different coordinate
    // origins and the difference is garbage. Gate on pages <= 1.
    let fillRatio: number | undefined;
    if (pages <= 1) {
      try {
        const aux = readFileSync(path.join(dir, "resume.aux"), "utf8");
        const log = `${r.stdout ?? ""}\n${(() => {
          try {
            return readFileSync(path.join(dir, "resume.log"), "utf8");
          } catch {
            return "";
          }
        })()}`;
        const ratio = computeFillRatio(aux, log);
        if (ratio != null) fillRatio = ratio;
      } catch {
        // no measurement markers — fall back to page count only
      }
    }
    return {
      ok: true,
      // Skip the (discarded) base64 during the auto-fit search — it only needs
      // pages + fillRatio. The final user-facing compile omits metricsOnly.
      pdfBase64: opts.metricsOnly ? undefined : pdf.toString("base64"),
      pages,
      fillRatio,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Compile error." };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort temp cleanup
    }
  }
}
