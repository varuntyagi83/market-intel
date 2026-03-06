import Anthropic from "@anthropic-ai/sdk";
import { AnalysisMode, MarketKey } from "./types";
import { MARKETS } from "./markets";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export function buildAnalysisPrompt(
  market: MarketKey,
  mode: AnalysisMode,
  priceCtx?: string,
  newsCtx?: string
): { prompt: string; system: string } {
  const m = MARKETS[market];
  const data = priceCtx ? `\nCurrent prices:\n${priceCtx}` : "";
  const news = newsCtx ? `\nRecent news:\n${newsCtx}` : "";
  const today = new Date().toLocaleDateString();

  const system = `Elite institutional market research analyst. Be concise, specific with numbers, price levels, percentages. Use markdown formatting. Date: ${today}.`;

  const prompts: Record<AnalysisMode, string> = {
    full: `${m.label} comprehensive briefing.${data}${news}\n\nCover: overview, technicals (support/resistance/RSI top 5 stocks as table), sentiment, and signals (🟢HIGH CONVICTION/🟡WATCH/🔴CAUTION with entry/target/stop for each). Risk assessment. Specific numbers throughout.`,
    technical: `${m.label} technical analysis.${data}\n\nFor each stock: support, resistance, RSI(14), MACD signal, trend direction as table. Top 3 trade setups: entry, stop, target, R:R ratio, timeframe, confidence.`,
    geopolitical: `${m.label} geopolitical & macro intelligence.${news}\n\nSearch web for latest. Central bank watch, geopolitical risks, economic indicators, currency/commodity impact, sector rotation framework, risk matrix table with probability/impact.`,
    sentiment: `${m.label} sentiment & flow.${data}${news}\n\nFear/greed reading, VIX, put/call, institutional positioning, retail sentiment, contrarian opportunities, catalyst calendar. Score each stock sentiment as table.`,
  };

  return { prompt: prompts[mode], system };
}

export function buildDeepDivePrompt(symbol: string, priceCtx?: string): { prompt: string; system: string } {
  const today = new Date().toLocaleDateString();
  return {
    prompt: `Deep dive: ${symbol}. ${priceCtx || "Search for current price."}\n\nSearch web for latest data. Cover:\n- Price action & trend\n- Technicals table (50/200 SMA, RSI, MACD, Bollinger)\n- Support levels (S1/S2/S3) and Resistance (R1/R2/R3)\n- Fundamentals (P/E, revenue growth, margins, FCF, debt)\n- Recent catalysts & analyst actions\n- Sentiment (consensus, price targets, institutional ownership)\n- Risk factors (company, sector, macro)\n- Verdict table: conviction, direction, timeframe, entry, stop, target 1, target 2, position sizing\n- 2-sentence thesis`,
    system: `Senior equity research analyst producing institutional-grade reports. Extremely specific with numbers. Markdown with tables. Date: ${today}.`,
  };
}

export async function createAnalysisStream(
  prompt: string,
  system: string,
  useWebSearch: boolean = true
): Promise<ReadableStream> {
  const tools: Anthropic.Tool[] = useWebSearch
    ? [{ type: "web_search_20250305" as any, name: "web_search" } as any]
    : [];

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: prompt }],
    ...(tools.length > 0 ? { tools } : {}),
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}
