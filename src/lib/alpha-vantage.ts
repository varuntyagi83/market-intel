// ═══════════════════════════════════════════════════════════
// Alpha Vantage — Technical Indicators + News Sentiment
// Free: 25 calls/day  |  Premium $49/mo: unlimited
// ═══════════════════════════════════════════════════════════

import {
  TechnicalIndicators,
  RSIData,
  MACDData,
  BollingerData,
  SentimentScore,
  NewsSentimentResponse,
} from "./types";

const BASE = "https://www.alphavantage.co/query";
const KEY = process.env.ALPHA_VANTAGE_KEY || "";

async function avFetch(params: Record<string, string>) {
  const url = new URL(BASE);
  Object.entries({ ...params, apikey: KEY }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);
  const json = await res.json();
  if (json["Note"] || json["Information"]) {
    throw new Error("Alpha Vantage rate limit hit");
  }
  return json;
}

// ── RSI ──────────────────────────────────────────────────────

export async function getRSI(symbol: string, period = 14): Promise<RSIData> {
  const data = await avFetch({
    function: "RSI",
    symbol,
    interval: "daily",
    time_period: String(period),
    series_type: "close",
  });

  const series = data["Technical Analysis: RSI"];
  const latest = Object.values(series)[0] as Record<string, string>;
  const value = parseFloat(latest["RSI"]);

  return {
    value,
    signal: value >= 70 ? "overbought" : value <= 30 ? "oversold" : "neutral",
  };
}

// ── MACD ─────────────────────────────────────────────────────

export async function getMACD(symbol: string): Promise<MACDData> {
  const data = await avFetch({
    function: "MACD",
    symbol,
    interval: "daily",
    series_type: "close",
  });

  const series = data["Technical Analysis: MACD"];
  const latest = Object.values(series)[0] as Record<string, string>;
  const macd = parseFloat(latest["MACD"]);
  const signal = parseFloat(latest["MACD_Signal"]);
  const histogram = parseFloat(latest["MACD_Hist"]);

  return {
    macd,
    signal,
    histogram,
    trend: histogram > 0 ? "bullish" : histogram < 0 ? "bearish" : "neutral",
  };
}

// ── SMA ──────────────────────────────────────────────────────

export async function getSMA(symbol: string, period: number): Promise<number> {
  const data = await avFetch({
    function: "SMA",
    symbol,
    interval: "daily",
    time_period: String(period),
    series_type: "close",
  });

  const series = data[`Technical Analysis: SMA`];
  const latest = Object.values(series)[0] as Record<string, string>;
  return parseFloat(latest["SMA"]);
}

// ── EMA ──────────────────────────────────────────────────────

export async function getEMA(symbol: string, period: number): Promise<number> {
  const data = await avFetch({
    function: "EMA",
    symbol,
    interval: "daily",
    time_period: String(period),
    series_type: "close",
  });

  const series = data[`Technical Analysis: EMA`];
  const latest = Object.values(series)[0] as Record<string, string>;
  return parseFloat(latest["EMA"]);
}

// ── Bollinger Bands ───────────────────────────────────────────

export async function getBollingerBands(
  symbol: string,
  currentPrice?: number
): Promise<BollingerData> {
  const data = await avFetch({
    function: "BBANDS",
    symbol,
    interval: "daily",
    time_period: "20",
    series_type: "close",
    nbdevup: "2",
    nbdevdn: "2",
  });

  const series = data["Technical Analysis: BBANDS"];
  const latest = Object.values(series)[0] as Record<string, string>;
  const upper = parseFloat(latest["Real Upper Band"]);
  const middle = parseFloat(latest["Real Middle Band"]);
  const lower = parseFloat(latest["Real Lower Band"]);
  const bandwidth = ((upper - lower) / middle) * 100;

  let position: BollingerData["position"] = "inside";
  if (currentPrice !== undefined) {
    if (currentPrice > upper) position = "above";
    else if (currentPrice < lower) position = "below";
  }

  return { upper, middle, lower, bandwidth, position };
}

// ── All Technicals (parallel) ─────────────────────────────────

export async function getAllTechnicals(
  symbol: string,
  currentPrice?: number
): Promise<TechnicalIndicators> {
  const results = await Promise.allSettled([
    getRSI(symbol),
    getMACD(symbol),
    getSMA(symbol, 50),
    getSMA(symbol, 200),
    getEMA(symbol, 20),
    getBollingerBands(symbol, currentPrice),
  ]);

  const [rsiR, macdR, sma50R, sma200R, ema20R, bollingerR] = results;

  return {
    symbol,
    source: "alpha-vantage",
    rsi: rsiR.status === "fulfilled" ? rsiR.value : undefined,
    macd: macdR.status === "fulfilled" ? macdR.value : undefined,
    sma50: sma50R.status === "fulfilled" ? sma50R.value : undefined,
    sma200: sma200R.status === "fulfilled" ? sma200R.value : undefined,
    ema20: ema20R.status === "fulfilled" ? ema20R.value : undefined,
    bollinger: bollingerR.status === "fulfilled" ? bollingerR.value : undefined,
    fetchedAt: Date.now(),
  };
}

// ── News Sentiment ────────────────────────────────────────────

export async function getNewsSentiment(
  tickers: string[]
): Promise<NewsSentimentResponse> {
  const data = await avFetch({
    function: "NEWS_SENTIMENT",
    tickers: tickers.join(","),
    limit: "50",
  });

  const feed = (data.feed ?? []) as Array<{
    ticker_sentiment?: Array<{ ticker: string; ticker_sentiment_score: string; ticker_sentiment_label: string; relevance_score: string }>;
  }>;

  // Aggregate per-ticker scores
  const tickerMap = new Map<string, { sum: number; count: number }>();

  for (const article of feed) {
    for (const ts of article.ticker_sentiment ?? []) {
      if (!tickers.includes(ts.ticker)) continue;
      const score = parseFloat(ts.ticker_sentiment_score);
      const relevance = parseFloat(ts.relevance_score);
      if (relevance < 0.1) continue;
      const existing = tickerMap.get(ts.ticker) ?? { sum: 0, count: 0 };
      tickerMap.set(ts.ticker, {
        sum: existing.sum + score * relevance,
        count: existing.count + relevance,
      });
    }
  }

  const scores: SentimentScore[] = tickers.map((ticker) => {
    const agg = tickerMap.get(ticker);
    const rawScore = agg && agg.count > 0 ? agg.sum / agg.count : 0;
    return {
      ticker,
      score: rawScore,
      label: rawScore > 0.15 ? "bullish" : rawScore < -0.15 ? "bearish" : "neutral",
      source: "alpha-vantage" as const,
    };
  });

  const overallScore =
    scores.reduce((s, c) => s + c.score, 0) / (scores.length || 1);

  return {
    scores,
    overallScore,
    overallLabel:
      overallScore > 0.15 ? "bullish" : overallScore < -0.15 ? "bearish" : "neutral",
  };
}
