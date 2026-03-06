import { NextRequest, NextResponse } from "next/server";

// Extend Vercel function timeout for BSE sequential fetching (4 tickers × 1.2s)
export const maxDuration = 15;
import { getMultipleQuotes } from "@/lib/finnhub";
import { getCryptoPrices } from "@/lib/coingecko";
import { getBSEQuotes } from "@/lib/alpha-vantage";
import { MARKETS } from "@/lib/markets";
import { MarketKey, StockQuote } from "@/lib/types";
import { getUsdRates, MARKET_CURRENCY } from "@/lib/fx";

function convertQuote(q: StockQuote, rate: number): StockQuote {
  return {
    ...q,
    price:     +(q.price     * rate).toFixed(4),
    change:    +(q.change    * rate).toFixed(4),
    high:      +(q.high      * rate).toFixed(4),
    low:       +(q.low       * rate).toFixed(4),
    open:      +(q.open      * rate).toFixed(4),
    prevClose: +(q.prevClose * rate).toFixed(4),
  };
}

export async function GET(req: NextRequest) {
  const market = req.nextUrl.searchParams.get("market") as MarketKey;

  if (!market || !MARKETS[market]) {
    return NextResponse.json({ error: "Invalid market" }, { status: 400 });
  }

  try {
    if (market === "CRYPTO") {
      const data = await getCryptoPrices(MARKETS.CRYPTO.tickers);
      return NextResponse.json({ type: "crypto", data });
    }

    const allTickers = [...MARKETS[market].indices, ...MARKETS[market].tickers];

    // India: all tickers have .BSE suffix → use Alpha Vantage (prices already in ₹)
    if (allTickers.every((t) => t.endsWith(".BSE"))) {
      const data = await getBSEQuotes(allTickers);
      return NextResponse.json({ type: "stock", data });
    }

    // Other markets: Finnhub (returns USD) → convert to local currency if needed
    let data = await getMultipleQuotes(allTickers);

    const targetCurrency = MARKET_CURRENCY[market];
    if (targetCurrency) {
      const rates = await getUsdRates();
      const rate = rates[targetCurrency];
      data = data.map((q) => convertQuote(q, rate));
    }

    return NextResponse.json({ type: "stock", data });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to fetch quotes: ${err}` },
      { status: 500 }
    );
  }
}
