import { streamText } from "ai";
import { resolveChat } from "@/lib/ai";
import { DEFAULT_MODEL, type ModelId } from "@/lib/site";
import { CORS_ORIGINS } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const headers: Record<string, string> = {
    "content-type": "text/plain; charset=utf-8",
    "x-vercel-ai-content-type": "text/plain; charset=utf-8",
    ...corsHeaders(allowOrigin),
  };

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

  // When no live knowledge sources are reachable (e.g. serverless deploy
  // without the sibling repos) be honest about it rather than hallucinate.
  if (!retrieval.articles.length && !retrieval.resources.length && !system.includes("Derrick")) {
    const note =
      "I could not reach Derrick's live knowledge sources from this deployment, so I have no articles, blueprints, or profile data to ground on. Please cloud-build with access to the sibling repositories, or contact Derrick to wire them up.";
    return streamText({ model: aiModel!, system, prompt:note }).toTextStreamResponse();
  }

  // Graceful fallback when no API key is configured so the UI still streams a
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
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fallback));
        controller.close();
      },
    });
    return new Response(stream, { headers });
  }

  const turnMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const result = streamText({
    model: aiModel,
    system,
    messages: turnMessages,
    temperature: 0.4,
  });

  return result.toTextStreamResponse({ headers });
}
