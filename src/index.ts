/**
 * opta-core
 *
 * Pure TypeScript math for options:
 * Black-Scholes pricing & Greeks, multi-leg payoffs, light portfolio Monte Carlo.
 *
 * No UI, no live market data, no product-specific strategy engines.
 */

export {
  normCdf,
  normPdf,
  bsPrice,
  optionPayoff,
  bsDelta,
  bsGamma,
  bsVega,
  bsTheta,
  bsRho,
  bsGreeks,
  impliedVol,
} from './black-scholes.js';

export {
  signedQuantity,
  netDebit,
  expiryPayoffAtSpot,
  expiryPnlAtSpot,
  strategyMetrics,
  strategyPayoffCurve,
  legTheoreticalPrice,
  strategyGreeks,
  verticalSpread,
  straddle,
} from './multi-leg.js';

export { simulatePortfolio, solveTargetReturn } from './monte-carlo.js';

export { DEFAULT_RISK_FREE, yearsToExpiry, daysToExpiry } from './time.js';

export type {
  OptionType,
  LegSide,
  OptionLeg,
  PortfolioPosition,
  ReturnBin,
  SimulationSummary,
  SimulationResult,
  TargetReturnResult,
  PayoffPoint,
  StrategyMetrics,
  Greeks,
} from './types.js';
