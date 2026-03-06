"use client";

import { useState, useEffect } from "react";
import { MarketKey, StockQuote, CryptoPrice } from "@/lib/types";
import LoadingDots from "./LoadingDots";

interface AdvisoryVerdict {
  symbol: string;
  verdict: "BUY" | "HOLD" | "SELL";
  conviction: "HIGH" | "MEDIUM" | "LOW";
  entry?: string;
  target?: string;
  stop?: string;
  upside?: string;
  timeframe: string;
  reason: string;
}

interface Props {
  market: MarketKey;
  quotes: (StockQuote | CryptoPrice)[];
}

const VERDICT_STYLE = {
  BUY:  { bg: "bg-[#34d399]/10", border: "border-[#34d399]/40", text: "text-[#34d399]", badge: "bg-[#34d399]/20 border-[#34d399]/60" },
  HOLD: { bg: "bg-yellow-400/10",  border: "border-yellow-400/40",  text: "text-yellow-400",  badge: "bg-yellow-400/20  border-yellow-400/60"  },
  SELL: { bg: "bg-[#f87171]/10", border: "border-[#f87171]/40", text: "text-[#f87171]", badge: "bg-[#f87171]/20 border-[#f87171]/60" },
};

const CONVICTION_DOTS: Record<string, string> = {
  HIGH:   "●●●",
  MEDIUM: "●●○",
  LOW:    "●○○",
};

export default function AdvisoryPanel({ market, quotes }: Props) {
  const [verdicts, setVerdicts] = useState<AdvisoryVerdict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setVerdicts([]);
    setError("");
  }, [market]);

  async function generateAdvisories() {
    setLoading(true);
    setVerdicts([]);
    setError("");

    try {
      const res = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, quotes: quotes.slice(0, 12) }),
      });

      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setVerdicts(data.verdicts ?? []);
    } catch {
      setError("Failed to generate advisories. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const buys  = verdicts.filter((v) => v.verdict === "BUY");
  const holds = verdicts.filter((v) => v.verdict === "HOLD");
  const sells = verdicts.filter((v) => v.verdict === "SELL");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs tracking-widest uppercase">
          Buy / Hold / Sell Advisory
        </span>
        {loading && <LoadingDots label="AI analysing market" />}
      </div>

      {/* Summary bar (only when results exist) */}
      {verdicts.length > 0 && (
        <div className="flex gap-3 mb-4 p-3 bg-surface border border-border rounded-lg">
          <div className="flex-1 text-center">
            <div className="text-[#34d399] text-2xl font-black">{buys.length}</div>
            <div className="text-[10px] text-muted tracking-widest">BUY</div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="text-yellow-400 text-2xl font-black">{holds.length}</div>
            <div className="text-[10px] text-muted tracking-widest">HOLD</div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 text-center">
            <div className="text-[#f87171] text-2xl font-black">{sells.length}</div>
            <div className="text-[10px] text-muted tracking-widest">SELL</div>
          </div>
          <div className="w-px bg-border" />
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={generateAdvisories}
              disabled={loading}
              className="text-[10px] text-accent hover:underline disabled:opacity-40"
            >
              ↺ Refresh
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      {verdicts.length === 0 && (
        <button
          onClick={generateAdvisories}
          disabled={loading}
          className="w-full mb-4 py-2.5 text-xs border border-accent/50 text-accent rounded-lg hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? "Generating advisories…" : "⚡ Generate Market Advisories"}
        </button>
      )}

      {error && (
        <p className="text-[#f87171] text-xs mb-3 text-center">{error}</p>
      )}

      {/* Verdict grid */}
      {verdicts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
          {verdicts.map((v) => {
            const s = VERDICT_STYLE[v.verdict];
            return (
              <div
                key={v.symbol}
                className={`border rounded-lg p-3 ${s.bg} ${s.border} flex flex-col gap-1.5`}
              >
                {/* Symbol + verdict badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[#e0e0f0] text-xs font-bold">{v.symbol}</span>
                  <span
                    className={`text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded border ${s.badge} ${s.text}`}
                  >
                    {v.verdict}
                  </span>
                </div>

                {/* Conviction + upside */}
                <div className="flex items-center justify-between">
                  <span className="text-muted text-[9px] tracking-wide">
                    {CONVICTION_DOTS[v.conviction]} {v.conviction}
                  </span>
                  {v.upside && (
                    <span className={`text-[10px] font-medium ${s.text}`}>
                      {v.upside}
                    </span>
                  )}
                </div>

                {/* Reason */}
                <p className="text-muted text-[10px] leading-snug">{v.reason}</p>

                {/* Timeframe */}
                {v.timeframe && (
                  <span className="text-[9px] text-accent/50">{v.timeframe}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && verdicts.length === 0 && !error && (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted text-xs">
          Click to get AI-powered Buy / Hold / Sell ratings for all {market} stocks
        </div>
      )}
    </div>
  );
}
