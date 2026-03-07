// ═══════════════════════════════════════════════════════════
// Scout orchestrator
// Uses Yahoo Finance for all markets (US, EU, India) —
// free, no rate limit, supports .NS suffix for India and
// US-listed ADRs for EU.
// ═══════════════════════════════════════════════════════════

import { MarketKey } from "./types";
import {
  UniverseEntry,
  EnrichedCandidate,
  ScreenerFilters,
  Strategy,
  getMarketUniverse,
} from "./fmp";
import { getYahooEnrichedCandidate } from "./yfinance";

export async function getScoutCandidates(
  market: MarketKey,
  filters: ScreenerFilters,
  strategy: Strategy,
  topN = 8
): Promise<EnrichedCandidate[]> {
  const universe = getMarketUniverse(market);

  const entries: UniverseEntry[] =
    filters.sector && universe[filters.sector]
      ? universe[filters.sector]
      : Object.values(universe).flat();

  const enriched = await Promise.all(
    entries.map((entry) => getYahooEnrichedCandidate(entry, strategy))
  );

  return enriched
    .filter((c): c is EnrichedCandidate => c !== null && c.signalScore > 0)
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, topN);
}
