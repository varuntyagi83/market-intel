"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { EnrichedCandidate } from "@/lib/fmp";
import { Candle } from "./CandlestickChart";

// SSR-safe — lightweight-charts uses browser APIs
const CandlestickChart = dynamic(() => import("./CandlestickChart"), { ssr: false });

type Range = "1M" | "3M" | "6M" | "1Y";

interface Props {
  candidate: EnrichedCandidate;
  onClose: () => void;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n) || Math.abs(n) > 500) return "—";
  return n.toFixed(2);
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function scoreBadge(s: number): string {
  if (s >= 70) return "text-[#34d399] border-[#34d399]/40 bg-[#34d399]/10";
  if (s >= 45) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  return "text-[#f87171] border-[#f87171]/40 bg-[#f87171]/10";
}

export default function StockModal({ candidate: c, onClose }: Props) {
  const [range, setRange]     = useState<Range>("6M");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setCandles([]);
    fetch(`/api/candles?symbol=${encodeURIComponent(c.symbol)}&country=${encodeURIComponent(c.country)}&range=${range}`)
      .then((r) => r.json())
      .then((d: { candles: Candle[] }) => {
        setCandles(d.candles ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [c.symbol, c.country, range]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const m = c.metrics;
  const r = c.ratios;
  const g = c.growth;

  const sections = [
    {
      title: "Valuation",
      items: [
        { label: "P/E",       value: fmtNum(r?.priceToEarningsRatioTTM) },
        { label: "P/B",       value: fmtNum(r?.priceToBookRatioTTM) },
        { label: "P/S",       value: fmtNum(r?.priceToSalesRatioTTM) },
        { label: "EV/EBITDA", value: fmtNum(m?.evToEBITDATTM) },
        { label: "FCF Yield", value: fmtPct(m?.freeCashFlowYieldTTM) },
        { label: "Div Yield", value: fmtPct(r?.dividendYieldTTM) },
      ],
    },
    {
      title: "Profitability",
      items: [
        { label: "ROE",          value: fmtPct(m?.returnOnEquityTTM) },
        { label: "ROCE",         value: fmtPct(m?.returnOnCapitalEmployedTTM) },
        { label: "Gross Margin", value: fmtPct(r?.grossProfitMarginTTM) },
        { label: "Net Margin",   value: fmtPct(r?.netProfitMarginTTM) },
        { label: "Op Margin",    value: fmtPct(r?.operatingProfitMarginTTM) },
        { label: "D/E Ratio",    value: fmtNum(r?.debtToEquityRatioTTM) },
      ],
    },
    {
      title: "Growth (TTM)",
      items: [
        { label: "Revenue",      value: fmtPct(g?.revenueGrowth) },
        { label: "EPS",          value: fmtPct(g?.epsgrowth) },
        { label: "Gross Profit", value: fmtPct(g?.grossProfitGrowth) },
        { label: "Net Income",   value: fmtPct(g?.netIncomeGrowth) },
        { label: "FCF",          value: fmtPct(g?.freeCashFlowGrowth) },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-[#0f0f1a] border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-4 border-b border-border sticky top-0 bg-[#0f0f1a] z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-bold text-[#e0e0f0]">{c.symbol}</span>
              <span className="text-[10px] text-muted border border-border/60 px-1.5 py-0.5 rounded">
                {c.exchangeShortName}
              </span>
              <span className={`text-[10px] px-2 py-0.5 border rounded font-bold ${scoreBadge(c.signalScore)}`}>
                {c.signalScore}/100
              </span>
            </div>
            <div className="text-sm text-muted mt-0.5">{c.companyName}</div>
            <div className="text-[10px] text-muted/60 mt-0.5">
              {c.sector} · {c.industry} · {fmtCap(c.marketCap)}
              {c.price > 0 && ` · $${c.price.toFixed(2)}`}
              {` · β ${c.beta?.toFixed(2) ?? "—"}`}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-[#e0e0f0] text-xl leading-none p-1 shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ── Candlestick chart ── */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-muted uppercase tracking-widest">Price Chart (Daily)</span>
            <div className="flex gap-1">
              {(["1M", "3M", "6M", "1Y"] as Range[]).map((rv) => (
                <button
                  key={rv}
                  onClick={() => setRange(rv)}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                    range === rv
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-muted hover:border-accent/50"
                  }`}
                >
                  {rv}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div
              className="w-full flex items-center justify-center text-muted text-xs animate-pulse"
              style={{ height: 300 }}
            >
              Loading chart…
            </div>
          ) : candles.length === 0 ? (
            <div
              className="w-full flex items-center justify-center text-muted text-xs"
              style={{ height: 300 }}
            >
              No chart data available
            </div>
          ) : (
            <CandlestickChart candles={candles} />
          )}
        </div>

        {/* ── Metrics grid ── */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="text-[9px] text-muted uppercase tracking-widest mb-3 pb-1 border-b border-border/50">
                {section.title}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {section.items.map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[8px] text-muted/70 leading-none">{label}</div>
                    <div className="text-[11px] text-[#e0e0f0] font-mono leading-tight mt-0.5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
