// ═══════════════════════════════════════════════════════════
// NSE India — Real-time quotes (free, no API key)
// Source: NSE India official API (public endpoints)
// Prices returned in ₹ — no FX conversion needed
// Supports parallel fetching — no rate limits observed
// ═══════════════════════════════════════════════════════════

import { StockQuote } from "./types";

const NSE_BASE = "https://www.nseindia.com/api";

// NSE requires browser-like headers to avoid 401/blocked responses
const NSE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
  Origin: "https://www.nseindia.com",
};

interface NSEPriceInfo {
  lastPrice: number;
  change: number;
  pChange: number;
  previousClose: number;
  open: number;
  intraDayHighLow: { min: number; max: number };
}

interface NSEResponse {
  metadata?: { symbol: string };
  priceInfo?: NSEPriceInfo;
}

export async function getNSEQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(`${NSE_BASE}/quote-equity?symbol=${symbol}`, {
      headers: NSE_HEADERS,
      next: { revalidate: 60 }, // cache 60s — NSE data is real-time
    });

    if (!res.ok) return null;

    const data: NSEResponse = await res.json();
    const p = data.priceInfo;
    if (!p || !p.lastPrice) return null;

    return {
      symbol,
      price: p.lastPrice,
      change: p.change,
      changePct: p.pChange,
      prevClose: p.previousClose,
      open: p.open,
      high: p.intraDayHighLow?.max ?? 0,
      low: p.intraDayHighLow?.min ?? 0,
    };
  } catch {
    return null;
  }
}

// Fetch all NSE symbols in parallel — much faster than Alpha Vantage sequential
export async function getNSEQuotes(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(getNSEQuote));
  return results
    .filter(
      (r): r is PromiseFulfilledResult<StockQuote> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}
