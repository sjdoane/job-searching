import "server-only";

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

function tectonicBin(): string {
  const configured = process.env.TECTONIC_PATH?.trim();
  return configured && configured.length > 0 ? configured : defaultTectonicBin;
}

// Referenced so the binding stays mutable (prevents constant folding).
export function setTectonicBinForTesting(bin: string): void {
  defaultTectonicBin = bin;
}

export function tectonicAvailable(): boolean {
  try {
    const r = spawnSync(tectonicBin(), ["--version"], {
      timeout: 8000,
      encoding: "utf8",
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
      { timeout: 90_000, encoding: "utf8" },
    );
    if (r.status !== 0) {
      const log = (r.stderr || r.stdout || "").trim();
      return { ok: false, error: log.slice(-1800) || "Compilation failed." };
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
