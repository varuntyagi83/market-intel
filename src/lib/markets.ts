import { MarketDef, MarketKey } from "./types";

export const MARKETS: Record<MarketKey, MarketDef> = {
  US: {
    label: "US Markets",
    icon: "🇺🇸",
    // Magnificent 7 + key large-caps
    tickers: ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AMD", "JPM", "V"],
    indices: ["SPY", "QQQ", "DIA"],
    finnhubCategory: "general",
  },
  EU: {
    label: "European",
    icon: "🇪🇺",
    // Major European blue-chips — all NYSE/NASDAQ listed (Finnhub free tier compatible)
    // ASML=Netherlands, NVO=Denmark, SAP=Germany, AZN=UK, SHEL=UK,
    // ARM=UK, SNY=France(Sanofi), BNTX=Germany, NXPI=Netherlands, VOD=UK
    tickers: ["ASML", "NVO", "SAP", "AZN", "SHEL", "ARM", "SNY", "BNTX", "NXPI", "VOD"],
    indices: ["EWG", "EWU", "VGK"],
    finnhubCategory: "general",
  },
  INDIA: {
    label: "India",
    icon: "🇮🇳",
    // BSE-listed stocks via Alpha Vantage (prices in ₹ — no conversion needed)
    // Prefix BSE: signals the quotes route to use Alpha Vantage instead of Finnhub
    tickers: [
      "RELIANCE.BSE",    // Reliance Industries
      "TCS.BSE",         // Tata Consultancy Services
      "HDFCBANK.BSE",    // HDFC Bank
      "INFY.BSE",        // Infosys
    ],
    indices: [], // INDA/INDY are USD ETFs — not meaningful alongside ₹ BSE quotes
    finnhubCategory: "general",
  },
  CRYPTO: {
    label: "Crypto",
    icon: "₿",
    // Top 8 by market cap (CoinGecko IDs)
    tickers: ["bitcoin", "ethereum", "solana", "ripple", "binancecoin", "cardano", "avalanche-2", "chainlink"],
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
