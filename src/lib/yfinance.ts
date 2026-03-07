// ═══════════════════════════════════════════════════════════
// Unified fundamentals adapter — Finnhub for all markets
//
// All stocks (US, EU ADRs, India ADRs) are US-listed on NYSE/NASDAQ.
// Finnhub free tier: 60 calls/min (no daily cap), 2 calls/stock.
//
// Field name corrections vs Finnhub docs:
//   netProfitMarginTTM  (not netMarginTTM)
//   longTermDebt/equityAnnual  (not debtToEquityAnnual)
// ═══════════════════════════════════════════════════════════

import {
  KeyMetricsTTM,
  RatiosTTM,
  FinancialGrowth,
  EnrichedCandidate,
  Strategy,
  UniverseEntry,
  scoreCandidate,
  getKeyMetrics,
  getRatiosTTM,
  getFinancialGrowth,
} from "./fmp";

// ── Twelve Data ───────────────────────────────────────────

const TD_BASE = "https://api.twelvedata.com";
const TD_KEY  = process.env.TWELVE_DATA_KEY || "";

// Twelve Data /statistics response shape (subset)
interface TDStatistics {
  meta?: { symbol: string; name: string; currency: string; exchange: string };
  statistics?: {
    valuations_metrics?: {
      market_capitalization?: number;
      trailing_pe?:           number;
      price_to_book_mrq?:     number;
      price_to_sales_ttm?:    number;
      enterprise_to_ebitda?:  number;
    };
    financials?: {
      gross_margin?:           number; // decimal (e.g. 0.48)
      profit_margin?:          number; // decimal
      operating_margin?:       number; // decimal
      return_on_equity_ttm?:   number; // decimal (e.g. 1.52 = 152%)
      income_statement?: {
        revenue_ttm?:                    number;
        quarterly_revenue_growth?:       number; // decimal
        quarterly_earnings_growth_yoy?:  number; // decimal
        net_income_to_common_ttm?:       number;
      };
      balance_sheet?: {
        total_debt_to_equity_mrq?: number;
      };
      cash_flow?: {
        operating_cash_flow_ttm?:       number;
        levered_free_cash_flow_ttm?:    number;
      };
    };
  };
}

async function fetchTwelveDataStats(tdSymbol: string): Promise<TDStatistics | null> {
  try {
    const url = `${TD_BASE}/statistics?symbol=${encodeURIComponent(tdSymbol)}&apikey=${TD_KEY}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json() as TDStatistics & { status?: string };
    if (json.status === "error" || !json.statistics) return null;
    return json;
  } catch {
    return null;
  }
}

async function buildFromTwelveData(
  entry: UniverseEntry,
  strategy: Strategy,
  tdSymbol: string   // plain (AAPL) or exchange-qualified (INFY:NSE)
): Promise<EnrichedCandidate | null> {
  const d = await fetchTwelveDataStats(tdSymbol);
  if (!d?.statistics) return null;

  const vm  = d.statistics.valuations_metrics ?? {};
  const fin = d.statistics.financials ?? {};
  const is  = fin.income_statement ?? {};
  const bs  = fin.balance_sheet ?? {};
  const cf  = fin.cash_flow ?? {};

  const marketCap = vm.market_capitalization ?? 0;
  if (!marketCap) return null;

  // FCF yield: levered FCF / market cap
  const fcfYield = cf.levered_free_cash_flow_ttm && marketCap
    ? cf.levered_free_cash_flow_ttm / marketCap
    : 0;

  // D/E: Twelve Data returns as ratio (e.g., 10.5 = total_debt/equity * 100 ... check)
  // For most US stocks D/E is typically <5; for banks it's high. Use as-is.
  const de = (bs.total_debt_to_equity_mrq ?? 0) / 100; // convert from % to ratio

  const metrics: KeyMetricsTTM = {
    symbol:                     entry.symbol,
    evToEBITDATTM:              vm.enterprise_to_ebitda ?? 0,
    evToSalesTTM:               0,
    returnOnEquityTTM:          fin.return_on_equity_ttm ?? 0,       // already decimal
    returnOnCapitalEmployedTTM: 0,
    returnOnInvestedCapitalTTM: 0,
    freeCashFlowYieldTTM:       fcfYield,
    earningsYieldTTM:           0,
    netDebtToEBITDATTM:         0,
    marketCap,
  };

  const ratios: RatiosTTM = {
    symbol:                      entry.symbol,
    priceToEarningsRatioTTM:     vm.trailing_pe ?? 0,
    priceToBookRatioTTM:         vm.price_to_book_mrq ?? 0,
    priceToSalesRatioTTM:        0,   // Twelve Data P/S is unreliable for non-USD listings
    priceToFreeCashFlowRatioTTM: 0,
    dividendYieldTTM:            0,   // not available in /statistics; set 0
    debtToEquityRatioTTM:        de,
    grossProfitMarginTTM:        fin.gross_margin ?? 0,          // already decimal
    netProfitMarginTTM:          fin.profit_margin ?? 0,         // already decimal
    operatingProfitMarginTTM:    fin.operating_margin ?? 0,      // already decimal
    currentRatioTTM:             0,
  };

  const growth: FinancialGrowth = {
    symbol:             entry.symbol,
    revenueGrowth:      is.quarterly_revenue_growth ?? 0,        // decimal
    grossProfitGrowth:  0,
    netIncomeGrowth:    0,
    epsgrowth:          is.quarterly_earnings_growth_yoy ?? 0,   // decimal
    freeCashFlowGrowth: 0,
  };

  const signalScore = scoreCandidate(metrics, ratios, growth, strategy, marketCap);

  return {
    symbol:            entry.symbol,
    companyName:       entry.name,
    marketCap,
    sector:            entry.sector,
    industry:          entry.industry,
    beta:              1,
    price:             0,  // price available via separate TD /price call; skip to save calls
    volume:            0,
    exchangeShortName: entry.exchange,
    country:           entry.country,
    metrics,
    ratios,
    growth,
    signalScore,
  };
}

// ── Finnhub (EU ADRs) ─────────────────────────────────────

const FH_BASE = "https://finnhub.io/api/v1";
const FH_KEY  = process.env.FINNHUB_API_KEY || "";

interface FHMetric {
  peNormalizedAnnual?:           number;
  psTTM?:                        number;
  pbAnnual?:                     number;
  roeTTM?:                       number;  // percentage
  grossMarginTTM?:               number;  // percentage
  netProfitMarginTTM?:           number;  // percentage (correct field name)
  operatingMarginTTM?:           number;  // percentage
  "longTermDebt/equityAnnual"?:  number;  // ratio (correct field name)
  currentDividendYieldTTM?:      number;  // percentage
  revenueGrowthTTMYoy?:          number;  // percentage
  epsGrowthTTMYoy?:              number;  // percentage
  marketCapitalization?:         number;  // millions USD
  beta?:                         number;
  "currentEv/freeCashFlowTTM"?:  number;
}

interface FHMetricResponse { metric?: FHMetric }
interface FHQuote { c?: number }

async function fhFetch<T>(path: string): Promise<T | null> {
  try {
    const url = `${FH_BASE}${path}&token=${FH_KEY}`;
    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30 min
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

async function buildFromFinnhub(
  entry: UniverseEntry,
  strategy: Strategy
): Promise<EnrichedCandidate | null> {
  const [metRes, quoteRes] = await Promise.all([
    fhFetch<FHMetricResponse>(`/stock/metric?symbol=${entry.symbol}&metric=all`),
    fhFetch<FHQuote>(`/quote?symbol=${entry.symbol}`),
  ]);

  const fhm   = metRes?.metric;
  const price = quoteRes?.c ?? 0;

  if (!fhm) return null;

  const marketCap = (fhm.marketCapitalization ?? 0) * 1_000_000;
  if (!marketCap) return null;

  const pct = (v?: number) => (v != null ? v / 100 : 0); // % → decimal

  const metrics: KeyMetricsTTM = {
    symbol:                     entry.symbol,
    evToEBITDATTM:              0,
    evToSalesTTM:               0,
    returnOnEquityTTM:          pct(fhm.roeTTM),
    returnOnCapitalEmployedTTM: 0,
    returnOnInvestedCapitalTTM: 0,
    freeCashFlowYieldTTM:       fhm["currentEv/freeCashFlowTTM"]
                                  ? 1 / fhm["currentEv/freeCashFlowTTM"]
                                  : 0,
    earningsYieldTTM:           0,
    netDebtToEBITDATTM:         0,
    marketCap,
  };

  const ratios: RatiosTTM = {
    symbol:                      entry.symbol,
    priceToEarningsRatioTTM:     fhm.peNormalizedAnnual ?? 0,
    priceToBookRatioTTM:         fhm.pbAnnual ?? 0,
    priceToSalesRatioTTM:        fhm.psTTM ?? 0,
    priceToFreeCashFlowRatioTTM: 0,
    dividendYieldTTM:            pct(fhm.currentDividendYieldTTM),
    debtToEquityRatioTTM:        fhm["longTermDebt/equityAnnual"] ?? 0,
    grossProfitMarginTTM:        pct(fhm.grossMarginTTM),
    netProfitMarginTTM:          pct(fhm.netProfitMarginTTM),
    operatingProfitMarginTTM:    pct(fhm.operatingMarginTTM),
    currentRatioTTM:             0,
  };

  const growth: FinancialGrowth = {
    symbol:             entry.symbol,
    revenueGrowth:      pct(fhm.revenueGrowthTTMYoy),
    grossProfitGrowth:  0,
    netIncomeGrowth:    0,
    epsgrowth:          pct(fhm.epsGrowthTTMYoy),
    freeCashFlowGrowth: 0,
  };

  const signalScore = scoreCandidate(metrics, ratios, growth, strategy, marketCap);

  return {
    symbol:            entry.symbol,
    companyName:       entry.name,
    marketCap,
    sector:            entry.sector,
    industry:          entry.industry,
    beta:              fhm.beta ?? 1,
    price,
    volume:            0,
    exchangeShortName: entry.exchange,
    country:           entry.country,
    metrics,
    ratios,
    growth,
    signalScore,
  };
}

// ── FMP builder (US domestic stocks) ─────────────────────

async function buildFromFMP(
  entry: UniverseEntry,
  strategy: Strategy
): Promise<EnrichedCandidate | null> {
  const [[metrics, ratios, growth], quoteRes] = await Promise.all([
    Promise.all([
      getKeyMetrics(entry.symbol),
      getRatiosTTM(entry.symbol),
      getFinancialGrowth(entry.symbol),
    ]),
    fhFetch<FHQuote>(`/quote?symbol=${entry.symbol}`),
  ]);

  if (!metrics || !ratios) return null;

  const marketCap = metrics.marketCap ?? 0;
  if (!marketCap) return null;

  const emptyGrowth: FinancialGrowth = {
    symbol: entry.symbol,
    revenueGrowth: 0, grossProfitGrowth: 0, netIncomeGrowth: 0,
    epsgrowth: 0, freeCashFlowGrowth: 0,
  };

  const signalScore = scoreCandidate(metrics, ratios, growth ?? emptyGrowth, strategy, marketCap);

  return {
    symbol:            entry.symbol,
    companyName:       entry.name,
    marketCap,
    sector:            entry.sector,
    industry:          entry.industry,
    beta:              1,
    price:             quoteRes?.c ?? 0,
    volume:            0,
    exchangeShortName: entry.exchange,
    country:           entry.country,
    metrics,
    ratios,
    growth:            growth ?? emptyGrowth,
    signalScore,
  };
}

// ── Public entry point (used by scout.ts) ─────────────────

export async function getYahooEnrichedCandidate(
  entry: UniverseEntry,
  strategy: Strategy
): Promise<EnrichedCandidate | null> {
  // All markets → Finnhub (60 calls/min, no daily limit)
  // US, EU ADRs, India ADRs are all US-listed so Finnhub supports them
  return buildFromFinnhub(entry, strategy);
}
