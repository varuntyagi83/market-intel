# Market Intelligence Agent — Extended Architecture

## Multi-Source Data + Multi-LLM Analysis

---

## 📡 Data Sources Matrix

### Prices & Market Data

| Source | What You Get | Free Tier | Speed | Best For |
|--------|-------------|-----------|-------|----------|
| **Finnhub** (already integrated) | Real-time quotes, fundamentals, peers | 60 calls/min | ~50ms | US/EU stocks, primary source |
| **Alpha Vantage** | Quotes + **50+ technical indicators** (RSI, MACD, Bollinger, SMA, EMA pre-calculated) | 25 calls/day (free), 75/min (premium $49/mo) | ~200ms | Technical analysis — the killer feature |
| **Twelve Data** | 100+ technical indicators, OHLCV, real-time | 800 calls/day (free), 8/min | ~150ms | Alternative to Alpha Vantage, higher free tier |
| **CoinGecko** (already integrated) | Crypto prices, market cap, volume, 24h change | 30 calls/min, 10K/month | ~100ms | Crypto — no key needed |
| **TAAPI.IO** | 200+ technical indicators, crypto-focused | Limited free | ~100ms | Advanced crypto TA |
| **FMP (Financial Modeling Prep)** | Fundamentals, financials, SEC filings, technical indicators | 250 calls/day (free) | ~200ms | Deep fundamental data |
| **Yahoo Finance (via yfinance on server)** | Everything — prices, options, fundamentals, news | Unlimited (unofficial) | ~500ms | Backup/fallback, most comprehensive |

### News & Sentiment

| Source | What You Get | Free Tier | Best For |
|--------|-------------|-----------|----------|
| **Finnhub News** (already integrated) | General + company-specific news | Included in free tier | Primary news source |
| **Alpha Vantage News Sentiment** | AI-scored news with ticker-level sentiment | Included in free tier | Sentiment scoring |
| **Marketaux** | 80+ markets, 5K+ sources, sentiment tags | 100 calls/day | Multi-market news |
| **NewsAPI.org** | 150K+ sources, keyword search | 100 calls/day (dev) | Broad news search |
| **GNews** | Google News aggregation | 100 calls/day | Quick headlines |

### Technical Analysis (Pre-Computed)

| Source | Indicators | Notes |
|--------|-----------|-------|
| **Alpha Vantage** | RSI, MACD, SMA, EMA, Bollinger, Stochastic, ADX, OBV, CCI, VWAP, ATR + 40 more | Best free TA API — returns computed values |
| **Twelve Data** | 100+ indicators, all customizable periods | Higher free call limit than AV |
| **Finnhub** | Aggregate indicator (buy/sell/neutral signal) | Simple but useful composite signal |
| **TAAPI.IO** | 200+ indicators, crypto exchanges | Best for crypto TA |

---

## 🧠 Multi-LLM Analysis Engine

### Why Multiple LLMs?

Different models have different strengths. Use each where it excels:

| LLM | Use For | Strength |
|-----|---------|----------|
| **Claude Sonnet 4** | Deep analysis, research reports, nuanced reasoning | Best at synthesis, long-form analysis, structured output |
| **GPT-4o** | Quick summaries, sentiment classification, data extraction | Fast, good at structured JSON output, tool use |
| **GPT-4o-mini** | Sentiment scoring, news classification (bulk) | Cheapest, fast, great for high-volume simple tasks |
| **Claude Haiku** | Quick classification, simple summarization | Fast + cheap for simple tasks |

### Recommended Multi-LLM Architecture

```
┌─────────────────────────────────────────────────────┐
│                 ANALYSIS ROUTER                      │
│  Picks the right LLM based on task type              │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Quick tasks (sentiment, classification):             │
│  → GPT-4o-mini or Claude Haiku (~0.5s, $0.0001)     │
│                                                       │
│  Medium tasks (news summary, price analysis):         │
│  → GPT-4o (~2s, $0.005)                              │
│                                                       │
│  Deep tasks (full briefing, deep dive, geopolitical): │
│  → Claude Sonnet 4 + web search (~15s, $0.02)        │
│                                                       │
│  Consensus mode (high conviction signals):            │
│  → Run both Claude + GPT-4o, compare outputs          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Implementation — OpenAI Integration

```typescript
// src/lib/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fast sentiment scoring for news batch
export async function scoreSentiment(headlines: string[]): Promise<SentimentScore[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Score each headline sentiment as JSON: {score: -1 to 1, label: bullish|neutral|bearish}"
    }, {
      role: "user",
      content: headlines.map((h, i) => `${i+1}. ${h}`).join("\n")
    }],
    response_format: { type: "json_object" },
  });
  return JSON.parse(response.choices[0].message.content!);
}

// GPT-4o for structured analysis
export async function quickAnalysis(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Concise market analyst. Markdown format." },
      { role: "user", content: prompt }
    ],
    stream: true,
  });
  // Stream back to client via SSE
  // ...
}

// Consensus mode: run both, compare
export async function consensusAnalysis(prompt: string) {
  const [claudeResult, gptResult] = await Promise.all([
    claudeAnalysis(prompt),  // from claude.ts
    quickAnalysis(prompt),   // from openai.ts
  ]);
  
  // Then ask Claude to synthesize both perspectives
  return synthesize(claudeResult, gptResult);
}
```

### New Environment Variables

```env
# .env.local (updated)
FINNHUB_API_KEY=d6leq71r01qrq6i2eol0d6leq71r01qrq6i2eolg
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Optional additional data sources
ALPHA_VANTAGE_KEY=xxxxx          # Free: alphavantage.co
TWELVE_DATA_KEY=xxxxx            # Free: twelvedata.com
NEWSAPI_KEY=xxxxx                # Free: newsapi.org
MARKETAUX_KEY=xxxxx              # Free: marketaux.com
```

---

## 🏗️ Updated API Routes

### New Routes to Add

```
GET  /api/technicals?symbol=AAPL
     → Calls Alpha Vantage for RSI, MACD, SMA(50), SMA(200), Bollinger
     → Returns computed indicator values (not raw price data)
     → ~1 second for all 5 indicators in parallel

GET  /api/sentiment?tickers=AAPL,MSFT
     → Calls Alpha Vantage News Sentiment API
     → OR batch-scores via GPT-4o-mini
     → Returns per-ticker sentiment scores

POST /api/analysis { market, mode, llm: "claude" | "openai" | "consensus" }
     → Routes to appropriate LLM
     → "consensus" runs both in parallel, then synthesizes
```

### Updated File Structure

```
src/lib/
├── finnhub.ts          # ✅ Already built
├── coingecko.ts        # ✅ Already built
├── claude.ts           # ✅ Already built
├── openai.ts           # 🆕 OpenAI client (GPT-4o + mini)
├── alpha-vantage.ts    # 🆕 Technical indicators + news sentiment
├── twelve-data.ts      # 🆕 Alternative TA source
├── newsapi.ts          # 🆕 Broad news search
├── analysis-router.ts  # 🆕 Routes tasks to the right LLM
├── markets.ts          # ✅ Already built
└── types.ts            # ✅ Already built (extend with new types)
```

---

## ⚡ Recommended Build Order for Claude Code

### Phase 1 (what's already built):
✅ Finnhub + CoinGecko + Claude + API routes + types

### Phase 2 — Add Alpha Vantage Technical Indicators:
```
Add src/lib/alpha-vantage.ts with functions:
- getRSI(symbol, period=14) 
- getMACD(symbol)
- getSMA(symbol, period=50)
- getBollingerBands(symbol)
- getNewsSentiment(tickers)
- getAllTechnicals(symbol) → parallel call for all indicators

Add GET /api/technicals?symbol=AAPL route that calls getAllTechnicals()
Add a TechnicalPanel component showing indicator gauges/values
```

### Phase 3 — Add OpenAI:
```
Add src/lib/openai.ts with:
- scoreSentiment(headlines[]) → GPT-4o-mini for fast batch scoring
- streamAnalysis(prompt) → GPT-4o streaming for analysis
- Add "llm" toggle to the Analysis panel UI (Claude / GPT-4o / Both)
- Add POST /api/analysis route update to accept llm parameter

Install: npm install openai
```

### Phase 4 — Add News Sources:
```
Add src/lib/newsapi.ts — broader news search
Add src/lib/alpha-vantage-news.ts — sentiment-scored news
Update /api/news route to aggregate from multiple sources
Deduplicate headlines, merge sentiment scores
```

### Phase 5 — Consensus Mode:
```
Add src/lib/analysis-router.ts:
- Routes to Claude or OpenAI based on task
- "Consensus" mode runs both in parallel
- Synthesizes into unified report with agreement/disagreement markers
Add "🔮 Consensus" button to analysis panel
```

---

## 💰 Cost Estimate (Personal Use)

| Service | Monthly Cost | Usage |
|---------|-------------|-------|
| Finnhub | Free | 60 calls/min covers everything |
| CoinGecko | Free | 30/min, more than enough |
| Alpha Vantage | Free or $49/mo | Free = 25/day (tight), Premium = unlimited TA |
| Twelve Data | Free | 800/day backup |
| Claude API | ~$5-15/mo | ~50 analysis calls/day at $0.02 each |
| OpenAI API | ~$3-8/mo | GPT-4o-mini for sentiment (~$0.0001/call) + GPT-4o for analysis |
| **Total** | **~$8-72/mo** | Depends on Alpha Vantage tier |

---

## 🎯 The "Dream Stack" Summary

**Data (instant, <1 second):**
- Finnhub → stock prices, quotes
- CoinGecko → crypto prices
- Alpha Vantage → pre-computed RSI, MACD, Bollinger, SMA/EMA
- Finnhub + Alpha Vantage + NewsAPI → news from multiple sources

**Intelligence (streaming, 3-15 seconds):**
- GPT-4o-mini → bulk sentiment scoring (fast, cheap)
- GPT-4o → quick structured analysis
- Claude Sonnet 4 → deep research, full briefings, web search
- Consensus mode → both LLMs for high-conviction signals

**Storage (optional, future):**
- Supabase → cache prices, store analysis history, watchlists
- n8n → scheduled data refresh workflows
