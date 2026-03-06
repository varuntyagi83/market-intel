"use client";

import { useCallback, useState } from "react";
import { TechnicalIndicators } from "@/lib/types";
import LoadingDots from "./LoadingDots";

interface Props {
  defaultSymbol?: string;
  defaultPrice?: number;
}

function SignalBadge({ signal }: { signal: string }) {
  const color =
    signal === "bullish" || signal === "oversold" || signal === "buy"
      ? "text-green border-green/40"
      : signal === "bearish" || signal === "overbought" || signal === "sell"
      ? "text-red border-red/40"
      : "text-muted border-border";
  return (
    <span className={`text-[10px] border rounded px-1.5 py-0.5 font-bold uppercase ${color}`}>
      {signal}
    </span>
  );
}

function Gauge({ value, min = 0, max = 100 }: { value: number; min?: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = pct < 30 ? "#34d399" : pct > 70 ? "#f87171" : "#5bafff";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-muted w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function fmt(n: number | undefined) {
  if (n === undefined || isNaN(n)) return "—";
  return n.toFixed(2);
}

export default function TechnicalPanel({ defaultSymbol = "", defaultPrice }: Props) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [data, setData] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetch = useCallback(async (sym: string, price?: number) => {
    const s = sym.trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const params = new URLSearchParams({ symbol: s });
      if (price) params.set("price", String(price));
      const res = await window.fetch(`/api/technicals?${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-muted text-xs tracking-widest uppercase">Technical Indicators</span>
        {loading && <LoadingDots label={symbol} />}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && fetch(symbol, defaultPrice)}
          placeholder="Ticker (e.g. AAPL)"
          className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs text-[#e0e0f0] placeholder-muted focus:outline-none focus:border-accent/60 transition-colors"
        />
        <button
          onClick={() => fetch(symbol, defaultPrice)}
          disabled={loading || !symbol.trim()}
          className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent text-xs rounded hover:bg-accent/30 disabled:opacity-40 transition-colors"
        >
          Load
        </button>
      </div>

      {error && (
        <div className="text-red text-xs border border-red/30 rounded p-3 mb-3">
          {error.includes("rate limit") || error.includes("Note")
            ? "API rate limit reached. Alpha Vantage free tier allows 25 calls/day. Try Twelve Data key or wait."
            : error}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* Source badge */}
          <div className="flex items-center justify-between">
            <span className="text-muted text-[10px]">
              Source: <span className="text-accent">{data.source}</span>
            </span>
            <span className="text-muted text-[10px]">
              {new Date(data.fetchedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* RSI */}
          {data.rsi && (
            <div className="bg-surface border border-border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#e0e0f0]">RSI (14)</span>
                <SignalBadge signal={data.rsi.signal} />
              </div>
              <Gauge value={data.rsi.value} min={0} max={100} />
              <div className="flex justify-between text-[10px] text-muted mt-1">
                <span>Oversold &lt;30</span>
                <span>Neutral</span>
                <span>&gt;70 Overbought</span>
              </div>
            </div>
          )}

          {/* MACD */}
          {data.macd && (
            <div className="bg-surface border border-border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#e0e0f0]">MACD</span>
                <SignalBadge signal={data.macd.trend} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <span className="text-muted">MACD</span>
                  <div className={data.macd.macd >= 0 ? "text-green" : "text-red"}>
                    {fmt(data.macd.macd)}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Signal</span>
                  <div className="text-[#e0e0f0]">{fmt(data.macd.signal)}</div>
                </div>
                <div>
                  <span className="text-muted">Histogram</span>
                  <div className={data.macd.histogram >= 0 ? "text-green" : "text-red"}>
                    {fmt(data.macd.histogram)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Moving Averages */}
          {(data.sma50 || data.sma200 || data.ema20) && (
            <div className="bg-surface border border-border rounded p-3">
              <span className="text-xs text-[#e0e0f0] block mb-2">Moving Averages</span>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {data.sma50 && (
                  <div>
                    <span className="text-muted">SMA 50</span>
                    <div className="text-[#e0e0f0]">${fmt(data.sma50)}</div>
                  </div>
                )}
                {data.sma200 && (
                  <div>
                    <span className="text-muted">SMA 200</span>
                    <div className="text-[#e0e0f0]">${fmt(data.sma200)}</div>
                  </div>
                )}
                {data.ema20 && (
                  <div>
                    <span className="text-muted">EMA 20</span>
                    <div className="text-[#e0e0f0]">${fmt(data.ema20)}</div>
                  </div>
                )}
              </div>
              {/* Golden/Death cross signal */}
              {data.sma50 && data.sma200 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <SignalBadge
                    signal={data.sma50 > data.sma200 ? "golden cross" : "death cross"}
                  />
                  <span className="text-muted text-[10px] ml-2">
                    SMA50 {data.sma50 > data.sma200 ? ">" : "<"} SMA200
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bollinger Bands */}
          {data.bollinger && (
            <div className="bg-surface border border-border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#e0e0f0]">Bollinger Bands (20,2)</span>
                <SignalBadge signal={`price ${data.bollinger.position} band`} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                <div>
                  <span className="text-muted">Upper</span>
                  <div className="text-red">${fmt(data.bollinger.upper)}</div>
                </div>
                <div>
                  <span className="text-muted">Middle</span>
                  <div className="text-[#e0e0f0]">${fmt(data.bollinger.middle)}</div>
                </div>
                <div>
                  <span className="text-muted">Lower</span>
                  <div className="text-green">${fmt(data.bollinger.lower)}</div>
                </div>
              </div>
              <div className="text-[10px] text-muted">
                Bandwidth: <span className="text-[#e0e0f0]">{data.bollinger.bandwidth.toFixed(1)}%</span>
                {data.bollinger.bandwidth > 20
                  ? " (high volatility)"
                  : data.bollinger.bandwidth < 5
                  ? " (squeeze — breakout imminent)"
                  : ""}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div className="border border-dashed border-border rounded p-6 text-center text-muted text-xs">
          Enter a ticker to load RSI, MACD, Bollinger Bands and moving averages
          <div className="mt-2 text-[10px] text-muted/60">
            Powered by Alpha Vantage (primary) · Twelve Data (fallback)
          </div>
        </div>
      )}
    </div>
  );
}
