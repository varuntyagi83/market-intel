// ═══════════════════════════════════════════════════════════
// NewsAPI — Broad news search (150K+ sources)
// Free: 100 calls/day (developer tier)
// ═══════════════════════════════════════════════════════════

import { NewsItem } from "./types";

const BASE = "https://newsapi.org/v2";
const KEY = process.env.NEWSAPI_KEY || "";

interface NewsAPIArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string; // ISO string
  source: { name: string };
  content?: string;
}

export async function searchFinanceNews(query: string, pageSize = 20): Promise<NewsItem[]> {
  if (!KEY) return [];

  const url = new URL(`${BASE}/everything`);
  url.searchParams.set("q", query);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("apiKey", KEY);

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  const articles: NewsAPIArticle[] = data.articles ?? [];

  return articles
    .filter((a) => a.title && a.url && !a.title.includes("[Removed]"))
    .map((a, i) => ({
      id: i + 100000, // offset to avoid collision with Finnhub ids
      headline: a.title,
      summary: a.description ?? "",
      source: a.source.name,
      url: a.url,
      image: a.urlToImage ?? "",
      datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000),
      category: "general",
      related: "",
    }));
}

export async function getMarketHeadlines(market: string): Promise<NewsItem[]> {
  const queryMap: Record<string, string> = {
    US: "US stock market OR Wall Street OR S&P 500 OR NASDAQ",
    EU: "European stock market OR DAX OR FTSE OR Euro Stoxx",
    INDIA: "Indian stock market OR NSE OR BSE OR Sensex OR Nifty",
    CRYPTO: "cryptocurrency OR Bitcoin OR Ethereum OR crypto market",
  };

  const query = queryMap[market] ?? "stock market";
  return searchFinanceNews(query, 15);
}
