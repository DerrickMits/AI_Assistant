/**
 * Build-time PDF text extraction for downloadable blueprints.
 *
 * The assistant ingests the blueprint PDFs checked into the resources repo at
 * `public/blueprints/*.pdf` so it can answer questions about their contents
 * (not just the title/description metadata parsed out of `lib/resources.ts`).
 *
 * Uses `pdfjs-dist` (pure JS, no native deps) so this runs inside a Vercel
 * build image without `pdftotext`/`mutool` available. The worker is disabled
 * so extraction happens inline on the main build thread.
 *
 * Run as part of `npm run kb` / the build-time ingestion step. Never imported
 * by runtime code (it would bloat the deployed bundle).
 */
import fs from "node:fs";

// Loaded lazily so a missing devDependency never breaks unrelated commands.
let pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null = null;
async function getPdfjs() {
  if (pdfjs) return pdfjs;
  // pdfjs v6 ships ESM; the legacy build avoids top-level await issues.
  const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs = mod;
  return mod;
}

/** Hard cap on extracted characters per blueprint to keep the snapshot bounded. */
const MAX_CHARS = 60_000;

/** Convenience: true when an absolute path points at a .pdf we should try. */
export function isPdf(absPath: string): boolean {
  return absPath.toLowerCase().endsWith(".pdf") && fs.existsSync(absPath);
}

/**
 * Extract concatenated page text from a PDF file. Returns "" on any failure
 * (never throws — callers rely on ingestion being tolerant). Truncates to
 * MAX_CHARS per file.
 */
export async function extractPdfText(absPath: string): Promise<string> {
  if (!isPdf(absPath)) return "";
  try {
    const mod = await getPdfjs();
    const data = new Uint8Array(fs.readFileSync(absPath));
    const doc = await mod.getDocument({
      data,
      // v5 legacy build: no workerSrc is set, so pdfjs runs a "fake worker"
      // inline on the main build thread. That's exactly what we want for a
      // bundlerless node script. useWorkerFetch:false keeps it offline.
      useWorkerFetch: false,
    }).promise;

    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      if (out.length >= MAX_CHARS) break;
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // pdfjs returns text items in layout order; join with spaces and reflow
      // naive line breaks when the y-coordinate drops.
      let lastY: number | null = null;
      let line = "";
      for (const item of content.items as Array<{ str: string; transform?: number[] }>) {
        const y = item.transform?.[5] ?? null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          out += line.trim() + "\n";
          line = "";
        }
        line += (line ? " " : "") + item.str;
        lastY = y;
      }
      if (line.trim()) out += line.trim() + "\n";
      out += "\n";
      page.cleanup();
    }
    await doc.cleanup();
    await doc.destroy();
    return out.slice(0, MAX_CHARS).trim();
  } catch {
    return "";
  }
}
