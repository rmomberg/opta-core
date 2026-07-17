import { describe, expect, it } from 'vitest';
import { simulatePortfolio } from '../src/monte-carlo.js';
import type { OptionLeg } from '../src/types.js';

/** Deterministic LCG for reproducible MC tests. */
function makeRng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return (s + 1) / 4294967297;
  };
}

describe('monte-carlo', () => {
  it('returns empty stats for empty books', () => {
    const result = simulatePortfolio([]);
    expect(result.summaryStats.mean).toBe(0);
    expect(result.returnDistribution).toEqual([]);
  });

  it('produces finite summary stats for a long call', () => {
    const legs: OptionLeg[] = [
      {
        ticker: 'TEST',
        optionType: 'call',
        strike: 100,
        expiry: '2030-06-20',
        premium: 8,
        quantity: 1,
        underlyingPrice: 100,
        impliedVol: 0.3,
        side: 'long',
      },
    ];

    const result = simulatePortfolio(legs, {
      numSimulations: 2000,
      rng: makeRng(42),
      now: new Date('2026-01-01'),
    });

    expect(Number.isFinite(result.summaryStats.mean)).toBe(true);
    expect(result.summaryStats.mean).toBeGreaterThan(0);
    expect(result.summaryStats.probabilityOfProfit).toBeGreaterThanOrEqual(0);
    expect(result.summaryStats.probabilityOfProfit).toBeLessThanOrEqual(1);
    expect(result.returnDistribution.length).toBeGreaterThan(0);
  });
});
