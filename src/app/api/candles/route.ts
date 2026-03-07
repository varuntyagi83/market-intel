// All stocks in our universe (US, EU ADRs, India ADRs) are listed on NYSE/NASDAQ,
// so Twelve Data /time_series works for every market with the plain symbol.

import { NextRequest, NextResponse } from "next/server";

const TD_BASE = "https://api.twelvedata.com";
const TD_KEY  = process.env.TWELVE_DATA_KEY || "";

const OUTPUT_SIZES: Record<string, number> = {
  "1M":  30,
  "3M":  90,
  "6M":  180,
  "1Y":  365,
};

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const symbol = searchParams.get("symbol") || "";
  const range  = searchParams.get("range") || "6M";

  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const outputsize = OUTPUT_SIZES[range] ?? 180;
  const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${TD_KEY}`;

  try {
    const res  = await fetch(url, { next: { revalidate: 3600 } });
    const json = await res.json() as {
      values?: { datetime: string; open: string; high: string; low: string; close: string; volume: string }[];
      status?: string;
      code?: number;
    };

    if (!json.values || json.status === "error") {
      return NextResponse.json({ candles: [] });
    }

    const candles: Candle[] = json.values.map((v) => ({
      time:   Math.floor(new Date(v.datetime).getTime() / 1000),
      open:   parseFloat(v.open),
      high:   parseFloat(v.high),
      low:    parseFloat(v.low),
      close:  parseFloat(v.close),
      volume: parseInt(v.volume),
    })).reverse(); // TD returns newest-first → reverse to chronological

    return NextResponse.json({ candles });
  } catch {
    return NextResponse.json({ candles: [] });
  }
}
