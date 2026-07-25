/**
 * Live brand property. The deployed portfolio domain was provided by Derrick;
 * env overrides are supported in case the deploy URL changes again.
 */
export const SITE = {
  name: "Derrick Odiwuor",
  role: "Executive Operations Coordinator \u00b7 MBA Candidate \u00b7 Automation Specialist",
  portfolioUrl:
    process.env.NEXT_PUBLIC_PORTFOLIO_URL ||
    "https://portfoliosite-pearl-one.vercel.app/",
  ledgerUrl: process.env.NEXT_PUBLIC_LEDGER_URL || "https://ledger-article-site.vercel.app",
  articlesUrl:
    process.env.NEXT_PUBLIC_LEDGER_URL || "https://ledger-article-site.vercel.app/articles",
  resourcesUrl:
    process.env.NEXT_PUBLIC_RESOURCES_URL || "https://resources-virid-nine.vercel.app/resources",
  githubRepo: "https://github.com/DerrickMits/AI_Assistant",
  contact: {
    email: "derrickodiwuor@gmail.com",
    linkedin: "https://linkedin.com/in/derrickodiwuor",
  },
} as const;

export type ModelId = "flash" | "pro";
export const DEFAULT_MODEL: ModelId = "flash";

/** Domains allowed to call /api/chat cross-origin (CORS). Add more as needed. */
export const CORS_ORIGINS = [
  "https://portfoliosite-pearl-one.vercel.app",
  "https://portfoliosite-kk69f8ey6-derrickmits-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
].concat(
  (process.env.CORS_ALLOW_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);
