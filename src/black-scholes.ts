import type { Greeks, OptionType } from './types.js';

/** Standard normal CDF approximation (Abramowitz & Stegun 7.1.26). */
export function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/** Standard normal PDF. */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function d1d2(S: number, K: number, T: number, r: number, sigma: number): { d1: number; d2: number } {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return { d1, d2 };
}

/** Black-Scholes European option price. */
export function bsPrice(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0) {
    return type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }

  const { d1, d2 } = d1d2(S, K, T, r, sigma);

  if (type === 'call') {
    return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  }
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

/** Option payoff at expiry (per unit, long). */
export function optionPayoff(S_T: number, K: number, type: OptionType): number {
  return type === 'call' ? Math.max(S_T - K, 0) : Math.max(K - S_T, 0);
}

/** Delta. */
export function bsDelta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0) return type === 'call' ? (S > K ? 1 : 0) : S < K ? -1 : 0;
  const { d1 } = d1d2(S, K, T, r, sigma);
  return type === 'call' ? normCdf(d1) : normCdf(d1) - 1;
}

/** Gamma. */
export function bsGamma(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const { d1 } = d1d2(S, K, T, r, sigma);
  return normPdf(d1) / (S * sigma * Math.sqrt(T));
}

/** Vega (per 1.00 change in vol; divide by 100 for per-1% vol). */
export function bsVega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return 0;
  const { d1 } = d1d2(S, K, T, r, sigma);
  return S * normPdf(d1) * Math.sqrt(T);
}

/** Theta (per year; divide by 365 for per-day). */
export function bsTheta(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0) return 0;
  const { d1, d2 } = d1d2(S, K, T, r, sigma);
  const term1 = -(S * normPdf(d1) * sigma) / (2 * Math.sqrt(T));
  if (type === 'call') {
    return term1 - r * K * Math.exp(-r * T) * normCdf(d2);
  }
  return term1 + r * K * Math.exp(-r * T) * normCdf(-d2);
}

/** Rho (per 1.00 change in r; divide by 100 for per-1% rate). */
export function bsRho(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0) return 0;
  const { d2 } = d1d2(S, K, T, r, sigma);
  if (type === 'call') {
    return K * T * Math.exp(-r * T) * normCdf(d2);
  }
  return -K * T * Math.exp(-r * T) * normCdf(-d2);
}

/** All Greeks in one call. */
export function bsGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: OptionType
): Greeks {
  return {
    delta: bsDelta(S, K, T, r, sigma, type),
    gamma: bsGamma(S, K, T, r, sigma),
    vega: bsVega(S, K, T, r, sigma),
    theta: bsTheta(S, K, T, r, sigma, type),
    rho: bsRho(S, K, T, r, sigma, type),
  };
}

/**
 * Implied volatility via Newton-Raphson with bisection fallback.
 * Returns null when the market price is below discounted intrinsic.
 */
export function impliedVol(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  type: OptionType
): number | null {
  if (T <= 0 || marketPrice <= 0) return null;
  const intrinsic =
    type === 'call'
      ? Math.max(S - K * Math.exp(-r * T), 0)
      : Math.max(K * Math.exp(-r * T) - S, 0);
  if (marketPrice < intrinsic - 1e-6) return null;

  let sigma = 0.3;
  for (let i = 0; i < 50; i++) {
    const price = bsPrice(S, K, T, r, sigma, type);
    const vega = bsVega(S, K, T, r, sigma);
    const diff = price - marketPrice;
    if (Math.abs(diff) < 1e-6) return sigma;
    if (vega < 1e-8) break;
    sigma = sigma - diff / vega;
    if (sigma <= 0.0001 || sigma > 5) break;
  }

  let lo = 0.0001;
  let hi = 5;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const price = bsPrice(S, K, T, r, mid, type);
    if (Math.abs(price - marketPrice) < 1e-5) return mid;
    if (price < marketPrice) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
