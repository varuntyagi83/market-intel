import { NextRequest, NextResponse } from "next/server";
import { getNewsSentiment } from "@/lib/alpha-vantage";
import { scoreSentiment } from "@/lib/openai";

export async function GET(req: NextRequest) {
  const tickersParam = req.nextUrl.searchParams.get("tickers");
  const headlinesParam = req.nextUrl.searchParams.get("headlines");
  const source = req.nextUrl.searchParams.get("source") ?? "auto";

  if (!tickersParam) {
    return NextResponse.json({ error: "tickers required" }, { status: 400 });
  }

  const tickers = tickersParam.split(",").map((t) => t.trim().toUpperCase());
  const headlines = headlinesParam ? headlinesParam.split("||") : [];

  // "auto": try Alpha Vantage (free, no GPT cost), fall back to GPT-4o-mini
  if (source === "openai" || (source === "auto" && headlines.length > 0)) {
    try {
      const data = await scoreSentiment(headlines, tickers);
      return NextResponse.json(data);
    } catch (err) {
      console.warn("OpenAI sentiment failed:", err);
    }
  }

  // Alpha Vantage news sentiment (uses its own news corpus)
  try {
    const data = await getNewsSentiment(tickers);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Sentiment fetch failed: ${err}` },
      { status: 500 }
    );
  }
}
