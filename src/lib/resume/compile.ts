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

export async function compileResumeToPdf(tex: string): Promise<CompileResult> {
  if (!tectonicAvailable()) {
    return { ok: false, needsInstall: true, error: "Tectonic is not installed." };
  }
  const dir = mkdtempSync(path.join(tmpdir(), "jscc-tex-"));
  try {
    const texPath = path.join(dir, "resume.tex");
    writeFileSync(texPath, tex, "utf8");
    const r = spawnSync(
      tectonicBin(),
      ["--outdir", dir, "--chatter", "minimal", texPath],
      { timeout: 90_000, encoding: "utf8" },
    );
    if (r.status !== 0) {
      const log = (r.stderr || r.stdout || "").trim();
      return { ok: false, error: log.slice(-1800) || "Compilation failed." };
    }
    const pdf = readFileSync(path.join(dir, "resume.pdf"));
    return {
      ok: true,
      pdfBase64: pdf.toString("base64"),
      pages: await countPages(pdf),
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
