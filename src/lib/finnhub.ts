import { StockQuote, NewsItem } from "./types";

const BASE_URL = "https://finnhub.io/api/v1";
const API_KEY = process.env.FINNHUB_API_KEY!;

async function finnhubGet<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { cache: "no-store" }); // always fresh
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${res.statusText}`);
  return res.json();
}

interface FinnhubQuote {
  c: number;  // current
  d: number;  // change
  dp: number; // change percent
  h: number;  // high
  l: number;  // low
  o: number;  // open
  pc: number; // prev close
  t: number;  // timestamp
}

export async function getQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const data = await finnhubGet<FinnhubQuote>("/quote", { symbol });
    if (!data || data.c === 0) return null;
    return {
      symbol,
      price: data.c,
      change: data.d,
      changePct: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
    };
  } catch {
    return null;
  }
}

export async function getMultipleQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(getQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q): q is StockQuote => q !== null);
}

export async function getMarketNews(category: string = "general"): Promise<NewsItem[]> {
  try {
    const data = await finnhubGet<NewsItem[]>("/news", { category });
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export async function getCompanyNews(symbol: string, days: number = 7): Promise<NewsItem[]> {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  try {
    const data = await finnhubGet<NewsItem[]>("/company-news", { symbol, from, to });
    return Array.isArray(data) ? data.slice(0, 8) : [];
  } catch {
    return [];
  }
}

interface FinnhubProfile {
  name: string;
  ticker: string;
  marketCapitalization: number;
  finnhubIndustry: string;
  logo: string;
  weburl: string;
}

export async function getCompanyProfile(symbol: string): Promise<FinnhubProfile | null> {
  try {
    return await finnhubGet<FinnhubProfile>("/stock/profile2", { symbol });
  } catch {
    return null;
  }
}
