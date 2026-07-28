/**
 * Build-time capture of every section component on the main portfolio site.
 *
 * The portfolio is a single-page Next.js site composed from
 * `portfolio/app/page.tsx` via components in `portfolio/components/*.tsx`.
 * Walking those components with the same lightweight string-literal puller
 * the live reader already uses gives us a text blob per section so the
 * assistant can answer questions about anything visible on the portfolio —
 * without a headless browser at build time.
 *
 * Mirrors the `extractTextLiterals`/`buildPortfolioPages` logic in
 * `AI_Assistant/lib/knowledge.ts` so the live reader and the committed
 * snapshot stay shape-compatible.
 */
import fs from "node:fs";
import path from "node:path";

export interface PortfolioPage {
  section: string;
  sourceFile: string;
  title: string;
  url: string;
  textBlob: string;
}

export function extractTextLiterals(source: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "`") {
      let j = i + 1;
      let buf = "";
      while (j < source.length) {
        const c = source[j];
        if (c === "\\" && j + 1 < source.length) { buf += source[j + 1]; j += 2; continue; }
        if (c === ch) break;
        buf += c;
        j++;
      }
      if (buf.trim()) out.push(buf);
      i = j + 1;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== "'") {
        if (source[j] === "\\") j++;
        j++;
      }
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

function sectionNameFromFile(relPath: string): string {
  const base = relPath.split("/").pop()?.replace(/\.tsx$/, "") ?? "section";
  return base.replace(/Section$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function titleFromLiterals(literals: string[]): string {
  for (const s of literals.slice(0, 12)) {
    const t = s.trim();
    if (!t || t.length > 80) continue;
    if (/https?:\/\//.test(t) || t.includes("@") || t.includes("/")) continue;
    if (/[.!?]/.test(t.slice(-1))) continue;
    return t;
  }
  return "";
}

/**
 * Decide whether a captured string literal is real prose vs a JSX attribute
 * (Tailwind classnames, class names, imports, template-literal classnames
 * with ${...} interpolation). Real copy has spaces AND meaningful word
 * density AND no template interpolation.
 */
function looksLikeProse(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/\s/.test(t)) return false;                       // single token = JSX prop value
  if (/\$\{/.test(t)) return false;                      // template-literal class string
  if (t.length > 0 && /^[a-z]+$/.test(t.replace(/\s+/g, ""))) return false;
  // Drop strings that look like class names: any tailwind utility prefix is a
  // strong signal. Heuristic: tailwind token count must be < half the total
  // whitespace-separated tokens, AND there must be at least 2 "real" words
  // (>=4 letters, not a known utility keyword).
  const tokens = t.split(/\s+/);
  const tailwindTokens = (t.match(/\b(?:flex|grid|block|inline|relative|absolute|fixed|w-\d+|h-\d+|p-\d+|m-\d+|text-(?:xs|sm|base|lg|xl|\d+xl)|font-(?:bold|semibold|medium)|bg-\S+|border-\S+|hover:\S+|md:\S+|sm:\S+|lg:\S+|dark:\S+|transition-\S+|gap-\d+|space-\S+|rounded-\S+|shadow-\S+|leading-\S+|tracking-\S+|max-w-\S+|min-w-\S+|mx-\S+|my-\S+|px-\S+|py-\S+|mt-\d+|mb-\d+|mr-\d+|ml-\d+|pt-\d+|pb-\d+|pr-\d+|pl-\d+|z-\d+|opacity-\S+|duration-\d+|ease-\S+|group\b|first:|last:|focus:|active:|placeholder)\b/g) || []).length;
  const nonTailwindTokens = tokens.filter((tok) => !/^(?:flex|grid|block|inline|relative|absolute|fixed|w-\d+|h-\d+|p-\d+|m-\d+|text-(?:xs|sm|base|lg|xl|\d+xl)|font-(?:bold|semibold|medium)|bg-\S+|border-\S+|hover:\S+|md:\S+|sm:\S+|lg:\S+|dark:\S+|transition-\S+|gap-\d+|space-\S+|rounded-\S+|shadow-\S+|leading-\S+|tracking-\S+|max-w-\S+|min-w-\S+|mx-\S+|my-\S+|px-\S+|py-\S+|mt-\d+|mb-\d+|mr-\d+|ml-\d+|pt-\d+|pb-\d+|pr-\d+|pl-\d+|z-\d+|opacity-\S+|duration-\d+|ease-\S+|group\b|first:|last:|focus:|active:|placeholder\S*)$/.test(tok)).length;
  if (tailwindTokens >= 2 && tailwindTokens > nonTailwindTokens) return false;
  // Drop strings where the first token is a tailwind class (heading-like
  // prose usually starts with a capitalized word or a number, not "fixed"/"relative").
  if (/^(fixed|relative|absolute|inline|block|grid|flex|hover|transition|overflow|transform|group|cursor|rounded|shadow|border|bg-|text-|font-|max-w|min-w|z-\d)/.test(t)) return false;
  if (/^(use client|"use client")/.test(t)) return false;
  return true;
}

export function buildPortfolioPages(portfolioDir: string, portfolioUrl: string): PortfolioPage[] {
  const componentsDir = path.join(portfolioDir, "components");
  if (!fs.existsSync(componentsDir)) return [];

  const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
  const pages: PortfolioPage[] = [];
  for (const file of files) {
    if (/AIAssistant/i.test(file)) continue; // embedding widgets, not portfolio copy
    const abs = path.join(componentsDir, file);
    const source = fs.readFileSync(abs, "utf8");
    const allLiterals = extractTextLiterals(source).map((s) => s.trim()).filter(Boolean);
    if (allLiterals.length === 0) continue;
    const proseLiterals = allLiterals.filter(looksLikeProse);
    // Skip sections whose captured text is almost entirely JSX/Tailwind. The
    // bar: at least 5 prose strings OR >= 40% prose ratio. This drops Blog,
    // Footer, and Navbar (visual chrome with no prose) without losing any
    // section that actually carries content for the assistant to answer
    // questions about.
    const ratio = proseLiterals.length / allLiterals.length;
    if (proseLiterals.length < 5 && ratio < 0.4) continue;
    const rel = `components/${file}`;
    const section = sectionNameFromFile(rel);
    const title = titleFromLiterals(proseLiterals) || section;
    const textBlob = proseLiterals.join("\n").trim();
    if (!textBlob) continue;
    pages.push({ section, sourceFile: rel, title, url: portfolioUrl, textBlob });
  }
  return pages;
}
