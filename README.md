# Derrick's AI Assistant

An interactive operational assistant and knowledge engine for **Derrick Odiwuor**, built as a pixel-near replica of the Google Gemini UI. It answers questions about Derrick's career, his long-form articles on **The Ledger**, and his downloadable blueprints in the **Resources Hub** grounded strictly on content read live from his three sibling repositories.

Built with Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + the Vercel AI SDK on Google Gemini.

## Quick start

```bash
npm install
cp .env.example .env.local      # then add your GEMINI_API_KEY
npm run dev                     # http://localhost:3000  (reads sibling repos live)
```

> Note: the assistant reads `../portfolio`, `../articles`, and `../resources`
> straight from disk at query time, so any article, blueprint, or profile edit
> added to those sites is reference-able the moment it lands without rebuilding
> the assistant. The optional `npm run kb` snapshot is no longer required for
> normal operation.


Get a Gemini API key at <https://aistudio.google.com/app/apikey>.

Without a key the app still boots and the chat route returns a coherent "set the key" placeholder plus the retrieved knowledge entries, so the build and UI are usable in preview.

## How it works

```
User question
   │
   ▼
app/api/chat/route.ts                   lib/knowledge.ts (live reader)
   │  loadKnowledgeBase() ─────────────► reads ../portfolio, ../articles,
   │                                      ../resources straight from disk and
   │                                      parses Markdown (gray-matter) +
   │                                      blueprint metadata at request time,
   │                                      refreshed within a 5s cache window
   │
   ▼
lib/ai.ts (selectContext)
   │  tokenizes the query, scores every article + blueprint by
   │  keyword overlap on title / tags / excerpt / highlights / body,
   │  keeps top-6 articles + top-4 blueprints
   ▼
lib/prompts.ts (buildSystemPrompt)
   │  injects the reranked entries + Derrick's profile into the
   │  Markdown Prompting system prompt (Role / Objective / Context /
   │  Instructions / Notes)
   ▼
ai streamText({ model: gemini-2.5-flash|pro, system, messages })
   │  streams the text back to the client
   ▼
@ai-sdk/react useChat() in components/ChatShell.tsx  +  portfolio drawer
```

This route is CORS-enabled so the portfolio (a separate Next app on a different
domain) embeds the same assistant via a slide-in drawer that posts cross-origin
to this `/api/chat`.


### Knowledge ingestion (`scripts/build-knowledge.ts`)

Reads Derrick's three sibling repos inside `ZFolder/` and produces a single committed snapshot at `data/knowledgeBase.json`:

| Spec name | Sibling local repo | Source |
| --- | --- | --- |
| portfoliosite | `../portfolio` | Career profile, metrics, education, certifications (from `components/HeroSection.tsx` + `ExperienceSection.tsx`) |
| ledger_article_site | `../articles` | All 11 Markdown articles parsed with `gray-matter` |
| resources | `../resources` | 13 blueprint entries from `lib/resources.ts` + 13 download PDFs |

New articles, blueprints, or profile edits committed to those sibling repos are
picked up automatically within the cache window.

> The legacy `npm run kb` snapshot script (`scripts/build-knowledge.ts`) is
> preserved for offline cold-starts or tests; production reads live.

### Live reference links

The assistant steers users to the deployed sites, recovered from Derrick's portfolio Navbar:

- **Portfolio**: https://portfoliosite-kk69f8ey6-derrickmits-projects.vercel.app/
- **The Ledger (articles)**: https://ledger-article-site.vercel.app/articles/[slug]
- **Resources Hub**: https://resources-virid-nine.vercel.app/resources
- **Contact**: derrickodiwuor@gmail.com · https://linkedin.com/in/derrickodiwuor

> Note: the original brief referenced `resources-hub.vercel.app`, which is not the deployed Resources domain. This project uses the live `resources-virid-nine.vercel.app` so the assistant's citation links resolve correctly.

## UI

Dark-only, locked to the Gemini aesthetic: collapsible slate sidebar (New chat, Search chats with `Cmd+K`, Images / Videos / Library, Notebooks, Recents with pin/unpin, profile bar with "Pro" badge and Settings), gradient chat canvas with the `Hi Derrick, what's the move?` empty state greeting, floating sparkle widget, central input bar with `+` attachments, model selector (Flash / Pro), mic, and streaming Stop button. Sessions persist to `localStorage` with pinned and recent grouping.

Type `Enter` to send, `Shift+Enter` for a newline.

## Project structure

```
AI_Assistant/
├─ app/
│  ├─ layout.tsx          # dark root + metadata
│  ├─ page.tsx            # renders <ChatShell/>
│  ├─ globals.css         # Tailwind v4 + Gemini theme tokens + .chat-prose
│  └─ api/chat/route.ts   # POST handler: rerank + streamText
├─ components/
│  ├─ Sidebar.tsx
│  ├─ ChatArea.tsx
│  ├─ InputBar.tsx
│  ├─ MarkdownContent.tsx
│  └─ icons.tsx           # Gemini starburst wordmark
├─ hooks/useChat.ts       # persisted chat sessions + localStorage
├─ lib/
│  ├─ ai.ts               # selectContext (reranker) + pickModel + resolveChat
│  ├─ knowledge.ts        # KB loader + types
│  ├─ prompts.ts          # Instruction-3 system prompt template
│  ├─ site.ts             # live brand URLs + ModelId
│  ├─ types.ts            # ChatMessage, ChatSession
│  └─ utils.ts            # cn(...)
├─ scripts/build-knowledge.ts
└─ data/knowledgeBase.json  # committed context snapshot (intentionally tracked)
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Next dev server |
| `npm run build` | Production build (Turbopack) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (next) |
| `npm run kb` | Rebuild the knowledge base from sibling repos |
| `npm run typecheck` | `tsc --noEmit` |

## Git

Initialize and connect to GitHub:

```bash
git init -b main
git remote add origin https://github.com/DerrickMits/AI_Assistant.git
git add .
git commit -m "feat: Derrick's AI Assistant (Gemini UI + grounded knowledge)"
git push -u origin main
```

`/data/knowledgeBase.json` is tracked intentionally because it is the assistant's runtime context source. `.env*.local` is ignored.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes | Google Gemini API access |

## License

© Derrick Odiwuor. All rights reserved.
