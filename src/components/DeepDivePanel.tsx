"use client";

import { useEffect, useState } from "react";
import { MarketKey, StockQuote, CryptoPrice } from "@/lib/types";
import { MARKETS } from "@/lib/markets";
import MarkdownRenderer from "./MarkdownRenderer";
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

const VERDICT_STYLE = {
  BUY:  { bg: "bg-[#34d399]/15", border: "border-[#34d399]/50", text: "text-[#34d399]" },
  HOLD: { bg: "bg-yellow-400/15", border: "border-yellow-400/50", text: "text-yellow-400" },
  SELL: { bg: "bg-[#f87171]/15", border: "border-[#f87171]/50", text: "text-[#f87171]" },
};

interface Props {
  market: MarketKey;
  quotes: (StockQuote | CryptoPrice)[];
}

const QUICK_PICKS: Record<MarketKey, string[]> = {
  US:     ["AAPL", "NVDA", "MSFT", "GOOGL", "TSLA"],
  EU:     ["ASML", "NVO", "SAP", "AZN", "ARM"],
  INDIA:  ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"],
  CRYPTO: ["BTC", "ETH", "SOL", "XRP", "BNB"],
};

export default function DeepDivePanel({ market, quotes }: Props) {
  const [ticker, setTicker] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryVerdict | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);

  // Reset when market changes
  useEffect(() => {
    if (abortCtrl) abortCtrl.abort();
    setOutput("");
    setTicker("");
    setLoading(false);
    setAdvisory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  async function fetchAdvisory(sym: string) {
    setAdvisoryLoading(true);
    setAdvisory(null);
    try {
      const res = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verdicts?.[0]) setAdvisory(data.verdicts[0]);
      }
    } catch {
      // Advisory is supplemental — fail silently
    } finally {
      setAdvisoryLoading(false);
    }
  }

  async function runDeepDive(symbol: string) {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;

    if (abortCtrl) abortCtrl.abort();
    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setTicker(sym);
    setOutput("");
    setAdvisory(null);
    setLoading(true);

    // Fetch advisory in parallel with deep dive
    fetchAdvisory(sym);

    const priceData = quotes.length
      ? JSON.stringify(quotes.slice(0, 10), null, 2)
      : undefined;

    try {
      const res = await fetch("/api/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, priceData }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const { text } = JSON.parse(line.slice(6));
              if (text) setOutput((prev) => prev + text);
            } catch {}
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setOutput((prev) => prev + "\n\n[Error: stream interrupted]");
      }
    } finally {
      setLoading(false);
    }
  }

  const chips = QUICK_PICKS[market] ?? MARKETS[market].tickers.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs tracking-widest uppercase">Deep Dive</span>
        {loading && <LoadingDots label={ticker} />}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && runDeepDive(ticker)}
          placeholder="Enter ticker (e.g. AAPL)"
          className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs text-[#e0e0f0] placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        <button
          onClick={() => runDeepDive(ticker)}
          disabled={loading || !ticker.trim()}
          className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent text-xs rounded hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Dive
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {chips.map((sym) => (
          <button
            key={sym}
            onClick={() => runDeepDive(sym)}
            disabled={loading}
            className="px-2.5 py-1 text-[10px] border border-border rounded text-muted hover:border-accent/40 hover:text-accent disabled:opacity-40 transition-colors"
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Per-stock Advisory Badge */}
      {(advisory || advisoryLoading) && (
        <div className="mb-3">
          {advisoryLoading && !advisory ? (
            <div className="border border-border rounded-lg p-3 bg-surface animate-pulse flex items-center gap-2">
              <span className="text-muted text-xs">Fetching advisory…</span>
            </div>
          ) : advisory ? (() => {
            const s = VERDICT_STYLE[advisory.verdict];
            return (
              <div className={`border rounded-lg p-3 ${s.bg} ${s.border}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Big verdict badge */}
                  <span className={`text-2xl font-black tracking-widest ${s.text}`}>
                    {advisory.verdict}
                  </span>
                  <div className="h-8 w-px bg-border/60" />
                  {/* Conviction */}
                  <div className="text-center">
                    <div className={`text-xs font-semibold ${s.text}`}>{advisory.conviction}</div>
                    <div className="text-[9px] text-muted">CONVICTION</div>
                  </div>
                  {advisory.upside && (
                    <>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="text-center">
                        <div className={`text-xs font-semibold ${s.text}`}>{advisory.upside}</div>
                        <div className="text-[9px] text-muted">UPSIDE</div>
                      </div>
                    </>
                  )}
                  {advisory.entry && (
                    <>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-[#e0e0f0]">{advisory.entry}</div>
                        <div className="text-[9px] text-muted">ENTRY</div>
                      </div>
                    </>
                  )}
                  {advisory.target && (
                    <>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-[#34d399]">{advisory.target}</div>
                        <div className="text-[9px] text-muted">TARGET</div>
                      </div>
                    </>
                  )}
                  {advisory.stop && (
                    <>
                      <div className="h-8 w-px bg-border/60" />
                      <div className="text-center">
                        <div className="text-xs font-semibold text-[#f87171]">{advisory.stop}</div>
                        <div className="text-[9px] text-muted">STOP</div>
                      </div>
                    </>
                  )}
                </div>
                {advisory.reason && (
                  <p className="text-muted text-[10px] mt-2 leading-snug">{advisory.reason}</p>
                )}
                {advisory.timeframe && (
                  <span className="text-[9px] text-accent/50">{advisory.timeframe}</span>
                )}
              </div>
            );
          })() : null}
        </div>
      )}

      {output ? (
        <div className="bg-surface border border-border rounded p-4 max-h-96 overflow-y-auto">
          <MarkdownRenderer content={output} />
          {loading && (
            <span className="inline-block w-1.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      ) : !loading ? (
        <div className="border border-dashed border-border rounded p-6 text-center text-muted text-xs">
          Enter a ticker symbol for a comprehensive deep-dive analysis
        </div>
      ) : null}
    </div>
  );
}
