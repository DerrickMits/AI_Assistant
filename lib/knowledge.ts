import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/**
 * Live knowledge base reader.
 *
 * The assistant reads Derrick's three sibling repositories straight from disk
 * on each request so any article, blueprint, or profile edit added to those
 * live sites is immediately reference-able here without rebuilding the AI app.
 *
 * Sibling directories (relative to this Next app's CWD, i.e. AI_Assistant/):
 *   portfolio  -> ../portfolio
 *   articles   -> ../articles
 *   resources  -> ../resources
 *
 * In serverless deploys (Vercel) the CWD differs from local, so the parents
 * are resolved from multiple anchors and the first existing one wins. If no
 * sibling is reachable the reader returns an empty KB and the chat route
 * surfaces a graceful "no knowledge wired up" message instead of crashing.
 */

const ANCHORS = [
  /*turbopackIgnore: true*/ process.cwd(),
  path.join(/*turbopackIgnore: true*/ process.cwd(), ".."),
  path.join(__dirname, ".."),
  path.join(__dirname, "..", ".."),
  path.join(__dirname, "..", "..", ".."),
];

function resolveSibling(name: string): string | null {
  for (const anchor of ANCHORS) {
    const candidate = path.resolve(anchor, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export interface KBMetric {
  value: string;
  label: string;
  detail: string;
}
export interface KBExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}
export interface KBEducation {
  degree: string;
  school: string;
  years: string;
}
export interface KBProfile {
  name: string;
  roleTag: string;
  summary: string;
  location: string;
  metrics: KBMetric[];
  experiences: KBExperience[];
  education: KBEducation[];
  certifications: string[];
  skills: string[];
  contact: { email: string; linkedin: string; portfolioUrl: string };
  sourceFile: string;
}
export interface KBArticle {
  slug: string;
  title: string;
  date: string;
  readTime: string;
  excerpt: string;
  author: string;
  category: string;
  url: string;
  body: string;
}
export interface KBResourceHighlight {
  label: string;
  detail: string;
}
export interface KBResource {
  id: string;
  title: string;
  category: string;
  format: string;
  description: string;
  highlights: KBResourceHighlight[];
  tags: string[];
  filename: string;
  version?: string;
  date?: string;
  url: string;
  downloadUrl: string;
  /**
   * Extracted textual content of the downloadable file (PDF body, JSON/MD
   * payload) plus the blueprint-presenting page, concatenated. Captured at
   * build time by `scripts/build-knowledge.ts` so the assistant can answer
   * questions about the contents, not just the title/description. Optional so
   * live snapshots lacking it still parse cleanly.
   */
  body?: string;
}

export interface KBPortfolioPage {
  section: string;
  /** Component source path relative to the portfolio repo (e.g. components/HeroSection.tsx). */
  sourceFile: string;
  /** Best-effort title (from a leading heading or the section/component name). */
  title: string;
  /** Live URL of the portfolio section (the portfolio is a single-page site today, so this is the home URL for every section). */
  url: string;
  /** Plain-text blob extracted from the section component's JSX literals. */
  textBlob: string;
}
export interface KBTestimonial {
  name: string;
  designation: string;
  quote: string;
  src: string;
  sourceFile: string;
}
export interface KnowledgeBase {
  profile: KBProfile | null;
  articles: KBArticle[];
  resources: KBResource[];
  testimonials: KBTestimonial[];
  /** Captured text of the main portfolio site's section pages (hero, experience, skills, projects, blog, contact, footer, etc.). */
  portfolioPages: KBPortfolioPage[];
  sites: {
    portfolio: string;
    ledger: string;
    resources: string;
  };
  meta: {
    generatedAt: string;
    available: boolean;
    missingSources: string[];
    /** Optional mirror of script-side counts when the snapshot was built. */
    sourceCounts?: {
      experiences?: number;
      articles?: number;
      resources?: number;
      testimonials?: number;
      portfolioPages?: number;
      blueprintBytes?: number;
    };
  };
}

/* ----- string extraction helpers for the portfolio + resources markup ----- */

function readText(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function extractArray(source: string, name: string): string {
  const idx = source.indexOf(`const ${name} =`);
  if (idx === -1) return "";
  const start = source.indexOf("[", source.indexOf("=", idx));
  if (start === -1) return "";
  let depth = 0;
  let started = false;
  let end = start;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === "[") { depth++; started = true; }
    else if (ch === "]") {
      depth--;
      if (started && depth === 0) { end = i; break; }
    }
  }
  return source.slice(start, end + 1).replace(/\s+/g, " ").trim();
}

function extractStringList(source: string, name: string): string[] {
  const arr = extractArray(source, name);
  const matches = arr.match(/"([^"]+)"/g) || [];
  return matches.map((m) => m.replace(/"/g, ""));
}

/* ----- profile ----- */

function buildProfile(portfolioDir: string): KBProfile | null {
  const heroPath = path.join(portfolioDir, "components", "HeroSection.tsx");
  const expPath = path.join(portfolioDir, "components", "ExperienceSection.tsx");
  const exp = readText(expPath);
  if (!exp) return null;

  const certifications =
    extractStringList(exp, "certifications").length > 0
      ? extractStringList(exp, "certifications")
      : ["HubSpot CRM", "Salesforce CRM", "Google Analytics", "Agile Project Management"];

  const experiences: KBExperience[] = [
    { title: "Executive Partner", company: "Athena", startDate: "Jun 2025", endDate: "Present", bullets: [
      "Realigned executive calendars, increasing protected focus time by 35% in 6 months.",
      "Reduced interruptions by 50% in 90 days by triaging incoming communications and investment analysis requests.",
      "Coordinated cross-functional teams using Asana to deliver 95% of 10 major projects on time.",
      "Documented optimized internal processes to enhance overall team productivity.",
    ] },
    { title: "Product Content and Email Specialist", company: "Gaotek (USA / Remote)", startDate: "Jun 2024", endDate: "Aug 2024", bullets: [
      "Implemented PHP/MySQL optimizations, raising website speed by 35% and organic traffic by 20%.",
      "Created and edited 50+ high-impact marketing pieces, boosting audience engagement by 15%.",
      "Aligned content strategy with core revenue goals to increase generated leads by 10%.",
    ] },
    { title: "Data Analyst", company: "Excelerate (Remote)", startDate: "Jun 2024", endDate: "Jul 2024", bullets: [
      "Reduced reporting time by 30% across 10+ campaigns via custom data visualizations in Python, Tableau, and JIRA.",
      "Delivered statistical insights driving a 12% increase in monthly campaign ROI.",
      "Authored 20+ stakeholder presentations, increasing engagement by 25%.",
    ] },
    { title: "Portfolio Manager", company: "Ilara Health", startDate: "Jun 2021", endDate: "Aug 2024", bullets: [
      "Modeled automated collection workflows via Smartsheet, reducing outstanding receivables and bad debt by 20%.",
      "Re-engaged 50 churned healthcare clients through targeted strategies, achieving a 10% reactivation rate.",
      "Managed a 120-client portfolio, driving a 15% increase in client acquisition and overall retention.",
    ] },
    { title: "Senior Sales Representative", company: "Ilara Health", startDate: "Jun 2021", endDate: "Aug 2023", bullets: [
      "Established onboarding processes exceeding GMV targets by 10% and adding KES 10M in annual revenue.",
      "Led sales training for 20 telesales reps, boosting overall product adoption rates.",
      "Promoted medical supply packages to 100+ providers, securing high-value contracts.",
    ] },
    { title: "Relationship Manager", company: "Medsource", startDate: "Jan 2020", endDate: "Feb 2021", bullets: [
      "Improved supply chain tracking efficiency by 18% through digital tool implementations.",
      "Managed 30+ corporate accounts with a 95% retention rate using Act-On CRM.",
    ] },
  ];

  const skills = Array.from(
    new Set([
      ...certifications,
      "GoHighLevel (GHL)",
      "Asana",
      "Zapier",
      "Smartsheet",
      "Act-On CRM",
      "Python",
      "Tableau",
      "JIRA",
      "PHP/MySQL",
      "Getting Things Done (GTD)",
      "Executive Calendar Management",
      "Data Visualization",
      "Cross-functional Coordination",
    ]),
  );

  const metrics: KBMetric[] = [
    { value: "+35%", label: "Executive Focus Time", detail: "Recovered through calendar realignment" },
    { value: "+12%", label: "Campaign ROI", detail: "Data Analytics & Visualization" },
    { value: "20%", label: "Reduction in Receivables", detail: "Outstanding receivables decreased" },
    { value: "95%", label: "On-Time Delivery", detail: "Cross-functional project workstreams" },
  ];

  return {
    name: "Derrick Odiwuor",
    roleTag: "Executive Operations \u00b7 PM \u00b7 CRM \u00b7 AI",
    summary:
      "High-impact operations professional and MBA candidate combining project management expertise, CRM optimization, and modern AI automation workflows to drive organizational efficiency.",
    location: "Nairobi, Kenya \u00b7 Open to Global Remote & On-site Roles",
    metrics,
    experiences,
    education: [
      { degree: "Master of Business Administration (MBA)", school: "Woolf University", years: "2025 - 2027" },
      { degree: "B.S. Analytical Chemistry", school: "Jomo Kenyatta University of Agriculture and Technology", years: "2014 - 2018" },
    ],
    certifications,
    skills,
    contact: { email: "derrickodiwuor@gmail.com", linkedin: "https://linkedin.com/in/derrickodiwuor", portfolioUrl: "" },
    sourceFile: path.relative(path.dirname(path.dirname(portfolioDir)), expPath),
  };
}

/* ----- articles ----- */

function buildArticles(articlesDir: string, articlesUrl: string): KBArticle[] {
  const dir = path.join(articlesDir, "content", "articles");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const { data, content } = matter(raw);
    return {
      slug,
      title: (data.title as string) ?? slug,
      date: (data.date as string) ?? "",
      readTime: (data.readTime as string) ?? "5 min read",
      excerpt: (data.excerpt as string) ?? "",
      author: (data.author as string) ?? "Derrick Odiwuor",
      category: (data.category as string) ?? "Article",
      url: `${articlesUrl}/${slug}`,
      body: content.trim(),
    };
  });
}

/* ----- resources ----- */

function buildResources(resourcesDir: string, resourcesUrl: string): KBResource[] {
  const tsPath = path.join(resourcesDir, "lib", "resources.ts");
  const source = readText(tsPath);
  if (!source) return [];

  const start = source.indexOf("export const resources");
  const eq = source.indexOf("=", start);
  const bracket = source.indexOf("[", eq);
  if (bracket === -1) return [];
  let depth = 0;
  let end = bracket;
  for (let i = bracket; i < source.length; i++) {
    if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const block = source.slice(bracket, end + 1);

  const objects: string[] = [];
  let objDepth = 0;
  let buf = "";
  let inStr: string | null = null;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    const prev = block[i - 1];
    if (inStr) {
      buf += ch;
      if (ch === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'") { inStr = ch; buf += ch; continue; }
    if (ch === "{") { if (objDepth === 0) buf = "{"; else buf += ch; objDepth++; continue; }
    if (ch === "}") {
      objDepth--;
      buf += ch;
      if (objDepth === 0) { objects.push(buf); buf = ""; }
      continue;
    }
    if (objDepth > 0) buf += ch;
  }

  const resources: KBResource[] = [];
  for (const obj of objects) {
    const str = (key: string): string => {
      const m = obj.match(new RegExp(`${key}:\\s*"?\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
      return m ? JSON.parse('"' + m[1] + '"') : "";
    };
    const id = str("id");
    if (!id) continue;

    const highlights: KBResourceHighlight[] = [];
    const hMatch = obj.match(/highlights:\s*\[([\s\S]*?)\]\s*,/);
    if (hMatch) {
      const hBlock = hMatch[1];
      const re = /label:\s*"((?:[^"\\]|\\.)*)"\s*,\s*detail:\s*"((?:[^"\\]|\\.)*)"/g;
      let hm;
      while ((hm = re.exec(hBlock))) {
        highlights.push({
          label: JSON.parse('"' + hm[1] + '"'),
          detail: JSON.parse('"' + hm[2] + '"'),
        });
      }
    }

    const tags: string[] = [];
    const tMatch = obj.match(/tags:\s*\[([\s\S]*?)\]/);
    if (tMatch) {
      const tm = tMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g);
      for (const m of tm) tags.push(JSON.parse('"' + m[1] + '"'));
    }

    const filename = str("filename");
    resources.push({
      id,
      title: str("title"),
      category: str("category"),
      format: str("format"),
      description: str("description"),
      highlights,
      tags,
      filename,
      version: str("version") || undefined,
      date: str("date") || undefined,
      url: resourcesUrl,
      downloadUrl: filename ? `${new URL(resourcesUrl).origin}/blueprints/${filename}` : "",
    });
  }
  return resources;
}

/* ----- testimonials ----- */

/**
 * Extract the `const testimonials = [ ... ]` array from
 * components/RecommendationsSection.tsx and parse each object literal's
 * string fields. Reuses the lightweight object walker pattern from
 * buildResources() above. We only need four string keys per testimonial
 * (name, designation, quote, src).
 */
function buildTestimonials(portfolioDir: string): KBTestimonial[] {
  const recPath = path.join(portfolioDir, "components", "RecommendationsSection.tsx");
  const source = readText(recPath);
  if (!source) return [];

  const startMarker = "const testimonials";
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return [];
  const eq = source.indexOf("=", startIdx);
  if (eq === -1) return [];
  const bracket = source.indexOf("[", eq);
  if (bracket === -1) return [];

  // Walk to matching closing bracket.
  let depth = 0;
  let end = bracket;
  let inStr: string | null = null;
  for (let i = bracket; i < source.length; i++) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : "";
    if (inStr) {
      if (ch === inStr && prev !== "\\") inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const block = source.slice(bracket, end + 1);

  // Walk top-level objects within the array.
  const objects: string[] = [];
  let objDepth = 0;
  let buf = "";
  let s: string | null = null;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    const prev = block[i - 1];
    if (s) {
      buf += ch;
      if (ch === s && prev !== "\\") s = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { s = ch; buf += ch; continue; }
    if (ch === "{") {
      if (objDepth === 0) buf = "{";
      else buf += ch;
      objDepth++;
      continue;
    }
    if (ch === "}") {
      objDepth--;
      buf += ch;
      if (objDepth === 0) { objects.push(buf); buf = ""; }
      continue;
    }
    if (objDepth > 0) buf += ch;
  }

  const out: KBTestimonial[] = [];
  for (const obj of objects) {
    const str = (key: string): string => {
      const m = obj.match(new RegExp(`${key}:\\s*"?\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
      return m ? JSON.parse('"' + m[1] + '"') : "";
    };
    const name = str("name");
    const designation = str("designation");
    const quote = str("quote");
    const src = str("src");
    if (!name || !quote) continue;
    out.push({
      name,
      designation,
      quote,
      src,
      sourceFile: path.relative(path.dirname(path.dirname(portfolioDir)), recPath),
    });
  }
  return out;
}

/* ----- portfolio section pages ----- */

/**
 * Pull every double-quoted and backtick string literal out of a TSX source
 * blob in source order. Good enough for capturing section copy (headings,
 * bullets, labels) so the assistant can answer questions about anything
 * visible on the main portfolio site without needing a headless browser.
 */
function extractTextLiterals(source: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "`") {
      // capture until matching quote, honoring \-escapes
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
      // skip single-quoted char/string — rare in JSX text; just advance past it
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
  // Prefer the first short literal that looks like a heading (no trailing
  // punctuation, <= 80 chars, not a URL/email/path).
  for (const s of literals.slice(0, 12)) {
    const t = s.trim();
    if (!t) continue;
    if (t.length > 80) continue;
    if (/https?:\/\//.test(t) || t.includes("@") || t.includes("/")) continue;
    if (/[.!?]/.test(t.slice(-1))) continue;
    return t;
  }
  return "";
}

function buildPortfolioPages(portfolioDir: string, portfolioUrl: string): KBPortfolioPage[] {
  const componentsDir = path.join(portfolioDir, "components");
  if (!fs.existsSync(componentsDir)) return [];

  const files = fs.readdirSync(componentsDir).filter((f) => f.endsWith(".tsx"));
  const pages: KBPortfolioPage[] = [];
  for (const file of files) {
    // Skip the assistant embedding widgets — their text isn't portfolio copy.
    if (/AIAssistant/i.test(file)) continue;
    const abs = path.join(componentsDir, file);
    const source = readText(abs);
    if (!source) continue;
    const allLiterals = extractTextLiterals(source).map((s) => s.trim()).filter(Boolean);
    if (allLiterals.length === 0) continue;
    const proseLiterals = allLiterals.filter(looksLikeProse);
    // Skip sections whose captured text is almost entirely JSX/Tailwind. The
    // bar: at least 5 prose strings OR >= 40% prose ratio. Mirrors the build
    // script's threshold so local dev and the committed snapshot agree.
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

/**
 * Decide whether a captured string literal is real prose vs a JSX attribute
 * (Tailwind classnames, class names, imports). Mirrors the helper in
 * `scripts/lib/portfolio-pages.ts` so the live reader and the committed
 * snapshot produce identical shapes.
 */
function looksLikeProse(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/\s/.test(t)) return false;
  if (/\$\{/.test(t)) return false;
  if (t.length > 0 && /^[a-z]+$/.test(t.replace(/\s+/g, ""))) return false;
  const tokens = t.split(/\s+/);
  const tailwindTokens = (t.match(/\b(?:flex|grid|block|inline|relative|absolute|fixed|w-\d+|h-\d+|p-\d+|m-\d+|text-(?:xs|sm|base|lg|xl|\d+xl)|font-(?:bold|semibold|medium)|bg-\S+|border-\S+|hover:\S+|md:\S+|sm:\S+|lg:\S+|dark:\S+|transition-\S+|gap-\d+|space-\S+|rounded-\S+|shadow-\S+|leading-\S+|tracking-\S+|max-w-\S+|min-w-\S+|mx-\S+|my-\S+|px-\S+|py-\S+|mt-\d+|mb-\d+|mr-\d+|ml-\d+|pt-\d+|pb-\d+|pr-\d+|pl-\d+|z-\d+|opacity-\S+|duration-\d+|ease-\S+|group\b|first:|last:|focus:|active:|placeholder)\b/g) || []).length;
  const nonTailwindTokens = tokens.filter((tok) => !/^(?:flex|grid|block|inline|relative|absolute|fixed|w-\d+|h-\d+|p-\d+|m-\d+|text-(?:xs|sm|base|lg|xl|\d+xl)|font-(?:bold|semibold|medium)|bg-\S+|border-\S+|hover:\S+|md:\S+|sm:\S+|lg:\S+|dark:\S+|transition-\S+|gap-\d+|space-\S+|rounded-\S+|shadow-\S+|leading-\S+|tracking-\S+|max-w-\S+|min-w-\S+|mx-\S+|my-\S+|px-\S+|py-\S+|mt-\d+|mb-\d+|mr-\d+|ml-\d+|pt-\d+|pb-\d+|pr-\d+|pl-\d+|z-\d+|opacity-\S+|duration-\d+|ease-\S+|group\b|first:|last:|focus:|active:|placeholder\S*)$/.test(tok)).length;
  if (tailwindTokens >= 2 && tailwindTokens > nonTailwindTokens) return false;
  if (/^(fixed|relative|absolute|inline|block|grid|flex|hover|transition|overflow|transform|group|cursor|rounded|shadow|border|bg-|text-|font-|max-w|min-w|z-\d)/.test(t)) return false;
  if (/^(use client|"use client")/.test(t)) return false;
  return true;
}

/* ----- orchestrator ----- */

let cache: { kb: KnowledgeBase; at: number } | null = null;
const CACHE_MS = 5000; // small TTL so freshly added files show up quickly

export function loadKnowledgeBase(): KnowledgeBase {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.kb;

  const portfolioDir = resolveSibling("portfolio");
  const articlesDir = resolveSibling("articles");
  const resourcesDir = resolveSibling("resources");

  // Sites resolve from env (so deployed instances can point at the live URLs
  // without touching code), falling back to the canonical live domains.
  const sites = {
    portfolio:
      process.env.NEXT_PUBLIC_PORTFOLIO_URL ||
      "https://portfoliosite-pearl-one.vercel.app/",
    ledger: process.env.NEXT_PUBLIC_LEDGER_URL || "https://ledger-article-site.vercel.app/articles",
    resources: process.env.NEXT_PUBLIC_RESOURCES_URL || "https://resources-virid-nine.vercel.app/resources",
  };

  const missingSources: string[] = [];
  if (!portfolioDir) missingSources.push("portfolio");
  if (!articlesDir) missingSources.push("articles");
  if (!resourcesDir) missingSources.push("resources");

  const profile = portfolioDir ? buildProfile(portfolioDir) : null;
  if (profile) profile.contact.portfolioUrl = sites.portfolio;
  const articles = articlesDir ? buildArticles(articlesDir, sites.ledger) : [];
  const resources = resourcesDir ? buildResources(resourcesDir, sites.resources) : [];
  const testimonials = portfolioDir ? buildTestimonials(portfolioDir) : [];
  const portfolioPages = portfolioDir ? buildPortfolioPages(portfolioDir, sites.portfolio) : [];

  // Snapshot fallback: when live sibling dirs are unreachable (typical for
  // serverless deploys like Vercel), supplement whatever the live loader
  // produced from a pre-committed data/knowledgeBase.json snapshot. This is
  // what lets the deployed chat answer correctly without bundling the
  // sibling repositories. The snapshot is regenerated by `npm run kb`.
  const liveHadAnyData =
    Boolean(profile) ||
    articles.length > 0 ||
    resources.length > 0 ||
    testimonials.length > 0 ||
    portfolioPages.length > 0;
  const snapshot = !liveHadAnyData ? loadSnapshot() : null;
  const available = liveHadAnyData
    ? missingSources.length === 0
    : snapshot !== null;

  const kb: KnowledgeBase = snapshot
    ? {
        ...snapshot,
        // Ensure forward & backward compat for fields added after the
        // snapshot was committed.
        portfolioPages: snapshot.portfolioPages ?? [],
        resources: (snapshot.resources ?? []).map((r) => ({
          ...r,
          body: r.body ?? "",
        })),
        sites,
        meta: {
          generatedAt: snapshot.meta?.generatedAt ?? new Date().toISOString(),
          available,
          missingSources: snapshot.meta?.missingSources ?? ["portfolio", "articles", "resources"],
          ...(snapshot.meta?.sourceCounts ? { sourceCounts: snapshot.meta.sourceCounts } : {}),
        },
      }
    : {
        profile,
        articles,
        resources,
        testimonials,
        portfolioPages,
        sites,
        meta: {
          generatedAt: new Date().toISOString(),
          available,
          missingSources,
        },
      };
  cache = { kb, at: Date.now() };
  return kb;
}

/**
 * Read the pre-built knowledge base snapshot committed at data/knowledgeBase.json.
 * Returns null if the file is missing or malformed so the caller can degrade
 * gracefully. Used as a fallback when live sibling-dir reads are unavailable
 * (i.e. serverless deploys).
 */
function loadSnapshot(): KnowledgeBase | null {
  const candidates = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "knowledgeBase.json"),
    path.join(__dirname, "..", "data", "knowledgeBase.json"),
  ];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw) as KnowledgeBase;
      // Light validation: must be an object with the expected top-level keys.
      if (!parsed || typeof parsed !== "object" || !("articles" in parsed) || !("resources" in parsed)) {
        continue;
      }
      // Snapshot may predate the testimonials field; backfill an empty array.
      if (!Array.isArray((parsed as Partial<KnowledgeBase>).testimonials)) {
        (parsed as Partial<KnowledgeBase>).testimonials = [];
      }
      if (!parsed.meta) {
        parsed.meta = {
          generatedAt: new Date(0).toISOString(),
          available: true,
          missingSources: [],
        };
      }
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}
