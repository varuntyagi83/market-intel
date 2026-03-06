import { CryptoPrice } from "./types";

const BASE_URL = "https://api.coingecko.com/api/v3";

export async function getCryptoPrices(ids: string[]): Promise<CryptoPrice[]> {
  const url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;

  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  return res.json();
}

export async function getCryptoGlobal(): Promise<{ total_market_cap: number; btc_dominance: number }> {
  const res = await fetch(`${BASE_URL}/global`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
  const data = await res.json();
  return {
    total_market_cap: data.data?.total_market_cap?.usd || 0,
    btc_dominance: data.data?.market_cap_percentage?.btc || 0,
  };
}
