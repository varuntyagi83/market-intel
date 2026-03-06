// ═══════════════════════════════════════════════════════════
// Analysis Router — Picks the right LLM based on task type
// ═══════════════════════════════════════════════════════════

import { LLMProvider, AnalysisMode, MarketKey } from "./types";
import { buildAnalysisPrompt, createAnalysisStream } from "./claude";
import { createOpenAIStream, getOpenAIAnalysis } from "./openai";
import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;
const getAnthropic = () => _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Collect full text from a Claude stream (for consensus)
async function collectClaudeText(
  prompt: string,
  system: string,
  useSearch: boolean
): Promise<string> {
  const stream = await getAnthropic().messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
    ...(useSearch
      ? { tools: [{ type: "web_search_20250305" as any, name: "web_search" } as any] }
      : {}),
  });

  let text = "";
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      text += event.delta.text;
    }
  }
  return text;
}

// Build consensus synthesis prompt
function buildSynthesisPrompt(
  claudeOutput: string,
  gptOutput: string,
  market: MarketKey,
  mode: AnalysisMode
): { prompt: string; system: string } {
  return {
    system: `Elite market strategist synthesizing two independent AI analyses. Be direct. Use markdown. Highlight where both agree (HIGH CONVICTION) and where they diverge (REVIEW).`,
    prompt: `You have two independent analyses of ${market} markets (${mode} mode).

## Claude Sonnet Analysis:
${claudeOutput}

---

## GPT-4o Analysis:
${gptOutput}

---

Synthesize these into a unified report:
1. **CONSENSUS SIGNALS** — Where both agree (highest conviction)
2. **DIVERGENCE** — Key disagreements and why they might exist
3. **FINAL VERDICT** — Your synthesized recommendation with confidence level
4. **CONVICTION TABLE** — Top 5 signals rated 🟢/🟡/🔴 with source agreement`,
  };
}

// ── Main router ───────────────────────────────────────────────

export async function routeAnalysis(
  market: MarketKey,
  mode: AnalysisMode,
  llm: LLMProvider = "claude",
  priceData?: string,
  newsData?: string
): Promise<ReadableStream> {
  const { prompt, system } = buildAnalysisPrompt(market, mode, priceData, newsData);
  const useSearch = mode === "geopolitical" || !priceData;

  if (llm === "openai") {
    return createOpenAIStream(prompt, system);
  }

  if (llm === "claude") {
    return createAnalysisStream(prompt, system, useSearch);
  }

  // ── Consensus: run both in parallel, then stream synthesis ──
  const [claudeText, gptText] = await Promise.all([
    collectClaudeText(prompt, system, useSearch),
    getOpenAIAnalysis(prompt, system),
  ]);

  const { prompt: synthPrompt, system: synthSystem } = buildSynthesisPrompt(
    claudeText,
    gptText,
    market,
    mode
  );

  return createAnalysisStream(synthPrompt, synthSystem, false);
}
