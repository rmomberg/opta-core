import { describe, expect, it } from 'vitest';
import {
  bsDelta,
  bsGreeks,
  bsPrice,
  impliedVol,
  optionPayoff,
} from '../src/black-scholes.js';

describe('black-scholes', () => {
  it('matches reference call and put prices for a standard ATM case', () => {
    const S = 100;
    const K = 100;
    const T = 1;
    const r = 0.05;
    const sigma = 0.2;

    expect(bsPrice(S, K, T, r, sigma, 'call')).toBeCloseTo(10.4506, 3);
    expect(bsPrice(S, K, T, r, sigma, 'put')).toBeCloseTo(5.5735, 3);
  });

  it('inverts theoretical prices back to the original implied volatility', () => {
    const S = 145;
    const K = 150;
    const T = 45 / 365;
    const r = 0.045;
    const sigma = 0.37;

    const callPrice = bsPrice(S, K, T, r, sigma, 'call');
    const putPrice = bsPrice(S, K, T, r, sigma, 'put');

    expect(impliedVol(callPrice, S, K, T, r, 'call')).toBeCloseTo(sigma, 4);
    expect(impliedVol(putPrice, S, K, T, r, 'put')).toBeCloseTo(sigma, 4);
  });

  it('computes terminal payoff correctly for calls and puts', () => {
    expect(optionPayoff(120, 100, 'call')).toBe(20);
    expect(optionPayoff(90, 100, 'call')).toBe(0);
    expect(optionPayoff(80, 100, 'put')).toBe(20);
    expect(optionPayoff(110, 100, 'put')).toBe(0);
  });

  it('returns call delta near 0.5 for ATM forwards-ish params', () => {
    const delta = bsDelta(100, 100, 1, 0.05, 0.2, 'call');
    expect(delta).toBeGreaterThan(0.5);
    expect(delta).toBeLessThan(0.7);
  });

  it('bundles greeks without throwing', () => {
    const g = bsGreeks(100, 100, 1, 0.05, 0.2, 'call');
    expect(g.delta).toBeGreaterThan(0);
    expect(g.gamma).toBeGreaterThan(0);
    expect(g.vega).toBeGreaterThan(0);
  });

  it('returns null IV when market price is below intrinsic', () => {
    expect(impliedVol(0.01, 100, 90, 0.5, 0.05, 'call')).toBeNull();
  });
});
