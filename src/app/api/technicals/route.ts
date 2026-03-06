import { NextRequest, NextResponse } from "next/server";
import { getAllTechnicals as avGetAll } from "@/lib/alpha-vantage";
import { getAllTechnicals as tdGetAll } from "@/lib/twelve-data";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const price = req.nextUrl.searchParams.get("price");

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const currentPrice = price ? parseFloat(price) : undefined;

  // Try Alpha Vantage first (has news sentiment too), fall back to Twelve Data
  try {
    const data = await avGetAll(symbol.toUpperCase(), currentPrice);
    return NextResponse.json(data);
  } catch (avErr) {
    console.warn("Alpha Vantage failed, trying Twelve Data:", avErr);
    try {
      const data = await tdGetAll(symbol.toUpperCase(), currentPrice);
      return NextResponse.json(data);
    } catch (tdErr) {
      return NextResponse.json(
        { error: `Both TA sources failed: ${tdErr}` },
        { status: 500 }
      );
    }
  }
}
