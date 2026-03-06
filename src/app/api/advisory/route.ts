import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
const getClient = () => _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AdvisoryVerdict {
  symbol: string;
  verdict: "BUY" | "HOLD" | "SELL";
  conviction: "HIGH" | "MEDIUM" | "LOW";
  entry?: string;
  target?: string;
  stop?: string;
  upside?: string;
  timeframe: string;
  reason: string;
}

export async function POST(req: NextRequest) {
  const { symbol, market, quotes } = await req.json();

  const today = new Date().toLocaleDateString();
  const tools = [{ type: "web_search_20250305" as any, name: "web_search" } as any];

  let prompt: string;

  if (symbol) {
    // Single stock advisory
    prompt = `Today: ${today}. Research ${symbol} thoroughly using web search — latest price, technicals, fundamentals, analyst ratings, recent news, and catalysts.

Return ONLY valid JSON (no markdown fences, no extra text):
{
  "verdicts": [{
    "symbol": "${symbol}",
    "verdict": "BUY or HOLD or SELL",
    "conviction": "HIGH or MEDIUM or LOW",
    "entry": "$XXX (ideal entry price or range)",
    "target": "$XXX (12-month price target)",
    "stop": "$XXX (stop-loss level)",
    "upside": "+XX% or -XX% potential",
    "timeframe": "e.g. 3-6 months",
    "reason": "2 concise sentences explaining the key thesis and main risk"
  }]
}`;
  } else {
    // Market-wide advisories
    const priceCtx = quotes ? JSON.stringify(quotes.slice(0, 15), null, 2) : "";
    prompt = `Today: ${today}. ${market} market advisory. Search web for latest signals, analyst ratings, and catalysts for each stock.
${priceCtx ? `\nCurrent prices:\n${priceCtx}\n` : ""}
Return ONLY valid JSON (no markdown fences, no extra text) — one verdict per stock:
{
  "verdicts": [
    {
      "symbol": "TICKER",
      "verdict": "BUY or HOLD or SELL",
      "conviction": "HIGH or MEDIUM or LOW",
      "upside": "+XX% or -XX%",
      "timeframe": "short/medium/long term horizon",
      "reason": "1 concise sentence — key catalyst or risk"
    }
  ]
}`;
  }

  try {
    const msg = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `Elite portfolio manager and equity research analyst. Return ONLY valid JSON — no markdown, no code blocks, no extra text before or after the JSON object.`,
      messages: [{ role: "user", content: prompt }],
      tools,
    });

    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    // Extract JSON — strip any accidental markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
