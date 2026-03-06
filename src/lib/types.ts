// ═══════════════════════════════════════════════════════════
// Market Intelligence Agent — Type Definitions
// ═══════════════════════════════════════════════════════════

export type MarketKey = "US" | "EU" | "INDIA" | "CRYPTO";

export interface MarketDef {
  label: string;
  icon: string;
  tickers: string[];
  indices: string[];
  finnhubCategory: string; // for news API
}

export interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  marketCap?: string;
  volume?: number;
}

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  image: string;
}

export interface NewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number; // unix timestamp
  category: string;
  related: string; // comma-separated tickers
  sentiment?: number;       // -1 to 1
  sentimentLabel?: "bullish" | "neutral" | "bearish";
}

export type AnalysisMode = "full" | "technical" | "geopolitical" | "sentiment";

export type LLMProvider = "claude" | "openai" | "consensus";

export interface AnalysisRequest {
  market: MarketKey;
  mode: AnalysisMode;
  priceData?: string; // serialized price context
  newsData?: string;  // serialized news context
  llm?: LLMProvider;  // defaults to "claude"
}

export interface DeepDiveRequest {
  symbol: string;
  priceData?: string;
}

// ─── Technical Indicators ────────────────────────────────────

export interface RSIData {
  value: number;       // 0–100
  signal: "overbought" | "neutral" | "oversold";
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  trend: "bullish" | "bearish" | "neutral";
}

export interface BollingerData {
  upper: number;
  middle: number;  // SMA20
  lower: number;
  bandwidth: number;
  position: "above" | "inside" | "below";
}

export interface TechnicalIndicators {
  symbol: string;
  source: "alpha-vantage" | "twelve-data";
  rsi?: RSIData;
  macd?: MACDData;
  sma50?: number;
  sma200?: number;
  ema20?: number;
  bollinger?: BollingerData;
  compositeSignal?: "buy" | "sell" | "neutral";
  compositeScore?: number;   // -1 to 1
  fetchedAt: number;         // unix ms
}

// ─── Sentiment ───────────────────────────────────────────────

export interface SentimentScore {
  ticker: string;
  score: number;       // -1 (bearish) to 1 (bullish)
  label: "bullish" | "neutral" | "bearish";
  source: "alpha-vantage" | "gpt-4o-mini";
  confidence?: number; // 0–1
}

export interface NewsSentimentResponse {
  scores: SentimentScore[];
  overallScore: number;
  overallLabel: "bullish" | "neutral" | "bearish";
}
