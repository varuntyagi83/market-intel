"use client";

import { StockQuote, CryptoPrice, MarketKey } from "@/lib/types";

type CardData =
  | { type: "stock"; data: StockQuote }
  | { type: "crypto"; data: CryptoPrice };

const CURRENCY: Record<MarketKey, string> = {
  US:     "$",
  EU:     "€",
  INDIA:  "₹",
  CRYPTO: "$",
};

function fmt(n: number, decimals = 2) {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtLarge(n: number, sym: string) {
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${sym}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `${sym}${(n / 1e6).toFixed(1)}M`;
  return `${sym}${fmt(n)}`;
}

export default function StockCard({
  card,
  market = "US",
}: {
  card: CardData;
  market?: MarketKey;
}) {
  const sym = CURRENCY[market];

  if (card.type === "crypto") {
    const d = card.data;
    const pct = d.price_change_percentage_24h;
    const up = pct >= 0;
    return (
      <div className="flex-shrink-0 w-44 bg-surface border border-border rounded p-3 hover:border-accent/40 transition-colors">
        <div className="flex items-center justify-between mb-1">
          <span className="text-accent text-xs font-bold tracking-wide uppercase">
            {d.symbol}
          </span>
          <span className={`text-xs font-bold ${up ? "text-green" : "text-red"}`}>
            {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
          </span>
        </div>
        <div className="text-[#e0e0f0] text-base font-bold mb-1">
          {sym}{d.current_price >= 1000
            ? fmt(d.current_price, 0)
            : d.current_price >= 1
            ? fmt(d.current_price, 2)
            : fmt(d.current_price, 4)}
        </div>
        <div className="text-muted text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>H</span>
            <span className="text-green">{sym}{fmt(d.high_24h, d.high_24h >= 1 ? 2 : 4)}</span>
          </div>
          <div className="flex justify-between">
            <span>L</span>
            <span className="text-red">{sym}{fmt(d.low_24h, d.low_24h >= 1 ? 2 : 4)}</span>
          </div>
          <div className="flex justify-between">
            <span>MCap</span>
            <span>{fmtLarge(d.market_cap, sym)}</span>
          </div>
        </div>
      </div>
    );
  }

  const d = card.data;
  const up = d.changePct >= 0;
  return (
    <div className="flex-shrink-0 w-44 bg-surface border border-border rounded p-3 hover:border-accent/40 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-accent text-xs font-bold tracking-wide">{d.symbol}</span>
        <span className={`text-xs font-bold ${up ? "text-green" : "text-red"}`}>
          {up ? "▲" : "▼"} {Math.abs(d.changePct).toFixed(2)}%
        </span>
      </div>
      <div className="text-[#e0e0f0] text-base font-bold mb-1">{sym}{fmt(d.price, 2)}</div>
      <div className="text-muted text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>H</span>
          <span className="text-green">{sym}{fmt(d.high, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span>L</span>
          <span className="text-red">{sym}{fmt(d.low, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Chg</span>
          <span className={up ? "text-green" : "text-red"}>
            {up ? "+" : ""}{sym}{fmt(d.change, 2)}
          </span>
        </div>
      </div>
    </div>
  );
}
