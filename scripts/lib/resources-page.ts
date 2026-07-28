/**
 * Capture the blueprint-presenting page text (the resources listing page +
 * the ResourceCard template) so the assistant can answer questions about the
 * page that hosts the downloads, not only the PDF/JSON payload and the
 * metadata parsed out of `lib/resources.ts`.
 *
 * Approach = same string-literal puller used elsewhere; concatenate the
 * relevant presenting-page module text into a single blob per blueprint by
 * prefixing the shared listing copy + per-resource metadata.
 */
import fs from "node:fs";
import path from "node:path";

import { extractTextLiterals } from "./portfolio-pages";

export interface ResPageInput {
  /** Absolute path to the resources repo root (contains app/ and components/). */
  resourcesDir: string;
  /** Live resources URL, e.g. https://resources-virid-nine.vercel.app/resources */
  url: string;
}

export function buildResourcesPageText(input: ResPageInput): { listingText: string } {
  const listingPath = path.join(input.resourcesDir, "app", "resources", "page.tsx");
  const cardPath = path.join(input.resourcesDir, "components", "ResourceCard.tsx");
  const listingLits: string[] = [];
  if (fs.existsSync(listingPath)) listingLits.push(...extractTextLiterals(fs.readFileSync(listingPath, "utf8")));
  if (fs.existsSync(cardPath)) listingLits.push(...extractTextLiterals(fs.readFileSync(cardPath, "utf8")));
  const listingText = listingLits.join("\n").trim();
  return { listingText };
}
