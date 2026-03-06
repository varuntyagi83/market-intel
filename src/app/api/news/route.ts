import { NextRequest, NextResponse } from "next/server";
import { getMarketNews, getCompanyNews } from "@/lib/finnhub";
import { getMarketHeadlines } from "@/lib/newsapi";
import { MARKETS } from "@/lib/markets";
import { MarketKey, NewsItem } from "@/lib/types";

function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.headline.toLowerCase().slice(0, 60).replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Fetch company-specific news for a few key tickers (EU / India markets)
async function getTickerNews(tickers: string[], count = 3): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    tickers.slice(0, count).map((t) => getCompanyNews(t, 3))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") as MarketKey;

  if (!market || !MARKETS[market]) {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }

  let finnhubNews: NewsItem[] = [];

  if (market === "CRYPTO") {
    // Finnhub has a dedicated crypto category
    const r = await Promise.allSettled([getMarketNews("crypto")]);
    finnhubNews = r[0].status === "fulfilled" ? r[0].value : [];
  } else if (market === "US") {
    // US general market news works well
    const r = await Promise.allSettled([getMarketNews("general")]);
    finnhubNews = r[0].status === "fulfilled" ? r[0].value : [];
  } else {
    // EU / INDIA: use company-specific news for the market's tickers
    finnhubNews = await getTickerNews(MARKETS[market].tickers, 4);
  }

  // NewsAPI gives broader market-specific headlines (uses market-specific queries)
  const newsapiResult = await Promise.allSettled([getMarketHeadlines(market)]);
  const newsapiNews: NewsItem[] =
    newsapiResult[0].status === "fulfilled" ? newsapiResult[0].value : [];

  const merged = deduplicateNews([...finnhubNews, ...newsapiNews]);
  merged.sort((a, b) => b.datetime - a.datetime);

  return NextResponse.json(merged.slice(0, 40));
}
