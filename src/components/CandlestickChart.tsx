"use client";

import { useEffect, useRef } from "react";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  candles: Candle[];
}

// Convert Unix timestamp → "YYYY-MM-DD" (lightweight-charts v5 date format)
function toDate(unix: number): string {
  const d = new Date(unix * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CandlestickChart({ candles }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    let cleanup: (() => void) | undefined;

    // Dynamic import avoids SSR issues; lightweight-charts is browser-only
    import("lightweight-charts").then((lc) => {
      const el = containerRef.current;
      if (!el) return;

      const chart = lc.createChart(el, {
        width:  el.clientWidth,
        height: 300,
        layout: {
          background: { type: lc.ColorType.Solid, color: "#0f0f1a" },
          textColor: "#9ca3af",
        },
        grid: {
          vertLines: { color: "#1c1c2e" },
          horzLines: { color: "#1c1c2e" },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: "#374151" },
        timeScale: { borderColor: "#374151", timeVisible: true },
      });

      // v5 API: addSeries(definition, options)
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor:         "#34d399",
        downColor:       "#f87171",
        borderUpColor:   "#34d399",
        borderDownColor: "#f87171",
        wickUpColor:     "#34d399",
        wickDownColor:   "#f87171",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candleSeries.setData(candles.map((c) => ({
        time:  toDate(c.time) as unknown as import("lightweight-charts").Time,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      })));

      // Volume histogram on a separate overlay scale
      const volumeSeries = chart.addSeries(lc.HistogramSeries, {
        color:        "#6366f1",
        priceFormat:  { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      volumeSeries.setData(
        candles.map((c) => ({
          time:  toDate(c.time) as unknown as import("lightweight-charts").Time,
          value: c.volume,
          color: c.close >= c.open ? "#34d39930" : "#f8717130",
        }))
      );

      chart.timeScale().fitContent();

      // Responsive resize
      const obs = new ResizeObserver(() => {
        if (el) chart.applyOptions({ width: el.clientWidth });
      });
      obs.observe(el);

      cleanup = () => {
        obs.disconnect();
        chart.remove();
      };
    });

    return () => cleanup?.();
  }, [candles]);

  return <div ref={containerRef} className="w-full" style={{ height: 300 }} />;
}
