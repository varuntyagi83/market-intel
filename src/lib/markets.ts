import { MarketDef, MarketKey } from "./types";

export const MARKETS: Record<MarketKey, MarketDef> = {
  US: {
    label: "US Markets",
    icon: "🇺🇸",
    tickers: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "CRM"],
    indices: ["SPY", "QQQ", "DIA"], // ETFs as index proxies (Finnhub supports these)
    finnhubCategory: "general",
  },
  EU: {
    label: "European",
    icon: "🇪🇺",
    tickers: ["SAP", "ASML", "SIE.DE", "ADS.DE", "OR.PA", "NVO", "SHEL", "AZN"],
    indices: ["EWG", "EWU", "VGK"],
    finnhubCategory: "general",
  },
  INDIA: {
    label: "India",
    icon: "🇮🇳",
    tickers: ["RELIANCE.NS", "TCS.NS", "INFY", "HDB", "IBN", "WIT", "TTM", "RDY"],
    indices: ["INDA", "INDY"],
    finnhubCategory: "general",
  },
  CRYPTO: {
    label: "Crypto",
    icon: "₿",
    tickers: ["bitcoin", "ethereum", "solana", "cardano", "ripple", "polkadot", "avalanche-2", "chainlink"],
    indices: [],
    finnhubCategory: "crypto",
  },
};

export const ANALYSIS_MODES = [
  { key: "full" as const, label: "Full Briefing", icon: "📋", desc: "Complete market intelligence" },
  { key: "technical" as const, label: "Technical", icon: "📈", desc: "Levels, RSI, MACD, setups" },
  { key: "geopolitical" as const, label: "Geopolitical", icon: "🌍", desc: "Macro, policy, risks" },
  { key: "sentiment" as const, label: "Sentiment", icon: "🎭", desc: "Flow, positioning, catalysts" },
];
