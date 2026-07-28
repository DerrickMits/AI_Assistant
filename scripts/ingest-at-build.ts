/**
 * Vercel build-time ingestion entrypoint.
 *
 * When `KB_INGEST_AT_BUILD=1` is set in the AI_Assistant Vercel project env,
 * this shallow-clones Derrick's three sibling content repos (portfolio,
 * articles, resources) into a build-only checkout at `.kb-sources/`, then runs
 * `scripts/build-knowledge.ts` pointed at it (`KB_SOURCES`), regenerating the
 * committed `data/knowledgeBase.json` snapshot the assistant reranks against.
 *
 * The sibling repos are public, so no token is required by default. If any of
 * them later become private, set `GH_TOKEN` on the project and the clone URLs
 * will be rewritten to embed it.
 *
 * Tolerance contract:
 *   - If `KB_INGEST_AT_BUILD` is not set, this script is a no-op: local `next
 *     build` (and any preview deploy without the flag) keeps using whatever
 *     snapshot is already committed.
 *   - If a clone fails or PDF extraction errors, we log a warning and fall
 *     back to the existing committed `data/knowledgeBase.json` rather than
 *     failing the deploy. A stale KB is better than a broken production build.
 *
 * Run indirectly via `npm run build` (which calls this before `next build`).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, ".kb-sources");

const REPOS: { dir: string; url: string }[] = [
  { dir: "portfolio", url: "https://github.com/DerrickMits/portfoliosite.git" },
  { dir: "articles", url: "https://github.com/DerrickMits/ledger_article_site.git" },
  { dir: "resources", url: "https://github.com/DerrickMits/resources.git" },
];

function git(args: string[], opts: { cwd?: string } = {}) {
  return execFileSync("git", args, { stdio: "inherit", ...opts });
}

function embedToken(url: string, token: string | undefined): string {
  if (!token) return url;
  return url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

async function main() {
  if (process.env.KB_INGEST_AT_BUILD !== "1") {
    console.log("\n  [kb] KB_INGEST_AT_BUILD not set; skipping build-time ingestion. Using committed snapshot.");
    return;
  }

  console.log("\n  [kb] Build-time knowledge base ingestion\n  -----------------------------------------");
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  let ok = true;
  fs.rmSync(SOURCES_DIR, { recursive: true, force: true });
  fs.mkdirSync(SOURCES_DIR, { recursive: true });

  for (const r of REPOS) {
    const dest = path.join(SOURCES_DIR, r.dir);
    const url = embedToken(r.url, token);
    try {
      console.log(`  [kb] cloning ${r.dir} ...`);
      git(["clone", "--depth=1", "--quiet", url, dest]);
    } catch {
      ok = false;
      console.warn(`  [kb] WARN: clone of ${r.dir} failed; the snapshot will omit its fresh content.`);
    }
  }

  if (!ok) {
    // Decide whether to bail entirely. If at least one repo cloned, the build
    // script will simply skip the missing dirs and reuse partial data; if all
    // three failed, fall back to the existing committed snapshot.
    const anyCloned = REPOS.some((r) => fs.existsSync(path.join(SOURCES_DIR, r.dir)));
    if (!anyCloned) {
      console.warn("  [kb] All sibling clones failed; aborting ingestion to keep the existing snapshot.");
      return;
    }
  }

  // Hand off to the generator with KB_SOURCES pointed at the checkout.
  try {
    execFileSync(
      "npx",
      ["tsx", "scripts/build-knowledge.ts"],
      { stdio: "inherit", env: { ...process.env, KB_SOURCES: SOURCES_DIR } },
    );
    console.log("  [kb] ingestion complete.");
  } catch {
    console.warn("  [kb] WARN: build-knowledge.ts failed; keeping the existing committed snapshot.");
  } finally {
    // Don't ship the cloned sources in the deploy output.
    fs.rmSync(SOURCES_DIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("\n  [kb] ingest-at-build failed (non-fatal):\n", err);
  process.exit(0);
});
