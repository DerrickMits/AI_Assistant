/**
 * Knowledge base ingestion.
 *
 * Reads Derrick's three live sibling repositories inside ZFolder and produces
 * /data/knowledgeBase.json, the single committed context snapshot the AI
 * assistant reranks against at query time. Also extracts:
 *   - the body text of each downloadable blueprint PDF
 *   - the blueprint-presenting page text (resources listing + card template)
 *   - the text of every section of the main portfolio site (all components)
 *
 * Sources (spec name -> actual local directory):
 *   portfoliosite      -> ../portfolio
 *   ledger_article_site-> ../articles
 *   resources          -> ../resources
 *
 * Sources live wherever `KB_SOURCES` points (default `..`, i.e. ZFolder).
 * The Vercel build step (scripts/ingest-at-build.ts) clones the siblings into
 * a temp dir and points `KB_SOURCES` at it before invoking this script.
 *
 * Run: `npm run kb` (local, reads `..`) or via the build step.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { extractPdfText } from "./lib/pdf";
import { buildPortfolioPages as buildPortfolioPagesLib } from "./lib/portfolio-pages";
import { buildResourcesPageText } from "./lib/resources-page";

const ROOT = process.cwd();
// KB_SOURCES lets the Vercel build step point this script at a freshly cloned
// sibling checkout instead of the dev `..` directory. Default = ZFolder.
const ZFOLDER = path.resolve(process.env.KB_SOURCES ?? path.join(ROOT, ".."));
const PORTFOLIO = path.join(ZFOLDER, "portfolio");
const ARTICLES = path.join(ZFOLDER, "articles");
const RESOURCES = path.join(ZFOLDER, "resources");

const ARTICLES_SITE = "https://ledger-article-site.vercel.app";
const ARTICLES_URL = `${ARTICLES_SITE}/articles`;
const RESOURCES_SITE = "https://resources-virid-nine.vercel.app";
const RESOURCES_URL = `${RESOURCES_SITE}/resources`;
const PORTFOLIO_URL =
  "https://portfoliosite-pearl-one.vercel.app/";
const LINKEDIN = "https://linkedin.com/in/derrickodiwuor";
const EMAIL = "derrickodiwuor@gmail.com";

function read(filePath: string): string {
  if (!fs.existsSync(filePath))
    throw new Error(`Missing source file: ${filePath}`);
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Pull a const array literal out of a TSX file as a best-effort text block.
 * We keep the raw JS object text so a downstream reader sees full fidelity.
 */
function extractArray(source: string, name: string): string {
  const idx = source.indexOf(`const ${name} =`);
  if (idx === -1) return "";
  let depth = 0;
  let started = false;
  let out = "";
  for (let i = idx; i < source.length; i++) {
    const ch = source[i];
    out += ch;
    if (ch === "[") {
      depth++;
      started = true;
    } else if (ch === "]") {
      depth--;
      if (started && depth === 0) break;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Capture string list items like ["A","B","C"] from an extracted snippet. */
function extractStringList(source: string, name: string): string[] {
  const arr = extractArray(source, name);
  const matches = arr.match(/"([^"]+)"/g) || [];
  return matches.map((m) => m.replace(/"/g, ""));
}

interface Profile {
  name: string;
  roleTag: string;
  summary: string;
  location: string;
  metrics: { value: string; label: string; detail: string }[];
  experiences: {
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];
  education: { degree: string; school: string; years: string }[];
  certifications: string[];
  skills: string[];
  contact: { email: string; linkedin: string; portfolioUrl: string };
  rawExperiencesText: string;
  rawMetricsText: string;
  sourceFile: string;
}

function buildProfile(): Profile {
  const heroPath = path.join(PORTFOLIO, "components", "HeroSection.tsx");
  const expPath = path.join(PORTFOLIO, "components", "ExperienceSection.tsx");
  const hero = read(heroPath);
  const exp = read(expPath);

  // Metrics: 4 fixed hero metrics.
  const metricsText = extractArray(hero, "metrics");
  const metrics = [
    { value: "+35%", label: "Executive Focus Time", detail: "Recovered through calendar realignment" },
    { value: "+12%", label: "Campaign ROI", detail: "Data Analytics & Visualization" },
    { value: "20%", label: "Reduction in Receivables", detail: "Outstanding receivables decreased" },
    { value: "95%", label: "On-Time Delivery", detail: "Cross-functional project workstreams" },
  ];

  // Experiences: transcribed structurally from ExperienceSection.tsx (durable
  // to formatting drift) plus raw text fallback for full fidelity.
  const experiences = [
    {
      title: "Executive Partner",
      company: "Athena",
      startDate: "Jun 2025",
      endDate: "Present",
      bullets: [
        "Realigned executive calendars, increasing protected focus time by 35% in 6 months.",
        "Reduced interruptions by 50% in 90 days by triaging incoming communications and investment analysis requests.",
        "Coordinated cross-functional teams using Asana to deliver 95% of 10 major projects on time.",
        "Documented optimized internal processes to enhance overall team productivity.",
      ],
    },
    {
      title: "Product Content and Email Specialist",
      company: "Gaotek (USA / Remote)",
      startDate: "Jun 2024",
      endDate: "Aug 2024",
      bullets: [
        "Implemented PHP/MySQL optimizations, raising website speed by 35% and organic traffic by 20%.",
        "Created and edited 50+ high-impact marketing pieces, boosting audience engagement by 15%.",
        "Aligned content strategy with core revenue goals to increase generated leads by 10%.",
      ],
    },
    {
      title: "Data Analyst",
      company: "Excelerate (Remote)",
      startDate: "Jun 2024",
      endDate: "Jul 2024",
      bullets: [
        "Reduced reporting time by 30% across 10+ campaigns via custom data visualizations in Python, Tableau, and JIRA.",
        "Delivered statistical insights driving a 12% increase in monthly campaign ROI.",
        "Authored 20+ stakeholder presentations, increasing engagement by 25%.",
      ],
    },
    {
      title: "Portfolio Manager",
      company: "Ilara Health",
      startDate: "Jun 2021",
      endDate: "Aug 2024",
      bullets: [
        "Modeled automated collection workflows via Smartsheet, reducing outstanding receivables and bad debt by 20%.",
        "Re-engaged 50 churned healthcare clients through targeted strategies, achieving a 10% reactivation rate.",
        "Managed a 120-client portfolio, driving a 15% increase in client acquisition and overall retention.",
      ],
    },
    {
      title: "Senior Sales Representative",
      company: "Ilara Health",
      startDate: "Jun 2021",
      endDate: "Aug 2023",
      bullets: [
        "Established onboarding processes exceeding GMV targets by 10% and adding KES 10M in annual revenue.",
        "Led sales training for 20 telesales reps, boosting overall product adoption rates.",
        "Promoted medical supply packages to 100+ providers, securing high-value contracts.",
      ],
    },
    {
      title: "Relationship Manager",
      company: "Medsource",
      startDate: "Jan 2020",
      endDate: "Feb 2021",
      bullets: [
        "Improved supply chain tracking efficiency by 18% through digital tool implementations.",
        "Managed 30+ corporate accounts with a 95% retention rate using Act-On CRM.",
      ],
    },
  ];

  const education = [
    { degree: "Master of Business Administration (MBA)", school: "Woolf University", years: "2025 - 2027" },
    { degree: "B.S. Analytical Chemistry", school: "Jomo Kenyatta University of Agriculture and Technology", years: "2014 - 2018" },
  ];

  const certifications = extractStringList(exp, "certifications").length
    ? extractStringList(exp, "certifications")
    : ["HubSpot CRM", "Salesforce CRM", "Google Analytics", "Agile Project Management"];

  // Skill surface inferred from certifications + tooling references in bullets.
  const skills = [
    "Salesforce CRM",
    "GoHighLevel (GHL)",
    "HubSpot CRM",
    "Asana",
    "Zapier",
    "Smartsheet",
    "Act-On CRM",
    "Google Analytics",
    "Python",
    "Tableau",
    "JIRA",
    "PHP/MySQL",
    "Agile Project Management",
    "Getting Things Done (GTD)",
    "Executive Calendar Management",
    "Data Visualization",
    "Cross-functional Coordination",
  ];

  return {
    name: "Derrick Odiwuor",
    roleTag: "Executive Operations \u00b7 PM \u00b7 CRM \u00b7 AI",
    summary:
      "High-impact operations professional and MBA candidate combining project management expertise, CRM optimization, and modern AI automation workflows to drive organizational efficiency.",
    location: "Nairobi, Kenya \u00b7 Open to Global Remote & On-site Roles",
    metrics,
    experiences,
    education,
    certifications,
    skills,
    contact: { email: EMAIL, linkedin: LINKEDIN, portfolioUrl: PORTFOLIO_URL },
    rawExperiencesText: extractArray(exp, "experiences"),
    rawMetricsText: metricsText,
    sourceFile: path.relative(ZFOLDER, expPath),
  };
}

interface Article {
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

function buildArticles(): Article[] {
  const dir = path.join(ARTICLES, "content", "articles");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  return files.map((file) => {
    const slug = file.replace(/\.md$/, "");
    const raw = read(path.join(dir, file));
    const { data, content } = matter(raw);
    return {
      slug,
      title: (data.title as string) ?? slug,
      date: (data.date as string) ?? "",
      readTime: (data.readTime as string) ?? "5 min read",
      excerpt: (data.excerpt as string) ?? "",
      author: (data.author as string) ?? "Derrick Odiwuor",
      category: (data.category as string) ?? "Article",
      url: `${ARTICLES_URL}/${slug}`,
      body: content.trim(),
    };
  });
}

interface KBResource {
  id: string;
  title: string;
  category: string;
  format: string;
  description: string;
  highlights: { label: string; detail: string }[];
  tags: string[];
  filename: string;
  version?: string;
  date?: string;
  url: string;
  downloadUrl: string;
  /** Extracted PDF body + blueprint-presenting page text. */
  body?: string;
}

function buildResources(): KBResource[] {
  const tsPath = path.join(RESOURCES, "lib", "resources.ts");
  if (!fs.existsSync(tsPath)) return [];
  const source = read(tsPath);
  // Parse the `export const resources: ResourceAsset[] = [ ... ]` block.
  const start = source.indexOf("export const resources");
  const eq = source.indexOf("=", start);
  const bracket = source.indexOf("[", eq);
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

  // Split into object literals at top-level brace depth.
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
      // Allow the value to sit on the same line OR on the next indented line.
      const m = obj.match(new RegExp(`${key}:\\s*"?\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m"));
      return m ? JSON.parse('"' + m[1] + '"') : "";
    };
    const id = str("id");
    if (!id) continue;

    // highlights: array of { label, detail }
    const highlights: { label: string; detail: string }[] = [];
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

    // tags
    const tags: string[] = [];
    const tMatch = obj.match(/tags:\s*\[([\s\S]*?)\]/);
    if (tMatch) {
      const tm = tMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g);
      for (const m of tm) tags.push(JSON.parse('"' + m[1] + '"'));
    }

    resources.push({
      id,
      title: str("title"),
      category: str("category"),
      format: str("format"),
      description: str("description"),
      highlights,
      tags,
      filename: str("filename"),
      version: str("version") || undefined,
      date: str("date") || undefined,
      url: RESOURCES_URL,
      downloadUrl: `${RESOURCES_SITE}/blueprints/${str("filename")}`,
    });
  }
  return resources;
}

interface KBTestimonial {
  name: string;
  designation: string;
  quote: string;
  src: string;
  sourceFile: string;
}

function buildTestimonials(): KBTestimonial[] {
  const recPath = path.join(PORTFOLIO, "components", "RecommendationsSection.tsx");
  if (!fs.existsSync(recPath)) return [];
  const source = read(recPath);

  const startIdx = source.indexOf("const testimonials");
  if (startIdx === -1) return [];
  const eq = source.indexOf("=", startIdx);
  if (eq === -1) return [];
  const bracket = source.indexOf("[", eq);
  if (bracket === -1) return [];

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
    const quote = str("quote");
    if (!name || !quote) continue;
    out.push({
      name,
      designation: str("designation"),
      quote,
      src: str("src"),
      sourceFile: path.relative(ZFOLDER, recPath),
    });
  }
  return out;
}

interface PortfolioPage {
  section: string;
  sourceFile: string;
  title: string;
  url: string;
  textBlob: string;
}

async function attachBlueprintBodies(resources: KBResource[]): Promise<number> {
  // Per blueprint: extracted PDF text + the presenting-page copy, attached to
  // each resource so the assistant can answer questions about the contents and
  // the page hosting the download. Tolerant — a missing/unparseable PDF or
  // missing presenting page just leaves body empty.
  const { listingText } = buildResourcesPageText({ resourcesDir: RESOURCES, url: RESOURCES_URL });
  let bytes = 0;
  for (const r of resources) {
    if (!r.filename) continue;
    const abs = path.join(RESOURCES, "public", "blueprints", r.filename);
    const pdfText = await extractPdfText(abs);
    const pagePart = listingText ? `--- Presenting page ---\n${listingText}` : "";
    const parts = [pdfText, pagePart].filter(Boolean);
    r.body = parts.join("\n\n").trim();
    bytes += r.body.length;
  }
  return bytes;
}

async function main() {
  console.log("\n  AI Assistant - knowledge base ingestion\n  -----------------------------------------");
  console.log("  Source dirs:");
  console.log("    portfolio :", path.relative(ZFOLDER, PORTFOLIO));
  console.log("    articles  :", path.relative(ZFOLDER, ARTICLES));
  console.log("    resources :", path.relative(ZFOLDER, RESOURCES));

  const profile = buildProfile();
  const articles = buildArticles();
  const resources = buildResources();
  const testimonials = buildTestimonials();

  const blueprintBytes = await attachBlueprintBodies(resources);

  // Main portfolio site sections - one entry per section component.
  const portfolioPages: PortfolioPage[] = fs.existsSync(PORTFOLIO)
    ? buildPortfolioPagesLib(PORTFOLIO, PORTFOLIO_URL)
    : [];

  const kb = {
    profile,
    articles,
    resources,
    testimonials,
    portfolioPages,
    sites: {
      portfolio: PORTFOLIO_URL,
      ledger: ARTICLES_URL,
      resources: RESOURCES_URL,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      sourceCounts: {
        experiences: profile.experiences.length,
        articles: articles.length,
        resources: resources.length,
        testimonials: testimonials.length,
        portfolioPages: portfolioPages.length,
        blueprintBytes,
      },
    },
  };

  const outDir = path.join(ROOT, "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "knowledgeBase.json");
  fs.writeFileSync(outPath, JSON.stringify(kb, null, 2), "utf8");

  console.log("\n  Ingested:");
  console.log("    profile        :", `name=${profile.name}, experiences=${profile.experiences.length}, certs=${profile.certifications.length}`);
  console.log("    articles       :", articles.length, "files");
  console.log("    resources      :", `${resources.length} entries, blueprint text=${blueprintBytes} chars`);
  console.log("    testimonials   :", testimonials.length, "entries");
  console.log("    portfolioPages :", portfolioPages.length, "sections");
  console.log("\n  written ->", path.relative(ROOT, outPath), "\n");
}

main().catch((err) => {
  console.error("\n  Ingestion failed:\n", err);
  process.exit(1);
});
