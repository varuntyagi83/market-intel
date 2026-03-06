// Live FX rates via frankfurter.app (free, no key required)
// Rates are cached for 1 hour server-side

const CURRENCIES = ["EUR", "INR"] as const;
type FxCurrency = (typeof CURRENCIES)[number];

interface FxCache {
  rates: Record<FxCurrency, number>;
  fetchedAt: number;
}

let cache: FxCache | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdRates(): Promise<Record<FxCurrency, number>> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.rates;
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,INR",
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
    const json = await res.json();
    const rates: Record<FxCurrency, number> = {
      EUR: json.rates.EUR,
      INR: json.rates.INR,
    };
    cache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    // Fallback to approximate rates if the FX API is unavailable
    return { EUR: 0.92, INR: 83.5 };
  }
}

export const MARKET_CURRENCY: Record<string, FxCurrency | null> = {
  US:     null,    // stays in USD
  EU:     "EUR",
  INDIA:  "INR",
  CRYPTO: null,    // USD
};
