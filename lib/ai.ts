import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { loadKnowledgeBase, type KBArticle, type KBResource, type KnowledgeBase } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/prompts";
import { type ModelId } from "@/lib/site";
import { SITE } from "@/lib/site";

const STOPWORDS = new Set([
  "a","an","the","and","or","but","if","then","else","of","for","with","without","in","on","at","by","to","from",
  "is","are","was","were","be","been","being","do","does","did","doing","how","what","why","when","who","whom",
  "which","that","this","these","those","it","its","i","you","he","she","they","we","me","my","your","his","her",
  "their","our","as","about","into","over","under","again","can","will","just","please","tell","explain","show",
  "give","need","like","want","get","using","use","help","derrick","odiwuor","ai","assistant",
]);

/** Lowercase, strip punctuation, drop stop words and very short tokens. */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function overlap(queryTokens: string[], doc: string): number {
  const docTokens = new Set(tokenize(doc));
  let score = 0;
  for (const t of queryTokens) {
    if (docTokens.has(t)) score += 1;
    // Light stem bonus: reward shared word roots.
    if (docTokens.has(t + "s") || docTokens.has(t + "es") || docTokens.has(t + "ing")) score += 0.5;
  }
  return score;
}

export interface RetrievalResult {
  articles: KBArticle[];
  resources: KBResource[];
  scores: { kind: string; id: string; score: number }[];
}

/**
 * Rerank knowledge entries against a user query by token overlap on the
 * title, tags, excerpt, and body, then keep the top K per section.
 */
export function selectContext(
  query: string,
  kb: KnowledgeBase,
  opts: { articleK?: number; resourceK?: number } = {},
): RetrievalResult {
  const articleK = opts.articleK ?? 6;
  const resourceK = opts.resourceK ?? 4;
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return {
      articles: kb.articles.slice(0, articleK),
      resources: kb.resources.slice(0, resourceK),
      scores: [],
    };
  }

  const scoredArticles = kb.articles
    .map((a) => {
      const doc = [a.title, a.category, a.excerpt, a.body].join(" | ");
      return { kind: "article", id: a.slug, score: overlap(queryTokens, doc), entry: a };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, articleK);

  const scoredResources = kb.resources
    .map((r) => {
      const doc = [r.title, r.category, r.tags.join(" "), r.description, r.highlights.map((h) => `${h.label} ${h.detail}`).join(" ")].join(" | ");
      return { kind: "resource", id: r.id, score: overlap(queryTokens, doc), entry: r };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, resourceK);

  return {
    articles: scoredArticles.map((s) => s.entry),
    resources: scoredResources.map((s) => s.entry),
    scores: [...scoredArticles, ...scoredResources].map((s) => ({ kind: s.kind, id: s.id, score: s.score })),
  };
}

/** Configured Gemini provider. Reads the spec's GEMINI_API_KEY env var,
 *  falling back to the conventional AI SDK env name if only that is set. */
const provider = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

/** Map the UI model id to the Gemini model identifier. */
export function pickModel(modelId: ModelId) {
  const id = modelId === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
  return provider(id);
}

export interface ChatRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  model: ModelId;
}

export interface ResolvedChat {
  system: string;
  model: ReturnType<typeof pickModel> | null;
  retrieval: RetrievalResult;
  hasKey: boolean;
}

/** Resolve the system prompt + model for an incoming chat request. */
export function resolveChat(req: ChatRequest): ResolvedChat {
  const kb = loadKnowledgeBase();
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";
  const retrieval = selectContext(query, kb);
  const system = buildSystemPrompt({
    articles: retrieval.articles,
    resources: retrieval.resources,
    profile: kb.profile,
  });
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  const model = hasKey ? pickModel(req.model) : null;
  return { system, model, retrieval, hasKey };
}

export const __site = SITE; // avoid unused import warning if tree-shaken
