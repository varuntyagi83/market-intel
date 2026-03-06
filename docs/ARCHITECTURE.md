# Market Intelligence Agent — Claude Code Project

## 🎯 Overview

A personal market research tool that provides real-time stock/crypto prices, news sentiment, and AI-powered analysis across US, European, Indian markets and Crypto.

**Stack:** Next.js 14 (App Router) + Tailwind CSS + Finnhub API + CoinGecko API + Anthropic Claude API + Supabase (cache)

**Architecture:** Fast direct API calls for data, Claude only for AI analysis (streaming).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js App Router + Tailwind + JetBrains Mono │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Watchlist │ │ News     │ │ AI Analysis      │ │
│  │ Cards    │ │ Feed     │ │ (streaming SSE)  │ │
│  └────┬─────┘ └────┬─────┘ └───────┬──────────┘ │
└───────┼─────────────┼───────────────┼────────────┘
        │             │               │
┌───────▼─────────────▼───────────────▼────────────┐
│                 API ROUTES (Next.js)              │
│                                                   │
│  /api/quotes     → Finnhub (stocks)              │
│                  → CoinGecko (crypto)            │
│  /api/news       → Finnhub market news           │
│  /api/analysis   → Claude API (streaming)        │
│  /api/deep-dive  → Claude API (streaming)        │
└───────┬─────────────┬───────────────┬────────────┘
        │             │               │
  ┌─────▼─────┐ ┌────▼────┐  ┌──────▼───────┐
  │ Finnhub   │ │CoinGecko│  │ Anthropic    │
  │ REST API  │ │REST API │  │ Claude API   │
  │ (50ms)    │ │(100ms)  │  │ (streaming)  │
  └───────────┘ └─────────┘  └──────────────┘
```

### Why This Architecture?

1. **API routes as proxy** — Finnhub/CoinGecko called server-side (no CORS issues, API keys hidden)
2. **Claude only for analysis** — not for data fetching (too slow)
3. **Streaming** — AI analysis streams via SSE to the frontend
4. **Optional Supabase** — cache prices/news to avoid rate limits

---

## 📁 File Structure

```
market-intel/
├── .env.local                  # API keys (NEVER commit)
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── docs/
│   └── ARCHITECTURE.md         # This file
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx          # Root layout with fonts
    │   ├── page.tsx            # Redirects to /dashboard
    │   ├── dashboard/
    │   │   └── page.tsx        # Main dashboard page
    │   └── api/
    │       ├── quotes/
    │       │   └── route.ts    # GET /api/quotes?market=US
    │       ├── news/
    │       │   └── route.ts    # GET /api/news?market=US
    │       ├── analysis/
    │       │   └── route.ts    # POST /api/analysis (streaming)
    │       └── deep-dive/
    │           └── route.ts    # POST /api/deep-dive (streaming)
    ├── components/
    │   ├── Header.tsx
    │   ├── MarketSelector.tsx
    │   ├── StockCard.tsx
    │   ├── NewsFeed.tsx
    │   ├── AnalysisPanel.tsx
    │   ├── DeepDivePanel.tsx
    │   ├── CustomQuery.tsx
    │   ├── MarkdownRenderer.tsx
    │   └── LoadingDots.tsx
    ├── lib/
    │   ├── finnhub.ts          # Finnhub API client
    │   ├── coingecko.ts        # CoinGecko API client
    │   ├── claude.ts           # Claude streaming client
    │   ├── markets.ts          # Market definitions & tickers
    │   └── types.ts            # TypeScript types
    └── styles/
        └── globals.css         # Tailwind + custom styles
```

---

## 🔑 Environment Variables

```env
# .env.local
FINNHUB_API_KEY=d6leq71r01qrq6i2eol0d6leq71r01qrq6i2eolg
ANTHROPIC_API_KEY=sk-ant-xxxxx  # Your Anthropic API key
# Optional: Supabase for caching
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
```

---

## 🚀 Claude Code Prompts

Use these prompts sequentially in Claude Code to build the project:

### Phase 1: Project Setup
```
Create a Next.js 14 project with App Router, TypeScript, and Tailwind CSS.
- Use JetBrains Mono font
- Dark theme with these colors: bg #0c0c14, surface #151521, accent #5bafff, green #34d399, red #f87171
- Set up the file structure as shown in docs/ARCHITECTURE.md
- Create .env.local with placeholder API keys
- Install dependencies: @anthropic-ai/sdk
```

### Phase 2: API Clients (lib/)
```
Create the API client libraries in src/lib/:

1. finnhub.ts — Functions:
   - getQuote(symbol: string) → { symbol, price, change, changePct, high, low, open, prevClose }
   - getMultipleQuotes(symbols: string[]) → Quote[] (parallel with Promise.allSettled)
   - getMarketNews(category: string) → NewsItem[]
   - getCompanyNews(symbol: string, from: string, to: string) → NewsItem[]
   Uses FINNHUB_API_KEY from env, base URL https://finnhub.io/api/v1

2. coingecko.ts — Functions:
   - getCryptoPrices(ids: string[]) → CryptoPrice[]
   Uses https://api.coingecko.com/api/v3, no API key needed

3. claude.ts — Functions:
   - streamAnalysis(prompt: string, system: string) → ReadableStream
   Uses @anthropic-ai/sdk with streaming, model claude-sonnet-4-20250514

4. markets.ts — Market definitions for US, EU, INDIA, CRYPTO with tickers, indices, labels

5. types.ts — All TypeScript interfaces
```

### Phase 3: API Routes
```
Create Next.js API routes:

1. GET /api/quotes?market=US|EU|INDIA|CRYPTO
   - If CRYPTO → call coingecko getCryptoPrices
   - Else → call finnhub getMultipleQuotes with the market's tickers
   - Return JSON array of quotes
   - Should complete in <3 seconds

2. GET /api/news?market=US|EU|INDIA|CRYPTO
   - Call finnhub getMarketNews with appropriate category
   - Return JSON array of news items
   - Should complete in <2 seconds

3. POST /api/analysis { market, mode, priceData?, newsData? }
   - mode: "full" | "technical" | "geopolitical" | "sentiment"
   - Build appropriate prompt with price/news context
   - Stream Claude response as SSE (text/event-stream)
   - Use web_search tool for geopolitical mode

4. POST /api/deep-dive { symbol, priceData? }
   - Build deep dive prompt for the symbol
   - Stream Claude response as SSE
   - Use web_search tool
```

### Phase 4: Frontend Components
```
Build the dashboard at src/app/dashboard/page.tsx with these components:

1. Header — App title, status indicator, market selector tabs
2. StockCard — Compact card showing symbol, price, change%, high/low
3. Watchlist section — Horizontal scrollable row of StockCards, auto-fetches on market change
4. NewsFeed — List of news items with headline, source, timestamp, clickable links
5. AnalysisPanel — 4 mode buttons + streaming markdown display area
6. DeepDivePanel — Ticker input + chip buttons for quick select + streaming markdown
7. CustomQuery — Freeform input + suggested queries + streaming markdown
8. MarkdownRenderer — Renders Claude's markdown with proper styling (headers, tables, lists, bold, code)

Design: Bloomberg Terminal aesthetic, dark theme, JetBrains Mono, high contrast.
All streaming sections show text progressively as it arrives.
```

### Phase 5: Polish & Deploy
```
Final polish:
- Add loading skeletons for stock cards
- Auto-refresh prices every 60 seconds
- Keyboard shortcut: Cmd+K for custom query focus
- Mobile responsive (stack panels vertically)
- Error boundaries with retry buttons
- SEO meta tags
- Deploy to Vercel
```

---

## ⚡ Performance Targets

| Action | Target | Method |
|--------|--------|--------|
| Load prices | <2s | Parallel Finnhub calls |
| Load news | <1s | Single Finnhub call |
| Start AI stream | <3s | Claude streaming SSE |
| Full AI analysis | 15-30s | Streaming (visible in 3s) |
| Market switch | <2s | Auto-fetch on tab change |
| Deep dive first text | <3s | Claude streaming |

---

## 🔒 Security Notes

- All API keys server-side only (API routes)
- No keys exposed to browser
- Finnhub free tier: 60 calls/minute
- CoinGecko free tier: 30 calls/minute
- Claude: standard rate limits apply

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "@anthropic-ai/sdk": "^0.39",
    "tailwindcss": "^3.4",
    "typescript": "^5.4"
  }
}
```
