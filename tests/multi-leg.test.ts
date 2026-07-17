import { describe, expect, it } from 'vitest';
import {
  expiryPnlAtSpot,
  netDebit,
  strategyPayoffCurve,
  verticalSpread,
} from '../src/multi-leg.js';

const base = {
  ticker: 'TEST',
  expiry: '2030-01-17',
  underlyingPrice: 100,
  longIv: 0.25,
  shortIv: 0.24,
};

describe('multi-leg', () => {
  it('computes net debit for a bull call vertical', () => {
    const legs = verticalSpread({
      ...base,
      optionType: 'call',
      longStrike: 100,
      shortStrike: 110,
      longPremium: 5,
      shortPremium: 2,
    });

    expect(netDebit(legs)).toBeCloseTo(3, 8);
  });

  it('caps bull call max P&L at width minus debit', () => {
    const legs = verticalSpread({
      ...base,
      optionType: 'call',
      longStrike: 100,
      shortStrike: 110,
      longPremium: 5,
      shortPremium: 2,
    });

    // Far ITM: long worth 20, short worth 10 => payoff 10, pnl 10 - 3 = 7
    expect(expiryPnlAtSpot(legs, 120)).toBeCloseTo(7, 8);
    // Far OTM: both expire worthless => pnl = -debit
    expect(expiryPnlAtSpot(legs, 80)).toBeCloseTo(-3, 8);
  });

  it('builds a monotonic-ish payoff curve with pnl points', () => {
    const legs = verticalSpread({
      ...base,
      optionType: 'call',
      longStrike: 100,
      shortStrike: 110,
      longPremium: 5,
      shortPremium: 2,
    });
    const curve = strategyPayoffCurve(legs, { steps: 11, rangePct: 0.3 });
    expect(curve.length).toBe(11);
    expect(curve[0]!.pnl).toBeLessThan(curve[curve.length - 1]!.pnl);
  });
});
