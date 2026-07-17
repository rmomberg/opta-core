/** Option type. */
export type OptionType = 'call' | 'put';

/** Direction of a leg relative to the portfolio. */
export type LegSide = 'long' | 'short';

/** Single option leg in a multi-leg strategy. */
export interface OptionLeg {
  /** Optional label for UI or debugging. */
  id?: string;
  /** Underlying ticker (used to group correlated MC draws). */
  ticker: string;
  optionType: OptionType;
  strike: number;
  /** ISO date string (YYYY-MM-DD) or any Date-parseable expiry. */
  expiry: string;
  /** Debit paid per contract unit (positive). Credit received if short. */
  premium: number;
  /** Number of contracts; use positive quantities and set `side` for shorts. */
  quantity: number;
  /** Spot of the underlying at entry / valuation. */
  underlyingPrice: number;
  /** Annualized implied volatility as a decimal (0.25 = 25%). */
  impliedVol: number;
  /** Long (default) or short. Short legs flip payoff and cash sign. */
  side?: LegSide;
}

/**
 * Portfolio position used by Monte Carlo.
 * Alias of OptionLeg for compatibility with multi-leg APIs.
 */
export type PortfolioPosition = OptionLeg;

/** Histogram bin for return multiples. */
export interface ReturnBin {
  /** Upper edge of the bin (return multiple). */
  multiple: number;
  /** Probability mass in the bin. */
  probability: number;
}

/** Summary statistics from a portfolio simulation. */
export interface SimulationSummary {
  mean: number;
  median: number;
  p5: number;
  p95: number;
  probabilityOfProfit: number;
  probability2x: number;
  probability5x: number;
  probability10x: number;
  maxReturn: number;
}

/** Full Monte Carlo result. */
export interface SimulationResult {
  returnDistribution: ReturnBin[];
  summaryStats: SimulationSummary;
}

/** Required underlying move to hit a target portfolio multiple. */
export interface TargetReturnResult {
  ticker: string;
  requiredMove: number;
  requiredPrice: number;
}

/** Point on a payoff curve. */
export interface PayoffPoint {
  spot: number;
  payoff: number;
  pnl: number;
}

/** Aggregated cash and payoff metrics for a multi-leg book. */
export interface StrategyMetrics {
  /** Net cash paid (positive = debit, negative = credit). */
  netDebit: number;
  /** Absolute capital at risk for debit strategies (max of 0, netDebit). */
  capitalAtRisk: number;
  /** Expiry payoff at a given spot (gross, before premium). */
  expiryPayoff: number;
  /** Expiry P&L = expiryPayoff - netDebit. */
  expiryPnl: number;
}

/** Black-Scholes Greeks for one option. */
export interface Greeks {
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  rho: number;
}
