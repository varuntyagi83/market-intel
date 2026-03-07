// ═══════════════════════════════════════════════════════════
// Financial Modeling Prep (FMP) — Fundamentals + Growth
// Free tier: 250 calls/day | https://financialmodelingprep.com
// Stable endpoints: /stable/* (v3/v4 screener deprecated Aug 2025)
//
// API budget per scout run:
//   sector filter  (~15 stocks × 3 calls) = ~45 calls   ✓
//   all sectors    (~30 stocks × 3 calls) = ~90 calls   ✓
//   3 calls/stock: key-metrics-ttm + ratios-ttm + financial-growth
//   profile is hardcoded — no API call needed
// ═══════════════════════════════════════════════════════════

import { MarketKey } from "./types";

const BASE = "https://financialmodelingprep.com/stable";
const KEY = process.env.FMP_KEY || "";

class FMPRateLimitError extends Error {
  constructor() { super("FMP daily limit reached (250 calls/day). Try again tomorrow."); }
}

class FMPPremiumError extends Error {
  constructor(symbol: string) { super(`FMP free tier does not support ${symbol}. EU & India require an FMP premium plan.`); }
}

async function fmpFetch(path: string, params: Record<string, string> = {}, revalidate = 86400) {
  const url = new URL(`${BASE}${path}`);
  Object.entries({ ...params, apikey: KEY }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { next: { revalidate } });
  const text = await res.text();

  // FMP sometimes returns a plain-text error (not JSON)
  if (!text.startsWith("[") && !text.startsWith("{")) {
    if (text.includes("Limit")) throw new FMPRateLimitError();
    if (text.includes("Premium") || text.includes("subscription")) {
      throw new FMPPremiumError(params.symbol ?? path);
    }
    throw new Error(`FMP error: ${text.slice(0, 120)}`);
  }

  const json = JSON.parse(text);
  if (json?.["Error Message"]) {
    const msg = String(json["Error Message"]);
    if (msg.includes("Limit")) throw new FMPRateLimitError();
    if (msg.includes("Premium") || msg.includes("subscription")) {
      throw new FMPPremiumError(params.symbol ?? path);
    }
    throw new Error(`FMP: ${msg}`);
  }
  return json;
}

// ── Embedded universe (avoids profile API calls) ──────────
// Only 3 API calls per stock: key-metrics + ratios + growth

export interface UniverseEntry {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  country: string;
}

const UNIVERSE: Record<string, Record<string, UniverseEntry[]>> = {
  US: {
    Technology: [
      { symbol: "MSFT",  name: "Microsoft",          sector: "Technology", industry: "Software", exchange: "NASDAQ", country: "US" },
      { symbol: "AAPL",  name: "Apple",               sector: "Technology", industry: "Consumer Electronics", exchange: "NASDAQ", country: "US" },
      { symbol: "NVDA",  name: "NVIDIA",              sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "US" },
      { symbol: "GOOGL", name: "Alphabet",            sector: "Technology", industry: "Internet", exchange: "NASDAQ", country: "US" },
      { symbol: "META",  name: "Meta Platforms",      sector: "Technology", industry: "Social Media", exchange: "NASDAQ", country: "US" },
      { symbol: "CRM",   name: "Salesforce",          sector: "Technology", industry: "Software", exchange: "NYSE", country: "US" },
      { symbol: "ADBE",  name: "Adobe",               sector: "Technology", industry: "Software", exchange: "NASDAQ", country: "US" },
      { symbol: "ORCL",  name: "Oracle",              sector: "Technology", industry: "Software", exchange: "NYSE", country: "US" },
      { symbol: "AMD",   name: "AMD",                 sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "US" },
      { symbol: "AVGO",  name: "Broadcom",            sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "US" },
      { symbol: "PANW",  name: "Palo Alto Networks",  sector: "Technology", industry: "Cybersecurity", exchange: "NASDAQ", country: "US" },
      { symbol: "CRWD",  name: "CrowdStrike",         sector: "Technology", industry: "Cybersecurity", exchange: "NASDAQ", country: "US" },
      { symbol: "PLTR",  name: "Palantir",            sector: "Technology", industry: "Data Analytics", exchange: "NYSE", country: "US" },
      { symbol: "NET",   name: "Cloudflare",          sector: "Technology", industry: "Cloud", exchange: "NYSE", country: "US" },
      { symbol: "DDOG",  name: "Datadog",             sector: "Technology", industry: "Cloud Monitoring", exchange: "NASDAQ", country: "US" },
    ],
    Healthcare: [
      { symbol: "LLY",   name: "Eli Lilly",           sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "US" },
      { symbol: "UNH",   name: "UnitedHealth",        sector: "Healthcare", industry: "Managed Care", exchange: "NYSE", country: "US" },
      { symbol: "ABBV",  name: "AbbVie",              sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "US" },
      { symbol: "MRK",   name: "Merck",               sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "US" },
      { symbol: "AMGN",  name: "Amgen",               sector: "Healthcare", industry: "Biotechnology", exchange: "NASDAQ", country: "US" },
      { symbol: "VRTX",  name: "Vertex Pharmaceuticals", sector: "Healthcare", industry: "Biotechnology", exchange: "NASDAQ", country: "US" },
      { symbol: "REGN",  name: "Regeneron",           sector: "Healthcare", industry: "Biotechnology", exchange: "NASDAQ", country: "US" },
      { symbol: "ISRG",  name: "Intuitive Surgical",  sector: "Healthcare", industry: "Medical Devices", exchange: "NASDAQ", country: "US" },
      { symbol: "DXCM",  name: "DexCom",              sector: "Healthcare", industry: "Medical Devices", exchange: "NASDAQ", country: "US" },
      { symbol: "ELV",   name: "Elevance Health",     sector: "Healthcare", industry: "Managed Care", exchange: "NYSE", country: "US" },
    ],
    "Financial Services": [
      { symbol: "V",     name: "Visa",                sector: "Financial Services", industry: "Credit Services", exchange: "NYSE", country: "US" },
      { symbol: "MA",    name: "Mastercard",          sector: "Financial Services", industry: "Credit Services", exchange: "NYSE", country: "US" },
      { symbol: "JPM",   name: "JPMorgan Chase",      sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "US" },
      { symbol: "GS",    name: "Goldman Sachs",       sector: "Financial Services", industry: "Capital Markets", exchange: "NYSE", country: "US" },
      { symbol: "SPGI",  name: "S&P Global",          sector: "Financial Services", industry: "Financial Data", exchange: "NYSE", country: "US" },
      { symbol: "MCO",   name: "Moody's",             sector: "Financial Services", industry: "Financial Data", exchange: "NYSE", country: "US" },
      { symbol: "BLK",   name: "BlackRock",           sector: "Financial Services", industry: "Asset Management", exchange: "NYSE", country: "US" },
      { symbol: "AXP",   name: "American Express",    sector: "Financial Services", industry: "Credit Services", exchange: "NYSE", country: "US" },
      { symbol: "COF",   name: "Capital One",         sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "US" },
      { symbol: "SCHW",  name: "Charles Schwab",      sector: "Financial Services", industry: "Brokers", exchange: "NYSE", country: "US" },
    ],
    "Consumer Cyclical": [
      { symbol: "AMZN",  name: "Amazon",              sector: "Consumer Cyclical", industry: "E-Commerce", exchange: "NASDAQ", country: "US" },
      { symbol: "TSLA",  name: "Tesla",               sector: "Consumer Cyclical", industry: "Auto Manufacturers", exchange: "NASDAQ", country: "US" },
      { symbol: "HD",    name: "Home Depot",          sector: "Consumer Cyclical", industry: "Home Improvement", exchange: "NYSE", country: "US" },
      { symbol: "BKNG",  name: "Booking Holdings",    sector: "Consumer Cyclical", industry: "Travel", exchange: "NASDAQ", country: "US" },
      { symbol: "ABNB",  name: "Airbnb",              sector: "Consumer Cyclical", industry: "Travel", exchange: "NASDAQ", country: "US" },
      { symbol: "NKE",   name: "Nike",                sector: "Consumer Cyclical", industry: "Footwear", exchange: "NYSE", country: "US" },
      { symbol: "LULU",  name: "Lululemon",           sector: "Consumer Cyclical", industry: "Apparel", exchange: "NASDAQ", country: "US" },
      { symbol: "CMG",   name: "Chipotle",            sector: "Consumer Cyclical", industry: "Restaurants", exchange: "NYSE", country: "US" },
      { symbol: "COST",  name: "Costco",              sector: "Consumer Cyclical", industry: "Wholesale", exchange: "NASDAQ", country: "US" },
      { symbol: "TJX",   name: "TJX Companies",       sector: "Consumer Cyclical", industry: "Apparel Retail", exchange: "NYSE", country: "US" },
    ],
    "Consumer Defensive": [
      { symbol: "WMT",   name: "Walmart",             sector: "Consumer Defensive", industry: "Discount Stores", exchange: "NYSE", country: "US" },
      { symbol: "PG",    name: "Procter & Gamble",    sector: "Consumer Defensive", industry: "Household Products", exchange: "NYSE", country: "US" },
      { symbol: "KO",    name: "Coca-Cola",           sector: "Consumer Defensive", industry: "Beverages", exchange: "NYSE", country: "US" },
      { symbol: "PEP",   name: "PepsiCo",             sector: "Consumer Defensive", industry: "Beverages", exchange: "NASDAQ", country: "US" },
      { symbol: "MDLZ",  name: "Mondelēz",            sector: "Consumer Defensive", industry: "Packaged Foods", exchange: "NASDAQ", country: "US" },
      { symbol: "CL",    name: "Colgate-Palmolive",   sector: "Consumer Defensive", industry: "Household Products", exchange: "NYSE", country: "US" },
      { symbol: "GIS",   name: "General Mills",       sector: "Consumer Defensive", industry: "Packaged Foods", exchange: "NYSE", country: "US" },
    ],
    Industrials: [
      { symbol: "CAT",   name: "Caterpillar",         sector: "Industrials", industry: "Farm & Heavy Construction", exchange: "NYSE", country: "US" },
      { symbol: "HON",   name: "Honeywell",           sector: "Industrials", industry: "Conglomerates", exchange: "NASDAQ", country: "US" },
      { symbol: "DE",    name: "Deere & Company",     sector: "Industrials", industry: "Farm & Heavy Construction", exchange: "NYSE", country: "US" },
      { symbol: "GE",    name: "GE Aerospace",        sector: "Industrials", industry: "Aerospace & Defense", exchange: "NYSE", country: "US" },
      { symbol: "RTX",   name: "RTX Corp",            sector: "Industrials", industry: "Aerospace & Defense", exchange: "NYSE", country: "US" },
      { symbol: "UPS",   name: "UPS",                 sector: "Industrials", industry: "Air Freight", exchange: "NYSE", country: "US" },
      { symbol: "CTAS",  name: "Cintas",              sector: "Industrials", industry: "Staffing", exchange: "NASDAQ", country: "US" },
      { symbol: "ITW",   name: "Illinois Tool Works",  sector: "Industrials", industry: "Machinery", exchange: "NYSE", country: "US" },
    ],
    Energy: [
      { symbol: "XOM",   name: "ExxonMobil",          sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", country: "US" },
      { symbol: "CVX",   name: "Chevron",             sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", country: "US" },
      { symbol: "COP",   name: "ConocoPhillips",      sector: "Energy", industry: "Oil & Gas E&P", exchange: "NYSE", country: "US" },
      { symbol: "EOG",   name: "EOG Resources",       sector: "Energy", industry: "Oil & Gas E&P", exchange: "NYSE", country: "US" },
      { symbol: "SLB",   name: "Schlumberger",        sector: "Energy", industry: "Oil & Gas Equipment", exchange: "NYSE", country: "US" },
      { symbol: "MPC",   name: "Marathon Petroleum",  sector: "Energy", industry: "Oil & Gas Refining", exchange: "NYSE", country: "US" },
      { symbol: "OXY",   name: "Occidental Petroleum", sector: "Energy", industry: "Oil & Gas E&P", exchange: "NYSE", country: "US" },
    ],
    "Communication Services": [
      { symbol: "GOOG",  name: "Alphabet (C)",        sector: "Communication Services", industry: "Internet", exchange: "NASDAQ", country: "US" },
      { symbol: "NFLX",  name: "Netflix",             sector: "Communication Services", industry: "Entertainment", exchange: "NASDAQ", country: "US" },
      { symbol: "DIS",   name: "Walt Disney",         sector: "Communication Services", industry: "Entertainment", exchange: "NYSE", country: "US" },
      { symbol: "TMUS",  name: "T-Mobile US",         sector: "Communication Services", industry: "Telecom", exchange: "NASDAQ", country: "US" },
      { symbol: "CMCSA", name: "Comcast",             sector: "Communication Services", industry: "Telecom", exchange: "NASDAQ", country: "US" },
    ],
    "Basic Materials": [
      { symbol: "LIN",   name: "Linde",               sector: "Basic Materials", industry: "Specialty Chemicals", exchange: "NASDAQ", country: "US" },
      { symbol: "SHW",   name: "Sherwin-Williams",    sector: "Basic Materials", industry: "Specialty Chemicals", exchange: "NYSE", country: "US" },
      { symbol: "FCX",   name: "Freeport-McMoRan",    sector: "Basic Materials", industry: "Copper", exchange: "NYSE", country: "US" },
      { symbol: "NEM",   name: "Newmont",             sector: "Basic Materials", industry: "Gold", exchange: "NYSE", country: "US" },
      { symbol: "NUE",   name: "Nucor",               sector: "Basic Materials", industry: "Steel", exchange: "NYSE", country: "US" },
    ],
    "Real Estate": [
      { symbol: "PLD",   name: "Prologis",            sector: "Real Estate", industry: "REIT Industrial", exchange: "NYSE", country: "US" },
      { symbol: "AMT",   name: "American Tower",      sector: "Real Estate", industry: "REIT Specialty", exchange: "NYSE", country: "US" },
      { symbol: "EQIX",  name: "Equinix",             sector: "Real Estate", industry: "REIT Specialty", exchange: "NASDAQ", country: "US" },
      { symbol: "SPG",   name: "Simon Property",      sector: "Real Estate", industry: "REIT Retail", exchange: "NYSE", country: "US" },
    ],
    Utilities: [
      { symbol: "NEE",   name: "NextEra Energy",      sector: "Utilities", industry: "Utilities Regulated", exchange: "NYSE", country: "US" },
      { symbol: "SO",    name: "Southern Company",    sector: "Utilities", industry: "Utilities Regulated", exchange: "NYSE", country: "US" },
      { symbol: "DUK",   name: "Duke Energy",         sector: "Utilities", industry: "Utilities Regulated", exchange: "NYSE", country: "US" },
      { symbol: "AEP",   name: "American Electric",   sector: "Utilities", industry: "Utilities Regulated", exchange: "NASDAQ", country: "US" },
    ],
  },

  // EU: all US-listed (NYSE/NASDAQ) — FMP supports these
  EU: {
    Technology: [
      { symbol: "ASML",  name: "ASML Holding",        sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "Netherlands" },
      { symbol: "SAP",   name: "SAP SE",              sector: "Technology", industry: "Enterprise Software", exchange: "NYSE", country: "Germany" },
      { symbol: "ARM",   name: "Arm Holdings",        sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "UK" },
      { symbol: "NXPI",  name: "NXP Semiconductors",  sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", country: "Netherlands" },
      { symbol: "ERIC",  name: "Ericsson",            sector: "Technology", industry: "Telecom Equipment", exchange: "NASDAQ", country: "Sweden" },
    ],
    Healthcare: [
      { symbol: "NVO",   name: "Novo Nordisk",        sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "Denmark" },
      { symbol: "AZN",   name: "AstraZeneca",         sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NASDAQ", country: "UK" },
      { symbol: "SNY",   name: "Sanofi",              sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NASDAQ", country: "France" },
      { symbol: "BNTX",  name: "BioNTech",            sector: "Healthcare", industry: "Biotechnology", exchange: "NASDAQ", country: "Germany" },
      { symbol: "GSK",   name: "GSK plc",             sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "UK" },
    ],
    "Financial Services": [
      { symbol: "ING",   name: "ING Groep",           sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "Netherlands" },
      { symbol: "BBVA",  name: "Banco Bilbao",        sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "Spain" },
      { symbol: "SAN",   name: "Banco Santander",     sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "Spain" },
      { symbol: "UBS",   name: "UBS Group",           sector: "Financial Services", industry: "Banks", exchange: "NYSE", country: "Switzerland" },
    ],
    Industrials: [
      { symbol: "SHEL",  name: "Shell plc",           sector: "Industrials", industry: "Oil & Gas", exchange: "NYSE", country: "UK" },
      { symbol: "ABB",   name: "ABB Ltd",             sector: "Industrials", industry: "Electrical Equipment", exchange: "NYSE", country: "Switzerland" },
    ],
    "Consumer Cyclical": [
      { symbol: "VOD",   name: "Vodafone",            sector: "Consumer Cyclical", industry: "Telecom", exchange: "NASDAQ", country: "UK" },
    ],
    Energy: [
      { symbol: "TTE",   name: "TotalEnergies",       sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", country: "France" },
      { symbol: "BP",    name: "BP plc",              sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", country: "UK" },
      { symbol: "EQNR",  name: "Equinor",             sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", country: "Norway" },
    ],
  },

  // India: US-listed ADRs — Finnhub free tier supports these reliably.
  // Pure NSE stocks (TCS, Reliance, HDFC, etc.) require paid fundamental APIs.
  INDIA: {
    Technology: [
      { symbol: "INFY", name: "Infosys",     sector: "Technology", industry: "IT Services",  exchange: "NYSE",   country: "India" },
      { symbol: "WIT",  name: "Wipro",       sector: "Technology", industry: "IT Services",  exchange: "NYSE",   country: "India" },
      { symbol: "WNS",  name: "WNS Holdings",sector: "Technology", industry: "BPO Services", exchange: "NYSE",   country: "India" },
    ],
    "Financial Services": [
      { symbol: "HDB",  name: "HDFC Bank",   sector: "Financial Services", industry: "Banks", exchange: "NYSE",  country: "India" },
      { symbol: "IBN",  name: "ICICI Bank",  sector: "Financial Services", industry: "Banks", exchange: "NYSE",  country: "India" },
    ],
    Healthcare: [
      { symbol: "RDY",  name: "Dr. Reddy's", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", country: "India" },
    ],
    "Consumer Cyclical": [
      { symbol: "MMYT", name: "MakeMyTrip",  sector: "Consumer Cyclical", industry: "Online Travel", exchange: "NASDAQ", country: "India" },
    ],
    Industrials: [
      { symbol: "TTM",  name: "Tata Motors", sector: "Industrials", industry: "Auto Manufacturers", exchange: "NYSE", country: "India" },
    ],
  },
};

export function getMarketUniverse(market: MarketKey): Record<string, UniverseEntry[]> {
  if (market === "EU")    return UNIVERSE.EU;
  if (market === "INDIA") return UNIVERSE.INDIA;
  return UNIVERSE.US;
}

// ── Types ─────────────────────────────────────────────────

export interface ScreenerCandidate {
  symbol: string;
  companyName: string;
  marketCap: number;
  sector: string;
  industry: string;
  beta: number;
  price: number;
  volume: number;
  exchangeShortName: string;
  country: string;
}

// Key metrics from /stable/key-metrics-ttm (verified field names)
export interface KeyMetricsTTM {
  symbol: string;
  evToEBITDATTM: number;
  evToSalesTTM: number;
  returnOnEquityTTM: number;
  returnOnCapitalEmployedTTM: number;
  returnOnInvestedCapitalTTM: number;
  freeCashFlowYieldTTM: number;
  earningsYieldTTM: number;
  netDebtToEBITDATTM: number;
  marketCap: number;
}

// Ratios from /stable/ratios-ttm (verified field names)
export interface RatiosTTM {
  symbol: string;
  priceToEarningsRatioTTM: number;
  priceToBookRatioTTM: number;
  priceToSalesRatioTTM: number;
  priceToFreeCashFlowRatioTTM: number;
  dividendYieldTTM: number;
  debtToEquityRatioTTM: number;
  grossProfitMarginTTM: number;
  netProfitMarginTTM: number;
  operatingProfitMarginTTM: number;
  currentRatioTTM: number;
}

export interface FinancialGrowth {
  symbol: string;
  revenueGrowth: number;
  grossProfitGrowth: number;
  netIncomeGrowth: number;
  epsgrowth: number;
  freeCashFlowGrowth: number;
}

export interface EnrichedCandidate extends ScreenerCandidate {
  metrics: KeyMetricsTTM | null;
  ratios: RatiosTTM | null;
  growth: FinancialGrowth | null;
  signalScore: number;
}

export interface ScreenerFilters {
  sector?: string;
  marketCapMoreThan?: number;
  marketCapLessThan?: number;
}

export type Strategy =
  | "undervalued_quality"
  | "emerging_growth"
  | "high_fcf"
  | "deep_value"
  | "dividend_compounder";

// ── FMP data fetchers (3 calls per stock) ─────────────────

export async function getKeyMetrics(symbol: string): Promise<KeyMetricsTTM | null> {
  try {
    const data = await fmpFetch(`/key-metrics-ttm`, { symbol });
    const d = Array.isArray(data) ? data[0] : data;
    if (!d || d["Error Message"]) return null;
    return { symbol, ...d } as KeyMetricsTTM;
  } catch (e) {
    if (e instanceof FMPRateLimitError || e instanceof FMPPremiumError) throw e;
    return null;
  }
}

export async function getRatiosTTM(symbol: string): Promise<RatiosTTM | null> {
  try {
    const data = await fmpFetch(`/ratios-ttm`, { symbol });
    const d = Array.isArray(data) ? data[0] : data;
    if (!d || d["Error Message"]) return null;
    return { symbol, ...d } as RatiosTTM;
  } catch (e) {
    if (e instanceof FMPRateLimitError || e instanceof FMPPremiumError) throw e;
    return null;
  }
}

export async function getFinancialGrowth(symbol: string): Promise<FinancialGrowth | null> {
  try {
    const data = await fmpFetch(`/financial-growth`, { symbol, limit: "1" });
    const d = Array.isArray(data) ? data[0] : data;
    if (!d || d["Error Message"]) return null;
    return { symbol, ...d } as FinancialGrowth;
  } catch (e) {
    if (e instanceof FMPRateLimitError || e instanceof FMPPremiumError) throw e;
    return null;
  }
}

// ── Strategy scoring ──────────────────────────────────────

export function scoreCandidate(
  m: KeyMetricsTTM | null,
  r: RatiosTTM | null,
  g: FinancialGrowth | null,
  strategy: Strategy,
  marketCap: number
): number {
  if (!m && !r) return 0;
  let score = 0;

  const pe   = r?.priceToEarningsRatioTTM ?? 999;
  const pb   = r?.priceToBookRatioTTM ?? 999;
  const ev   = m?.evToEBITDATTM ?? 999;
  const roe  = (m?.returnOnEquityTTM ?? 0) * 100;
  const gm   = (r?.grossProfitMarginTTM ?? 0) * 100;
  const npm  = (r?.netProfitMarginTTM ?? 0) * 100;
  const de   = r?.debtToEquityRatioTTM ?? 999;
  const fcfy = (m?.freeCashFlowYieldTTM ?? 0) * 100;
  const div  = (r?.dividendYieldTTM ?? 0) * 100;
  const rev  = (g?.revenueGrowth ?? 0) * 100;

  switch (strategy) {
    case "undervalued_quality":
      if (pe > 0 && pe < 25)  score += 25;
      if (pe > 0 && pe < 15)  score += 10;
      if (roe > 15)           score += 20;
      if (roe > 25)           score += 10;
      if (de < 0.5)           score += 20;
      if (gm > 30)            score += 15;
      if (rev > 5)            score += 10;
      break;
    case "emerging_growth":
      if (rev > 20)           score += 30;
      if (rev > 40)           score += 15;
      if (gm > 35)            score += 20;
      if (npm > 5)            score += 15;
      if (marketCap < 5e9)    score += 10;
      if (marketCap < 2e9)    score += 10;
      break;
    case "high_fcf":
      if (fcfy > 5)           score += 35;
      if (fcfy > 8)           score += 15;
      if (pe > 0 && pe < 20)  score += 20;
      if (de < 1)             score += 15;
      if (roe > 10)           score += 15;
      break;
    case "deep_value":
      if (pe > 0 && pe < 12)  score += 30;
      if (pb > 0 && pb < 1.5) score += 25;
      if (de < 0.3)           score += 20;
      if (ev < 8 && ev > 0)   score += 15;
      if (npm > 0)            score += 10;
      break;
    case "dividend_compounder":
      if (div > 2)            score += 25;
      if (div > 3.5)          score += 15;
      if (pe > 0 && pe < 25)  score += 20;
      if (roe > 12)           score += 20;
      if (de < 1)             score += 10;
      if (rev > 5)            score += 10;
      break;
  }

  return Math.min(score, 100);
}

// ── Main: enrich market universe → score → rank ───────────

export async function getScoutCandidates(
  market: MarketKey,
  filters: ScreenerFilters,
  strategy: Strategy,
  topN = 8
): Promise<EnrichedCandidate[]> {
  const universe = getMarketUniverse(market);

  // Sector filter or cross-sector top picks
  const entries: UniverseEntry[] = filters.sector && universe[filters.sector]
    ? universe[filters.sector]
    : Object.values(universe).flat();

  const enriched = await Promise.all(
    entries.map(async (entry) => {
      const [metrics, ratios, growth] = await Promise.all([
        getKeyMetrics(entry.symbol),
        getRatiosTTM(entry.symbol),
        getFinancialGrowth(entry.symbol),
      ]);

      const mktCap = metrics?.marketCap ?? 0;

      if (filters.marketCapMoreThan && mktCap > 0 && mktCap < filters.marketCapMoreThan) return null;
      if (filters.marketCapLessThan && mktCap > filters.marketCapLessThan) return null;

      const signalScore = scoreCandidate(metrics, ratios, growth, strategy, mktCap);

      const candidate: EnrichedCandidate = {
        symbol: entry.symbol,
        companyName: entry.name,
        marketCap: mktCap,
        sector: entry.sector,
        industry: entry.industry,
        beta: 1,
        price: 0,
        volume: 0,
        exchangeShortName: entry.exchange,
        country: entry.country,
        metrics,
        ratios,
        growth,
        signalScore,
      };
      return candidate;
    })
  );

  return enriched
    .filter((c): c is EnrichedCandidate => c !== null && c.signalScore > 0)
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, topN);
}
