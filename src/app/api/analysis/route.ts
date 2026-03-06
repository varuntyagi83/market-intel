import { NextRequest } from "next/server";
import { AnalysisMode, MarketKey, LLMProvider } from "@/lib/types";
import { routeAnalysis } from "@/lib/analysis-router";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { market, mode, priceData, newsData, llm = "claude" } = body as {
    market: MarketKey;
    mode: AnalysisMode;
    priceData?: string;
    newsData?: string;
    llm?: LLMProvider;
  };

  const stream = await routeAnalysis(market, mode, llm, priceData, newsData);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
