import { bsGreeks, bsPrice, optionPayoff } from './black-scholes.js';
import { DEFAULT_RISK_FREE, yearsToExpiry } from './time.js';
import type {
  Greeks,
  OptionLeg,
  PayoffPoint,
  StrategyMetrics,
} from './types.js';

/** Signed quantity: long positive, short negative. */
export function signedQuantity(leg: OptionLeg): number {
  const q = leg.quantity;
  if (leg.side === 'short') return -Math.abs(q);
  if (leg.side === 'long') return Math.abs(q);
  return q;
}

/**
 * Net cash paid to open the book.
 * Positive = net debit, negative = net credit.
 */
export function netDebit(legs: OptionLeg[]): number {
  return legs.reduce((sum, leg) => sum + leg.premium * signedQuantity(leg), 0);
}

/** Gross expiry payoff of all legs at a single underlying price (one ticker). */
export function expiryPayoffAtSpot(legs: OptionLeg[], spot: number): number {
  return legs.reduce((sum, leg) => {
    return sum + optionPayoff(spot, leg.strike, leg.optionType) * signedQuantity(leg);
  }, 0);
}

/**
 * Expiry P&L at a spot: payoff minus net debit.
 * For multi-ticker books, pass only legs on that ticker, or use `strategyPayoffCurve`
 * per underlying and combine externally.
 */
export function expiryPnlAtSpot(legs: OptionLeg[], spot: number): number {
  return expiryPayoffAtSpot(legs, spot) - netDebit(legs);
}

/** Strategy cash + payoff metrics at one spot. */
export function strategyMetrics(legs: OptionLeg[], spot: number): StrategyMetrics {
  const debit = netDebit(legs);
  const payoff = expiryPayoffAtSpot(legs, spot);
  return {
    netDebit: debit,
    capitalAtRisk: Math.max(debit, 0),
    expiryPayoff: payoff,
    expiryPnl: payoff - debit,
  };
}

/**
 * Build an expiry payoff / P&L curve over a spot grid.
 * Defaults to ±50% around the first leg's underlying price.
 */
export function strategyPayoffCurve(
  legs: OptionLeg[],
  options?: {
    spots?: number[];
    center?: number;
    rangePct?: number;
    steps?: number;
  }
): PayoffPoint[] {
  if (legs.length === 0) return [];

  const debit = netDebit(legs);
  let spots = options?.spots;

  if (!spots) {
    const center = options?.center ?? legs[0]!.underlyingPrice;
    const rangePct = options?.rangePct ?? 0.5;
    const steps = options?.steps ?? 101;
    const lo = center * (1 - rangePct);
    const hi = center * (1 + rangePct);
    spots = [];
    for (let i = 0; i < steps; i++) {
      spots.push(lo + ((hi - lo) * i) / (steps - 1));
    }
  }

  return spots.map((spot) => {
    const payoff = expiryPayoffAtSpot(legs, spot);
    return { spot, payoff, pnl: payoff - debit };
  });
}

/** Theoretical mid price of a single leg via Black-Scholes. */
export function legTheoreticalPrice(
  leg: OptionLeg,
  options?: { riskFreeRate?: number; now?: Date; spot?: number; iv?: number }
): number {
  const S = options?.spot ?? leg.underlyingPrice;
  const sigma = options?.iv ?? leg.impliedVol;
  const r = options?.riskFreeRate ?? DEFAULT_RISK_FREE;
  const T = yearsToExpiry(leg.expiry, options?.now);
  return bsPrice(S, leg.strike, T, r, sigma, leg.optionType);
}

/** Aggregate Greeks for a multi-leg book (same underlying assumed for gamma/vega). */
export function strategyGreeks(
  legs: OptionLeg[],
  options?: { riskFreeRate?: number; now?: Date }
): Greeks {
  const r = options?.riskFreeRate ?? DEFAULT_RISK_FREE;
  const now = options?.now;
  return legs.reduce(
    (acc, leg) => {
      const T = yearsToExpiry(leg.expiry, now);
      const g = bsGreeks(
        leg.underlyingPrice,
        leg.strike,
        T,
        r,
        leg.impliedVol,
        leg.optionType
      );
      const q = signedQuantity(leg);
      acc.delta += g.delta * q;
      acc.gamma += g.gamma * q;
      acc.vega += g.vega * q;
      acc.theta += g.theta * q;
      acc.rho += g.rho * q;
      return acc;
    },
    { delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 }
  );
}

/**
 * Common multi-leg constructors (unit quantities, long by default).
 * Premiums / IV / spot are caller-supplied so the library stays data-agnostic.
 */
export function verticalSpread(params: {
  ticker: string;
  optionType: OptionLeg['optionType'];
  longStrike: number;
  shortStrike: number;
  expiry: string;
  longPremium: number;
  shortPremium: number;
  underlyingPrice: number;
  longIv: number;
  shortIv: number;
  quantity?: number;
}): OptionLeg[] {
  const q = params.quantity ?? 1;
  return [
    {
      ticker: params.ticker,
      optionType: params.optionType,
      strike: params.longStrike,
      expiry: params.expiry,
      premium: params.longPremium,
      quantity: q,
      underlyingPrice: params.underlyingPrice,
      impliedVol: params.longIv,
      side: 'long',
    },
    {
      ticker: params.ticker,
      optionType: params.optionType,
      strike: params.shortStrike,
      expiry: params.expiry,
      premium: params.shortPremium,
      quantity: q,
      underlyingPrice: params.underlyingPrice,
      impliedVol: params.shortIv,
      side: 'short',
    },
  ];
}

export function straddle(params: {
  ticker: string;
  strike: number;
  expiry: string;
  callPremium: number;
  putPremium: number;
  underlyingPrice: number;
  callIv: number;
  putIv: number;
  quantity?: number;
  side?: OptionLeg['side'];
}): OptionLeg[] {
  const q = params.quantity ?? 1;
  const side = params.side ?? 'long';
  return [
    {
      ticker: params.ticker,
      optionType: 'call',
      strike: params.strike,
      expiry: params.expiry,
      premium: params.callPremium,
      quantity: q,
      underlyingPrice: params.underlyingPrice,
      impliedVol: params.callIv,
      side,
    },
    {
      ticker: params.ticker,
      optionType: 'put',
      strike: params.strike,
      expiry: params.expiry,
      premium: params.putPremium,
      quantity: q,
      underlyingPrice: params.underlyingPrice,
      impliedVol: params.putIv,
      side,
    },
  ];
}
