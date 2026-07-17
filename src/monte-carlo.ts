import { optionPayoff } from './black-scholes.js';
import { DEFAULT_RISK_FREE, yearsToExpiry } from './time.js';
import type {
  OptionLeg,
  SimulationResult,
  TargetReturnResult,
} from './types.js';
import { signedQuantity } from './multi-leg.js';

function randn(rng: () => number = Math.random): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function emptyResult(): SimulationResult {
  return {
    returnDistribution: [],
    summaryStats: {
      mean: 0,
      median: 0,
      p5: 0,
      p95: 0,
      probabilityOfProfit: 0,
      probability2x: 0,
      probability5x: 0,
      probability10x: 0,
      maxReturn: 0,
    },
  };
}

/**
 * Capital at risk for return multiples.
 * Debit books use net debit; credit books use max(short premium, small epsilon).
 */
function capitalBase(legs: OptionLeg[]): number {
  const cash = legs.reduce((sum, leg) => sum + leg.premium * signedQuantity(leg), 0);
  if (cash > 0) return cash;
  const shortPremium = legs.reduce((sum, leg) => {
    const q = signedQuantity(leg);
    return q < 0 ? sum + leg.premium * Math.abs(q) : sum;
  }, 0);
  return shortPremium > 0 ? shortPremium : 0;
}

/**
 * Light portfolio Monte Carlo under GBM, one independent draw per ticker.
 * Legs on the same ticker share the terminal price path (perfect intra-ticker correlation).
 * Cross-ticker correlation is not modeled in v0.1 (independent underlyings).
 */
export function simulatePortfolio(
  legs: OptionLeg[],
  options?: {
    numSimulations?: number;
    riskFreeRate?: number;
    now?: Date;
    rng?: () => number;
  }
): SimulationResult {
  const numSimulations = options?.numSimulations ?? 10_000;
  const riskFreeRate = options?.riskFreeRate ?? DEFAULT_RISK_FREE;
  const now = options?.now;
  const rng = options?.rng;

  if (legs.length === 0) return emptyResult();

  const base = capitalBase(legs);
  if (base <= 0) return emptyResult();

  const tickerGroups = new Map<string, OptionLeg[]>();
  for (const leg of legs) {
    const group = tickerGroups.get(leg.ticker) ?? [];
    group.push(leg);
    tickerGroups.set(leg.ticker, group);
  }

  const returnMultiples = new Array<number>(numSimulations);

  for (let sim = 0; sim < numSimulations; sim++) {
    let portfolioValue = 0;
    const tickerPrices = new Map<string, number>();

    for (const [ticker, group] of tickerGroups) {
      const leg = group[0]!;
      const T = yearsToExpiry(leg.expiry, now);
      const sigma = leg.impliedVol;
      const S = leg.underlyingPrice;
      const drift = riskFreeRate - 0.5 * sigma * sigma;
      const Z = randn(rng);
      const S_T = S * Math.exp(drift * T + sigma * Math.sqrt(T) * Z);
      tickerPrices.set(ticker, S_T);
    }

    for (const leg of legs) {
      const S_T = tickerPrices.get(leg.ticker)!;
      const payoff = optionPayoff(S_T, leg.strike, leg.optionType);
      portfolioValue += payoff * signedQuantity(leg);
    }

    // For credit books, P&L = short premium kept - payoff; express as 1 + pnl/base
    const cash = legs.reduce((sum, leg) => sum + leg.premium * signedQuantity(leg), 0);
    if (cash > 0) {
      returnMultiples[sim] = portfolioValue / base;
    } else {
      const pnl = -cash - portfolioValue; // credit received minus terminal payoff liability
      returnMultiples[sim] = 1 + pnl / base;
    }
  }

  const sorted = [...returnMultiples].sort((a, b) => a - b);

  const buckets = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 7, 10, 15, 20, 50];
  const distribution: { multiple: number; probability: number }[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const low = i === 0 ? -Infinity : buckets[i - 1]!;
    const high = buckets[i]!;
    const count = sorted.filter((v) => v > low && v <= high).length;
    distribution.push({ multiple: high, probability: count / numSimulations });
  }

  const tailCount = sorted.filter((v) => v > buckets[buckets.length - 1]!).length;
  if (tailCount > 0) {
    distribution.push({ multiple: 100, probability: tailCount / numSimulations });
  }

  const mean = returnMultiples.reduce((a, b) => a + b, 0) / numSimulations;
  const p5Index = Math.floor(numSimulations * 0.05);
  const p95Index = Math.floor(numSimulations * 0.95);
  const medianIndex = Math.floor(numSimulations * 0.5);

  return {
    returnDistribution: distribution.filter((d) => d.probability > 0),
    summaryStats: {
      mean: Math.round(mean * 100) / 100,
      median: Math.round(sorted[medianIndex]! * 100) / 100,
      p5: Math.round(sorted[p5Index]! * 100) / 100,
      p95: Math.round(sorted[p95Index]! * 100) / 100,
      probabilityOfProfit:
        Math.round((sorted.filter((v) => v > 1).length / numSimulations) * 1000) / 1000,
      probability2x:
        Math.round((sorted.filter((v) => v > 2).length / numSimulations) * 1000) / 1000,
      probability5x:
        Math.round((sorted.filter((v) => v > 5).length / numSimulations) * 1000) / 1000,
      probability10x:
        Math.round((sorted.filter((v) => v > 10).length / numSimulations) * 1000) / 1000,
      maxReturn: Math.round(sorted[sorted.length - 1]! * 100) / 100,
    },
  };
}

/**
 * Approximate required terminal price per ticker to hit a target return multiple.
 * Best for single-ticker books; multi-ticker results are independent per ticker.
 */
export function solveTargetReturn(
  legs: OptionLeg[],
  targetMultiple: number
): TargetReturnResult[] {
  const cash = legs.reduce((sum, leg) => sum + leg.premium * signedQuantity(leg), 0);
  const base = capitalBase(legs);
  if (base <= 0) return [];

  // Target terminal gross value for debit books; for credit, target P&L on base.
  const targetValue = cash > 0 ? base * targetMultiple : -cash - (targetMultiple - 1) * base;

  const tickers = [...new Set(legs.map((p) => p.ticker))];

  return tickers.map((ticker) => {
    const tickerLegs = legs.filter((p) => p.ticker === ticker);
    const S = tickerLegs[0]!.underlyingPrice;

    let lo = S * 0.01;
    let hi = S * 5;
    let bestPrice = S;
    const isCallHeavy = tickerLegs.some((p) => p.optionType === 'call' && signedQuantity(p) > 0);

    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      let value = 0;
      for (const leg of tickerLegs) {
        value += optionPayoff(mid, leg.strike, leg.optionType) * signedQuantity(leg);
      }
      if (value < targetValue) {
        if (isCallHeavy) lo = mid;
        else hi = mid;
      } else {
        bestPrice = mid;
        if (isCallHeavy) hi = mid;
        else lo = mid;
      }
    }

    return {
      ticker,
      requiredMove: Math.round(((bestPrice - S) / S) * 1000) / 10,
      requiredPrice: Math.round(bestPrice * 100) / 100,
    };
  });
}
