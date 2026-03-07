// ═══════════════════════════════════════════════════════════
// Stock Scout — Multi-signal discovery pipeline
// FMP screener → key metrics → sentiment → GPT-4o synthesis
// ═══════════════════════════════════════════════════════════

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { EnrichedCandidate, Strategy, ScreenerFilters } from "@/lib/fmp";
import { getScoutCandidates } from "@/lib/scout";
import { MarketKey } from "@/lib/types";

let _openai: OpenAI | null = null;
const getOpenAI = () => (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

// ── Strategy metadata ─────────────────────────────────────

const STRATEGY_LABELS: Record<Strategy, string> = {
  undervalued_quality: "Undervalued Quality",
  emerging_growth:     "Emerging Growth",
  high_fcf:            "High FCF Yield",
  deep_value:          "Deep Value",
  dividend_compounder: "Dividend Compounder",
};

// ── Format candidates as context for GPT-4o ──────────────

function pct(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n)) return "N/A";
  return `${(n * 100).toFixed(decimals)}%`;
}

function num(n: number | null | undefined, decimals = 1): string {
  if (n == null || isNaN(n) || n === 999) return "N/A";
  return n.toFixed(decimals);
}

function mktCapFmt(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n}`;
}

function buildContext(candidates: EnrichedCandidate[], strategy: Strategy): string {
  const label = STRATEGY_LABELS[strategy];
  const today = new Date().toLocaleDateString();

  const rows = candidates.map((c, i) => {
    const m = c.metrics;
    const r = c.ratios;
    const g = c.growth;
    // RatiosTTM fields (verified field names from live API)
    const pe   = r?.priceToEarningsRatioTTM;
    const pb   = r?.priceToBookRatioTTM;
    const ps   = r?.priceToSalesRatioTTM;
    const gm   = r?.grossProfitMarginTTM;
    const npm  = r?.netProfitMarginTTM;
    const opm  = r?.operatingProfitMarginTTM;
    const de   = r?.debtToEquityRatioTTM;
    const div  = r?.dividendYieldTTM;
    // KeyMetricsTTM fields
    const ev   = m?.evToEBITDATTM;
    const roe  = m?.returnOnEquityTTM;
    const fcfy = m?.freeCashFlowYieldTTM;
    return [
      `### ${i + 1}. ${c.symbol} — ${c.companyName}`,
      `**Sector:** ${c.sector} | **Industry:** ${c.industry} | **Exchange:** ${c.exchangeShortName}`,
      `**Market Cap:** ${mktCapFmt(c.marketCap)} | **Price:** $${c.price.toFixed(2)} | **Beta:** ${c.beta?.toFixed(2) ?? "N/A"}`,
      `**Signal Score:** ${c.signalScore}/100`,
      "",
      "**Valuation:**",
      `- P/E (TTM): ${num(pe)} | P/B: ${num(pb)} | EV/EBITDA: ${num(ev)} | P/S: ${num(ps)}`,
      "",
      "**Quality:**",
      `- ROE: ${pct(roe)} | ROCE: ${pct(m?.returnOnCapitalEmployedTTM)} | ROIC: ${pct(m?.returnOnInvestedCapitalTTM)}`,
      `- Gross Margin: ${pct(gm)} | Operating Margin: ${pct(opm)} | Net Margin: ${pct(npm)}`,
      `- Debt/Equity: ${num(de)} | FCF Yield: ${pct(fcfy)} | Dividend Yield: ${pct(div)}`,
      "",
      "**Growth (YoY):**",
      `- Revenue: ${pct(g?.revenueGrowth)} | Gross Profit: ${pct(g?.grossProfitGrowth)} | Net Income: ${pct(g?.netIncomeGrowth)} | EPS: ${pct(g?.epsgrowth)} | FCF: ${pct(g?.freeCashFlowGrowth)}`,
    ].join("\n");
  });

  return [
    `# Stock Scout — ${label} Strategy`,
    `Date: ${today}`,
    "",
    "The following candidates were screened and ranked by a multi-signal scoring algorithm. Analyze each one and provide your assessment.",
    "",
    ...rows,
  ].join("\n");
}

// ── Scout prompt ──────────────────────────────────────────

function buildScoutPrompt(context: string, strategy: Strategy): { system: string; prompt: string } {
  const label = STRATEGY_LABELS[strategy];

  return {
    system: `You are a senior equity research analyst specializing in discovering high-conviction stock opportunities.
You combine fundamental analysis, technical context, and macro awareness.
Be specific with numbers. Use markdown with tables. Today's date: ${new Date().toLocaleDateString()}.`,

    prompt: `${context}

---

Analyze these ${label} candidates and produce an institutional-quality research report:

## 1. Market Context
Briefly describe the current macro/sector environment relevant to these picks (search for latest data).

## 2. Candidate Rankings
Rank all candidates. For each, produce a card with:
- **Thesis** (2–3 sentences explaining why this fits the ${label} strategy RIGHT NOW)
- **Key Catalysts** (upcoming earnings, product launches, sector tailwinds, analyst upgrades)
- **Risk Factors** (company-specific + macro risks)
- **Technical Setup** (momentum, trend, key levels if known)
- **Signal Alignment** — do fundamentals + momentum + sentiment all agree? (🟢 Aligned / 🟡 Mixed / 🔴 Conflicted)

## 3. Verdict Table
| Rank | Ticker | Verdict | Conviction | Entry Zone | Target | Stop | Timeframe | Why |
|------|--------|---------|------------|------------|--------|------|-----------|-----|

Verdicts: 🟢 STRONG BUY / 🔵 BUY / 🟡 WATCH / 🔴 AVOID

## 4. Top 3 Trade Ideas
Detailed setup for your top 3: entry trigger, position sizing rationale, R:R ratio, what would invalidate the thesis.

## 5. Hidden Gem
Identify the one candidate the market may be under-appreciating and explain why.

Be specific with price levels, percentages, and timeframes throughout.`,
  };
}

// ── Route handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    market: MarketKey;
    strategy: Strategy;
    filters?: ScreenerFilters;
  };

  const { market = "US", strategy, filters = {} } = body;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        // ── Stage 1: Screen + enrich ──────────────────────
        emit({ type: "status", text: "Screening stocks…" });

        const screenFilters: ScreenerFilters = {
          sector: filters.sector,
          marketCapMoreThan: filters.marketCapMoreThan,
          marketCapLessThan: filters.marketCapLessThan,
        };

        const candidates = await getScoutCandidates(market, screenFilters, strategy, 8);

        if (!candidates.length) {
          emit({ type: "error", text: "No candidates found. Try relaxing the filters." });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        // ── Stage 2: Emit candidates for the UI table ─────
        emit({ type: "candidates", data: candidates });
        emit({ type: "status", text: `Found ${candidates.length} candidates. Running GPT-4o analysis…` });

        // ── Stage 3: Stream GPT-4o synthesis ─────────────
        const context = buildContext(candidates, strategy);
        const { system, prompt } = buildScoutPrompt(context, strategy);

        const gptStream = await getOpenAI().chat.completions.create({
          model: "gpt-4o",
          stream: true,
          messages: [
            { role: "system", content: system },
            { role: "user",   content: prompt },
          ],
          max_tokens: 4000,
        });

        for await (const chunk of gptStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) emit({ type: "text", text });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        emit({ type: "error", text: String(err) });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
