"use client";

import { useState, useEffect } from "react";
import { EnrichedCandidate, Strategy } from "@/lib/fmp";
import { MarketKey } from "@/lib/types";
import MarkdownRenderer from "./MarkdownRenderer";
import LoadingDots from "./LoadingDots";
import StockModal from "./StockModal";

// ── Strategy presets ──────────────────────────────────────

const STRATEGIES: { key: Strategy; label: string; icon: string; desc: string }[] = [
  { key: "undervalued_quality", label: "Undervalued Quality", icon: "💎", desc: "Low P/E + high ROIC + strong margins + low debt" },
  { key: "emerging_growth",     label: "Emerging Growth",     icon: "🚀", desc: "Revenue >20%/yr + expanding margins + small/mid cap" },
  { key: "high_fcf",            label: "High FCF Yield",      icon: "💰", desc: "Cash-generative businesses at reasonable valuations" },
  { key: "deep_value",          label: "Deep Value",          icon: "🔍", desc: "P/E <12, P/B <1.5 — contrarian, low debt" },
  { key: "dividend_compounder", label: "Dividend Compounder", icon: "📈", desc: "Dividend >2% + consistent growth + quality balance sheet" },
];

const SECTORS_BY_MARKET: Record<MarketKey, string[]> = {
  US: [
    "Technology", "Healthcare", "Financial Services", "Consumer Cyclical",
    "Industrials", "Communication Services", "Consumer Defensive",
    "Energy", "Basic Materials", "Real Estate", "Utilities",
  ],
  EU: [
    "Technology", "Healthcare", "Financial Services", "Industrials",
    "Consumer Cyclical", "Energy",
  ],
  INDIA: [
    "Technology", "Financial Services", "Healthcare", "Consumer Cyclical", "Industrials",
  ],
  CRYPTO: [],
};


// ── Helper formatters ─────────────────────────────────────

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || isNaN(n) || n >= 500 || n <= -500) return "—";
  return n.toFixed(1);
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function scoreColor(s: number): string {
  if (s >= 70) return "bg-[#34d399]";
  if (s >= 45) return "bg-yellow-400";
  return "bg-[#f87171]";
}

function scoreBadge(s: number): string {
  if (s >= 70) return "text-[#34d399] border-[#34d399]/40 bg-[#34d399]/10";
  if (s >= 45) return "text-yellow-400 border-yellow-400/40 bg-yellow-400/10";
  return "text-[#f87171] border-[#f87171]/40 bg-[#f87171]/10";
}

// ── Candidate metric card ─────────────────────────────────

function CandidateCard({ c, rank, onClick }: { c: EnrichedCandidate; rank: number; onClick: () => void }) {
  const m = c.metrics;
  const r = c.ratios;
  const g = c.growth;

  const metrics = [
    { label: "P/E",          value: fmtNum(r?.priceToEarningsRatioTTM) },
    { label: "EV/EBITDA",    value: fmtNum(m?.evToEBITDATTM) },
    { label: "P/S",          value: fmtNum(r?.priceToSalesRatioTTM) },
    { label: "P/B",          value: fmtNum(r?.priceToBookRatioTTM) },
    { label: "ROE",          value: fmtPct(m?.returnOnEquityTTM) },
    { label: "ROCE",         value: fmtPct(m?.returnOnCapitalEmployedTTM) },
    { label: "Gross Margin", value: fmtPct(r?.grossProfitMarginTTM) },
    { label: "Net Margin",   value: fmtPct(r?.netProfitMarginTTM) },
    { label: "Debt/Equity",  value: fmtNum(r?.debtToEquityRatioTTM) },
    { label: "FCF Yield",    value: fmtPct(m?.freeCashFlowYieldTTM) },
    { label: "Div Yield",    value: fmtPct(r?.dividendYieldTTM) },
    { label: "Rev Growth",   value: fmtPct(g?.revenueGrowth) },
    { label: "EPS Growth",   value: fmtPct(g?.epsgrowth) },
    { label: "FCF Growth",   value: fmtPct(g?.freeCashFlowGrowth) },
  ];

  return (
    <div
      className="bg-surface border border-border rounded-lg p-3 flex flex-col gap-2 cursor-pointer hover:border-accent/50 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted text-[10px] font-mono">#{rank}</span>
            <span className="text-[#e0e0f0] text-sm font-bold">{c.symbol}</span>
            <span className={`text-[9px] px-1.5 py-0.5 border rounded font-bold ${scoreBadge(c.signalScore)}`}>
              {c.signalScore}/100
            </span>
          </div>
          <div className="text-muted text-[10px] mt-0.5 leading-snug">
            {c.companyName}
          </div>
          <div className="text-muted text-[9px] mt-0.5">
            {c.sector} · {c.exchangeShortName} · {fmtCap(c.marketCap)}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[#e0e0f0] text-sm font-bold">
            {c.price > 0 ? `$${c.price.toFixed(2)}` : "—"}
          </div>
          <div className="text-muted text-[9px]">β {c.beta?.toFixed(2) ?? "—"}</div>
        </div>
      </div>

      {/* Signal score bar */}
      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreColor(c.signalScore)}`}
          style={{ width: `${c.signalScore}%` }}
        />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-x-3 gap-y-1.5 mt-1">
        {metrics.map(({ label, value }) => (
          <div key={label}>
            <div className="text-muted text-[8px] leading-none">{label}</div>
            <div className="text-[#e0e0f0] text-[10px] font-mono leading-tight mt-0.5">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────

interface Props {
  market: MarketKey;
}

export default function StockScout({ market }: Props) {
  const [strategy, setStrategy] = useState<Strategy>("undervalued_quality");
  const [sector, setSector]     = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [status, setStatus]         = useState("");
  const [candidates, setCandidates] = useState<EnrichedCandidate[]>([]);
  const [analysis, setAnalysis]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [abortCtrl, setAbortCtrl]   = useState<AbortController | null>(null);
  const [selected, setSelected]     = useState<EnrichedCandidate | null>(null);

  // Reset when market changes
  useEffect(() => {
    if (abortCtrl) abortCtrl.abort();
    setCandidates([]);
    setAnalysis("");
    setSector("");
    setLoading(false);
    setStatus("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  const sectors = SECTORS_BY_MARKET[market] ?? [];

  async function runScout() {
    if (abortCtrl) abortCtrl.abort();
    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setCandidates([]);
    setAnalysis("");
    setStatus("Starting…");
    setLoading(true);

    try {
      const res = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market,
          strategy,
          filters: {
            sector: sector || undefined,
          },
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.type === "status")     setStatus(payload.text);
            if (payload.type === "candidates") setCandidates(payload.data);
            if (payload.type === "text")       setAnalysis((prev) => prev + payload.text);
            if (payload.type === "error")      setStatus(`Error: ${payload.text}`);
          } catch {}
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setStatus(`Error: ${e.message}`);
      }
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  const activeStrategy = STRATEGIES.find((s) => s.key === strategy)!;

  // CRYPTO has no equity data
  if (market === "CRYPTO") {
    return (
      <div className="border border-dashed border-border rounded p-8 text-center text-muted text-xs">
        <div className="text-2xl mb-2">₿</div>
        <div>Stock Scout is for equity markets only</div>
        <div className="text-[10px] mt-1 text-muted/60">Switch to US, EU, or India market to discover stocks</div>
      </div>
    );
  }

  const MARKET_LABELS: Record<MarketKey, string> = {
    US: "US (NASDAQ + NYSE)",
    EU: "European (US-listed ADRs)",
    INDIA: "India (NSE)",
    CRYPTO: "",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-muted text-xs tracking-widest uppercase">Stock Scout</span>
          <p className="text-muted text-[10px] mt-0.5">
            {MARKET_LABELS[market]} · FMP fundamentals + growth → GPT-4o synthesis
          </p>
        </div>
        {loading && <LoadingDots label={status || "Running"} />}
      </div>

      {/* Strategy selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STRATEGIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStrategy(s.key)}
            disabled={loading}
            title={s.desc}
            className={`px-3 py-1.5 text-xs rounded border transition-all ${
              strategy === s.key
                ? "bg-accent/20 border-accent text-accent font-bold"
                : "border-border text-muted hover:border-accent/50 hover:text-[#e0e0f0]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="mr-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Strategy description */}
      <p className="text-muted text-[10px] mb-4 border-l-2 border-accent/30 pl-2">
        {activeStrategy.desc}
      </p>

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-[10px] text-muted hover:text-accent transition-colors"
        >
          {showFilters ? "▲ Hide filters" : "▼ Filters"}
        </button>

        {showFilters && (
          <>
            {/* Sector */}
            <div className="flex items-center gap-1.5">
              <span className="text-muted text-[10px]">Sector:</span>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                disabled={loading}
                className="bg-surface border border-border text-[10px] text-[#e0e0f0] rounded px-2 py-1 focus:outline-none focus:border-accent/60"
              >
                <option value="">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

          </>
        )}

        {/* Scout button */}
        <button
          onClick={runScout}
          disabled={loading}
          className="px-4 py-1.5 bg-accent/20 border border-accent/50 text-accent text-xs rounded hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          {loading ? <LoadingDots /> : "🔍 Scout"}
        </button>
      </div>

      {/* Status line */}
      {loading && status && (
        <div className="text-muted text-[10px] mb-3 animate-pulse">{status}</div>
      )}

      {/* Candidates grid */}
      {candidates.length > 0 && (
        <div className="mb-6">
          <div className="text-muted text-[10px] tracking-widest uppercase mb-2">
            Top {candidates.length} Candidates — {activeStrategy.label}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {candidates.map((c, i) => (
              <CandidateCard key={c.symbol} c={c} rank={i + 1} onClick={() => setSelected(c)} />
            ))}
          </div>
        </div>
      )}

      {/* GPT-4o analysis */}
      {analysis ? (
        <div className="bg-surface border border-border rounded p-4 max-h-[600px] overflow-y-auto">
          <div className="text-[10px] text-muted mb-2 pb-2 border-b border-border">
            ⚡ GPT-4o analysis · {activeStrategy.icon} {activeStrategy.label}
          </div>
          <MarkdownRenderer content={analysis} />
          {loading && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      ) : !loading ? (
        <div className="border border-dashed border-border rounded p-8 text-center text-muted text-xs">
          <div className="text-2xl mb-2">🔍</div>
          <div>Select a strategy and click Scout to discover opportunities</div>
          <div className="text-[10px] mt-1 text-muted/60">
            {MARKET_LABELS[market]} · enriches with TTM fundamentals + growth · GPT-4o ranked analysis
          </div>
        </div>
      ) : null}

      {/* Stock detail modal */}
      {selected && (
        <StockModal candidate={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
