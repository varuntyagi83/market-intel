# Claude Code — Build Prompt

Paste this into Claude Code to scaffold and complete the project:

---

## PROMPT:

```
I have a partially scaffolded Next.js 14 project for a "Market Intelligence Agent" — a personal 
stock/crypto research dashboard. The backend (API routes + lib clients) is complete. I need you 
to build the frontend dashboard and wire everything together.

Project is in the current directory. Read docs/ARCHITECTURE.md for full context.

## What exists already:
- src/lib/finnhub.ts — Finnhub API client (quotes, news)
- src/lib/coingecko.ts — CoinGecko client (crypto prices)  
- src/lib/claude.ts — Claude streaming analysis client
- src/lib/markets.ts — Market definitions (US, EU, India, Crypto)
- src/lib/types.ts — All TypeScript types
- src/app/api/quotes/route.ts — GET /api/quotes?market=US
- src/app/api/news/route.ts — GET /api/news?market=US
- src/app/api/analysis/route.ts — POST (streaming SSE)
- src/app/api/deep-dive/route.ts — POST (streaming SSE)
- package.json — dependencies listed
- .env.example — env var template

## What I need you to build:

1. **Project config** — next.config.js, tailwind.config.js, tsconfig.json, postcss.config.js, 
   src/styles/globals.css

2. **Root layout** (src/app/layout.tsx) — JetBrains Mono font, dark theme, metadata

3. **Dashboard page** (src/app/dashboard/page.tsx) — Main client component that:
   - Has market tabs (US, EU, India, Crypto) in a sticky header
   - Auto-fetches prices via /api/quotes when market changes
   - Shows stock/crypto cards in a horizontal scrollable row
   - Has a news section that fetches from /api/news
   - Has an AI Analysis panel with 4 mode buttons (Full/Technical/Geopolitical/Sentiment)
   - Has a Deep Dive panel with ticker input + quick-select chips
   - Has a Custom Research text input
   - All AI sections stream responses via SSE from the API routes
   - "Fetch All" button loads prices + news in parallel

4. **Components** — Break the dashboard into clean components:
   - StockCard, NewsFeed, AnalysisPanel, DeepDivePanel, CustomQuery, MarkdownRenderer

5. **src/app/page.tsx** — Redirect to /dashboard

## Design requirements:
- Bloomberg Terminal aesthetic — dark theme, monospace, high information density
- Background: #0c0c14, Surface: #151521, Accent: #5bafff
- Green: #34d399, Red: #f87171, Muted text: #9090ac
- JetBrains Mono for everything
- Stock cards show: symbol, price, change%, high/low
- Streaming text appears progressively (not after full completion)
- Loading: animated dots, not spinners
- Responsive: single column on mobile

## SSE streaming pattern for frontend:
```typescript
const res = await fetch("/api/analysis", { method: "POST", body: JSON.stringify(payload) });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      const { text } = JSON.parse(line.slice(6));
      setText(prev => prev + text);
    }
  }
}
```

## Important:
- All API keys are server-side only (already in API routes)
- The frontend calls /api/* routes, never external APIs directly
- Prices should load in <2 seconds (parallel Finnhub calls)
- AI analysis streams so first text appears in ~3 seconds
- Use Tailwind for all styling, no external CSS libraries
```

---

## After building, test with:
```bash
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY
npm install
npm run dev
# Open http://localhost:3000
```
