// ═══════════════════════════════════════════════════════════
// Twelve Data — Alternative Technical Indicators
// Free: 800 calls/day, 8/min  |  No key needed for basic
// ═══════════════════════════════════════════════════════════

import { TechnicalIndicators, RSIData, MACDData, BollingerData } from "./types";

const BASE = "https://api.twelvedata.com";
const KEY = process.env.TWELVE_DATA_KEY || "";

async function tdFetch(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${BASE}${endpoint}`);
  Object.entries({ ...params, ...(KEY ? { apikey: KEY } : {}) }).forEach(
    ([k, v]) => url.searchParams.set(k, v)
  );
  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Twelve Data ${res.status}`);
  const json = await res.json();
  if (json.status === "error") throw new Error(json.message);
  return json;
}

// ── RSI ──────────────────────────────────────────────────────

export async function getRSI(symbol: string, period = 14): Promise<RSIData> {
  const data = await tdFetch("/rsi", {
    symbol,
    interval: "1day",
    time_period: String(period),
    outputsize: "1",
  });

  const value = parseFloat(data.values?.[0]?.rsi ?? data.rsi);
  return {
    value,
    signal: value >= 70 ? "overbought" : value <= 30 ? "oversold" : "neutral",
  };
}

// ── MACD ─────────────────────────────────────────────────────

export async function getMACD(symbol: string): Promise<MACDData> {
  const data = await tdFetch("/macd", {
    symbol,
    interval: "1day",
    outputsize: "1",
  });

  const v = data.values?.[0] ?? data;
  const macd = parseFloat(v.macd);
  const signal = parseFloat(v.macd_signal);
  const histogram = parseFloat(v.macd_hist);

  return {
    macd,
    signal,
    histogram,
    trend: histogram > 0 ? "bullish" : histogram < 0 ? "bearish" : "neutral",
  };
}

// ── SMA ──────────────────────────────────────────────────────

export async function getSMA(symbol: string, period: number): Promise<number> {
  const data = await tdFetch("/sma", {
    symbol,
    interval: "1day",
    time_period: String(period),
    outputsize: "1",
  });
  return parseFloat(data.values?.[0]?.sma ?? data.sma);
}

// ── EMA ──────────────────────────────────────────────────────

export async function getEMA(symbol: string, period: number): Promise<number> {
  const data = await tdFetch("/ema", {
    symbol,
    interval: "1day",
    time_period: String(period),
    outputsize: "1",
  });
  return parseFloat(data.values?.[0]?.ema ?? data.ema);
}

// ── Bollinger Bands ───────────────────────────────────────────

export async function getBollingerBands(
  symbol: string,
  currentPrice?: number
): Promise<BollingerData> {
  const data = await tdFetch("/bbands", {
    symbol,
    interval: "1day",
    time_period: "20",
    outputsize: "1",
  });

  const v = data.values?.[0] ?? data;
  const upper = parseFloat(v.upper_band);
  const middle = parseFloat(v.middle_band);
  const lower = parseFloat(v.lower_band);
  const bandwidth = ((upper - lower) / middle) * 100;

  let position: BollingerData["position"] = "inside";
  if (currentPrice !== undefined) {
    if (currentPrice > upper) position = "above";
    else if (currentPrice < lower) position = "below";
  }

  return { upper, middle, lower, bandwidth, position };
}

// ── All Technicals (parallel, used as Alpha Vantage fallback) ─

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
    source: "twelve-data",
    rsi: rsiR.status === "fulfilled" ? rsiR.value : undefined,
    macd: macdR.status === "fulfilled" ? macdR.value : undefined,
    sma50: sma50R.status === "fulfilled" ? sma50R.value : undefined,
    sma200: sma200R.status === "fulfilled" ? sma200R.value : undefined,
    ema20: ema20R.status === "fulfilled" ? ema20R.value : undefined,
    bollinger: bollingerR.status === "fulfilled" ? bollingerR.value : undefined,
    fetchedAt: Date.now(),
  };
}
