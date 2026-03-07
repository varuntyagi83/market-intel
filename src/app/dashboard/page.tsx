"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MarketKey, StockQuote, CryptoPrice, NewsItem } from "@/lib/types";
import { MARKETS } from "@/lib/markets";
import StockCard from "@/components/StockCard";
import NewsFeed from "@/components/NewsFeed";
import AnalysisPanel from "@/components/AnalysisPanel";
import AdvisoryPanel from "@/components/AdvisoryPanel";
import DeepDivePanel from "@/components/DeepDivePanel";
import CustomQuery from "@/components/CustomQuery";
import TechnicalPanel from "@/components/TechnicalPanel";
import StockScout from "@/components/StockScout";
import LoadingDots from "@/components/LoadingDots";

const MARKET_KEYS: MarketKey[] = ["US", "EU", "INDIA", "CRYPTO"];

type QuoteItem = StockQuote | CryptoPrice;

function isCrypto(q: QuoteItem): q is CryptoPrice {
  return "current_price" in q;
}

export default function DashboardPage() {
  const [market, setMarket] = useState<MarketKey>("US");
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuotes = useCallback(async (m: MarketKey) => {
    setQuotesLoading(true);
    try {
      const res = await fetch(`/api/quotes?market=${m}`);
      const json = await res.json();
      setQuotes(json.data ?? []);
      setLastUpdated(new Date());
    } catch {
      setQuotes([]);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  const fetchNews = useCallback(async (m: MarketKey) => {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news?market=${m}`);
      const json = await res.json();
      setNews(Array.isArray(json) ? json : json.data ?? []);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  const fetchAll = useCallback((m: MarketKey, clearFirst = false) => {
    if (clearFirst) {
      setQuotes([]);
      setNews([]);
    }
    fetchQuotes(m);
    fetchNews(m);
  }, [fetchQuotes, fetchNews]);

  // Auto-fetch on market switch
  useEffect(() => {
    fetchAll(market, true);

    // Auto-refresh every 60s
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(() => fetchAll(market), 60_000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [market, fetchAll]);

  const anyLoading = quotesLoading || newsLoading;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold text-sm tracking-wider">MKT-INTEL</span>
              <span className="text-muted text-[10px]">v1.0</span>
            </div>
            <div className="h-4 w-px bg-border" />
            {lastUpdated ? (
              <span className="text-muted text-[10px]">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            ) : (
              <span className="text-muted text-[10px]">—</span>
            )}
            {anyLoading && <LoadingDots />}
          </div>

          {/* Market tabs + Fetch All */}
          <div className="flex items-center gap-2">
            <div className="flex border border-border rounded overflow-hidden">
              {MARKET_KEYS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    market === m
                      ? "bg-accent/20 text-accent font-bold"
                      : "text-muted hover:text-[#e0e0f0] hover:bg-surface"
                  }`}
                >
                  <span className="mr-1">{MARKETS[m].icon}</span>
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchAll(market, true)}
              disabled={anyLoading}
              className="px-3 py-1.5 text-xs border border-border rounded text-muted hover:border-accent/50 hover:text-accent disabled:opacity-40 transition-colors"
            >
              {anyLoading ? <LoadingDots /> : "↺ Fetch All"}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 py-5 space-y-6">

        {/* ── Price cards row ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-muted text-xs tracking-widest uppercase">
              {MARKETS[market].icon} {MARKETS[market].label}
            </span>
            {quotesLoading && <LoadingDots />}
          </div>

          {quotesLoading && quotes.length === 0 ? (
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-44 h-28 bg-surface border border-border rounded animate-pulse"
                />
              ))}
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-muted text-xs">No data. Click Fetch All.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin-x">
              {quotes.map((q) =>
                isCrypto(q) ? (
                  <StockCard key={q.id} card={{ type: "crypto", data: q }} market={market} />
                ) : (
                  <StockCard key={q.symbol} card={{ type: "stock", data: q }} market={market} />
                )
              )}
            </div>
          )}
        </section>

        {/* ── Two-column layout: News + Analysis ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface/50 border border-border rounded-lg p-4">
            <NewsFeed items={news} loading={newsLoading} />
          </div>

          <div className="bg-surface/50 border border-border rounded-lg p-4">
            <AnalysisPanel market={market} quotes={quotes} news={news} />
          </div>
        </div>

        {/* ── Buy / Hold / Sell Advisory (full width) ── */}
        <div className="bg-surface/50 border border-border rounded-lg p-4">
          <AdvisoryPanel market={market} quotes={quotes} />
        </div>

        {/* ── Technical Indicators + Deep Dive ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface/50 border border-border rounded-lg p-4">
            <TechnicalPanel />
          </div>

          <div className="bg-surface/50 border border-border rounded-lg p-4">
            <DeepDivePanel market={market} quotes={quotes} />
          </div>
        </div>

        {/* ── Stock Scout (full width) ── */}
        <div className="bg-surface/50 border border-border rounded-lg p-4">
          <StockScout market={market} />
        </div>

        {/* ── Custom Research (full width) ── */}
        <div className="bg-surface/50 border border-border rounded-lg p-4">
          <CustomQuery market={market} />
        </div>

        {/* Footer */}
        <footer className="text-center text-muted text-[10px] py-4 border-t border-border">
          Market Intelligence Agent · Finnhub + CoinGecko + Alpha Vantage + FMP + Claude + GPT-4o ·{" "}
          <span className="text-accent/60">Auto-refreshes every 60s</span>
        </footer>
      </main>
    </div>
  );
}
