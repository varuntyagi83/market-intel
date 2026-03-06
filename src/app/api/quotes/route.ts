import { NextRequest, NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/finnhub";
import { getCryptoPrices } from "@/lib/coingecko";
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
    let data = await getMultipleQuotes(allTickers);

    // Convert USD prices to local market currency
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
