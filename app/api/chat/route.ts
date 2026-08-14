import { generateText, type LanguageModel } from "ai";
import { resolveChat } from "@/lib/ai";
import { pickModel } from "@/lib/ai";
import { DEFAULT_MODEL, type ModelId } from "@/lib/site";
import { CORS_ORIGINS } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Models to try in order when the primary one is rate-limited. Gemini's
 * Hobbyscale (free-tier) quotas often exhaust after a handful of requests
 * per minute; rotating across models keeps the assistant answering every
 * prompt instead of going silent mid-conversation.
 */
const MODEL_CHAIN: ModelId[] = ["flash", "pro", "flash"];

/**
 * Run generateText with retry-on-rate-limit across the model chain.
 * On any error that looks like a quota / rate-limit failure, we back off
 * and try the next model. After exhausting the chain we throw the last
 * error so the caller can surface a useful message to the operator.
 */
async function generateWithRetry(
  baseModel: LanguageModel,
  opts: {
    system: string;
    messages?: { role: "user" | "assistant" | "system"; content: string }[];
    prompt?: string;
    temperature?: number;
  },
  { retries = 3, baseDelayMs = 800 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<string> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const model =
      attempt === 0 ? baseModel : pickModel(MODEL_CHAIN[attempt % MODEL_CHAIN.length]);
    try {
      const text = opts.prompt
        ? (
            await generateText({
              model,
              system: opts.system,
              prompt: opts.prompt,
              temperature: opts.temperature ?? 0.4,
            })
          ).text
        : (
            await generateText({
              model,
              system: opts.system,
              messages: opts.messages ?? [],
              temperature: opts.temperature ?? 0.4,
            })
          ).text;
      return text;
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|quota|rate.?limit|resource.?exhausted/i.test(msg);
      if (!isRateLimit) throw err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

interface IncomingMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface IncomingBody {
  messages: IncomingMessage[];
  model?: ModelId;
}

/**
 * CORS pre-flight. The portfolio (a different Next.js app + domain) calls this
 * route cross-origin from its embedded assistant drawer and its standalone AI
 * link, so we explicitly allow the deployed portfolio origins plus localhost.
 */
export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : "";
  return new Response(null, {
    status: allowOrigin ? 204 : 403,
    headers: corsHeaders(allowOrigin),
  });
}

function corsHeaders(allowOrigin: string) {
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as Record<string, string>;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin = CORS_ORIGINS.includes(origin) ? origin : "";

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders(allowOrigin) },
    });
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages provided" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders(allowOrigin) },
    });
  }

  const model: ModelId = body.model === "pro" ? "pro" : DEFAULT_MODEL;
  const { system, model: aiModel, hasKey, retrieval } = resolveChat({ messages, model });

  // Elara name-call detection: if the user calls her by name with a short
  // greeting / standalone mention, respond with a creative "What can I do for
  // you?" before diving into normal processing. This keeps the interaction
  // feeling personal without burning a model call for trivial greetings.
  const ELARA_GREETINGS = [
    "What can I do for you?",
    "How can I assist you today?",
    "At your service — what do you need?",
    "I'm here. What shall we tackle?",
    "Ready when you are. What's on your mind?",
    "Name's Elara. What can I help you with?",
    "You called? I'm all ears.",
    "Here and ready — what's the task?",
    "What's on your mind?",
    "How may I be of service?",
  ];
  const lastUserMsg = messages.filter((m) => m.role === "user").pop();
  const lastUserContent = lastUserMsg?.content?.trim().toLowerCase() ?? "";
  const isNameCall =
    /^elara$/.test(lastUserContent) ||
    /^(hey|hi|hello|yo|sup)\s+elara$/.test(lastUserContent) ||
    /^elara[,!]\s/.test(lastUserContent) ||
    /^(hey|hi|hello|yo|sup)\s+elara[,!]?\s/.test(lastUserContent);
  const prevAssistantCount = messages.filter((m) => m.role === "assistant").length;

  if (isNameCall && prevAssistantCount === 0) {
    const greeting = ELARA_GREETINGS[Math.floor(Math.random() * ELARA_GREETINGS.length)];
    return new Response(greeting, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
    });
  }

  // When no knowledge is reachable on disk AND the live-fetch fallback also
  // returned nothing (e.g. a cold deploy with no network to the sibling
  // sites), be honest about it rather than hallucinate.
  if (
    !retrieval.articles.length &&
    !retrieval.resources.length &&
    !retrieval.portfolioPages.length &&
    !system.includes("Derrick")
  ) {
    const note =
      "I could not reach Derrick's live knowledge sources from this deployment, so I have no articles, blueprints, or profile data to ground on. Please ensure the sibling repositories are present (local) or reachable at the deployed URLs (production), or contact Derrick to wire them up.";
    try {
      const text = await generateWithRetry(aiModel!, {
        system,
        prompt: note,
      });
      return new Response(text, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(message, {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
      });
    }
  }

  // Graceful fallback when no API key is configured so the UI still returns a
  // coherent operator-facing answer plus the retrieved entries.
  if (!hasKey || !aiModel) {
    const fallback =
      "I'm Derrick's AI Assistant, but the GEMINI_API_KEY environment variable is not set on this deployment, so I cannot reach the model yet.\n\n" +
      "To make me fully operational, an operator should add `GEMINI_API_KEY` to the environment (see `.env.example`). Once the key is in place I am grounded on Derrick's portfolio, his articles on The Ledger, and the blueprints in the Resources Hub.\n\n" +
      "Here is what I retrieved for your question:\n" +
      (retrieval.scores.length === 0
        ? "No specific knowledge entries matched this query yet, so try asking about Derrick's career, his articles (e.g. the Zapier workflow guide), or his downloadable blueprints."
        : retrieval.scores
            .map((sc) => `- ${sc.kind}: ${sc.id} (relevance ${sc.score})`)
            .join("\n"));

    return new Response(fallback, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
    });
  }

  const turnMessages = messages
    .filter((m): m is IncomingMessage & { role: "user" | "assistant" } =>
      m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const text = await generateWithRetry(aiModel, {
      system,
      messages: turnMessages,
      temperature: 0.4,
    });

    return new Response(text, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
    });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? `Model error: ${err.message}`
      : "An unexpected error occurred while calling the model. Please try again.";
    return new Response(message, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", ...corsHeaders(allowOrigin) },
    });
  }
}
