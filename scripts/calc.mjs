#!/usr/bin/env node
/**
 * Deterministic CLI over opta-core.
 * Usage:
 *   node scripts/calc.mjs price --S 100 --K 100 --T 1 --r 0.05 --sigma 0.2 --type call
 *   node scripts/calc.mjs greeks --S 100 --K 100 --T 1 --r 0.05 --sigma 0.2 --type call
 *   node scripts/calc.mjs iv --price 10.45 --S 100 --K 100 --T 1 --r 0.05 --type call
 *   node scripts/calc.mjs vertical --ticker TEST --optionType call --longStrike 100 --shortStrike 110 \
 *        --expiry 2030-01-17 --longPremium 5 --shortPremium 2 --underlyingPrice 100 \
 *        --longIv 0.25 --shortIv 0.24 --spot 120
 *   node scripts/calc.mjs mc --legs '[{"ticker":"TEST","optionType":"call","strike":100,"expiry":"2030-06-20","premium":8,"quantity":1,"underlyingPrice":100,"impliedVol":0.3,"side":"long"}]' --sims 3000
 *   node scripts/calc.mjs help
 */
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const distEntry = join(root, 'dist', 'index.js');

if (!existsSync(distEntry)) {
  console.error(JSON.stringify({
    ok: false,
    error: 'dist/ missing. Run `npm run build` in opta-core first.',
  }));
  process.exit(1);
}

const core = await import(pathToFileURL(distEntry).href);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function num(v, name) {
  if (v === undefined || v === null || v === '') {
    throw new Error(`Missing required number: ${name}`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${name}: ${v}`);
  return n;
}

function optNum(v, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Invalid number: ${v}`);
  return n;
}

function requireType(v) {
  if (v !== 'call' && v !== 'put') {
    throw new Error(`type must be "call" or "put", got: ${v}`);
  }
  return v;
}

function missingList(required, args) {
  return required.filter((k) => args[k] === undefined || args[k] === '');
}

function help() {
  return {
    ok: true,
    commands: {
      price: {
        required: ['S', 'K', 'T', 'sigma', 'type'],
        optional: ['r (default 0.045)'],
        example:
          'node scripts/calc.mjs price --S 100 --K 100 --T 1 --r 0.05 --sigma 0.2 --type call',
      },
      greeks: {
        required: ['S', 'K', 'T', 'sigma', 'type'],
        optional: ['r (default 0.045)'],
        example:
          'node scripts/calc.mjs greeks --S 100 --K 100 --T 1 --r 0.05 --sigma 0.2 --type call',
      },
      iv: {
        required: ['price', 'S', 'K', 'T', 'type'],
        optional: ['r (default 0.045)'],
        example:
          'node scripts/calc.mjs iv --price 10.45 --S 100 --K 100 --T 1 --r 0.05 --type call',
      },
      vertical: {
        required: [
          'ticker',
          'optionType',
          'longStrike',
          'shortStrike',
          'expiry',
          'longPremium',
          'shortPremium',
          'underlyingPrice',
          'longIv',
          'shortIv',
        ],
        optional: ['quantity (1)', 'spot (for P&L point; defaults to underlyingPrice)'],
        example:
          'node scripts/calc.mjs vertical --ticker TEST --optionType call --longStrike 100 --shortStrike 110 --expiry 2030-01-17 --longPremium 5 --shortPremium 2 --underlyingPrice 100 --longIv 0.25 --shortIv 0.24 --spot 120',
      },
      straddle: {
        required: [
          'ticker',
          'strike',
          'expiry',
          'callPremium',
          'putPremium',
          'underlyingPrice',
          'callIv',
          'putIv',
        ],
        optional: ['quantity (1)', 'side (long)', 'spot'],
      },
      mc: {
        required: ['legs (JSON array of OptionLeg)'],
        optional: ['sims (10000)', 'r (0.045)', 'now (ISO date)'],
      },
      payoff: {
        required: ['legs (JSON array)', 'spot'],
      },
    },
    units: {
      S: 'spot price',
      K: 'strike',
      T: 'years to expiry (e.g. 45/365 or 1)',
      r: 'risk-free rate decimal (0.05 = 5%)',
      sigma: 'IV decimal (0.25 = 25%)',
      premium: 'per-unit option premium (same units as BS price)',
    },
    starterQuestions: [
      'Price an ATM 1y call: S=100, K=100, r=5%, σ=20%',
      'What is IV if a call trades at 10.45 with S=100, K=100, T=1, r=5%?',
      'Bull call 100/110: long premium 5, short premium 2 — P&L at 120?',
      'Long call S=100 K=100 premium=8 IV=30% exp 2030-06-20 — MC odds of profit?',
      'Straddle ATM: call 6 / put 5.5, spot 100, strike 100 — net debit and P&L at 90 and 110',
    ],
  };
}

function run(cmd, args) {
  const rDefault = core.DEFAULT_RISK_FREE;

  if (cmd === 'help' || !cmd) {
    return help();
  }

  if (cmd === 'price') {
    const miss = missingList(['S', 'K', 'T', 'sigma', 'type'], args);
    if (miss.length) return { ok: false, missing: miss, command: 'price' };
    const S = num(args.S, 'S');
    const K = num(args.K, 'K');
    const T = num(args.T, 'T');
    const r = optNum(args.r, rDefault);
    const sigma = num(args.sigma, 'sigma');
    const type = requireType(args.type);
    const price = core.bsPrice(S, K, T, r, sigma, type);
    const greeks = core.bsGreeks(S, K, T, r, sigma, type);
    return {
      ok: true,
      command: 'price',
      inputs: { S, K, T, r, sigma, type },
      price,
      greeks,
    };
  }

  if (cmd === 'greeks') {
    const miss = missingList(['S', 'K', 'T', 'sigma', 'type'], args);
    if (miss.length) return { ok: false, missing: miss, command: 'greeks' };
    const S = num(args.S, 'S');
    const K = num(args.K, 'K');
    const T = num(args.T, 'T');
    const r = optNum(args.r, rDefault);
    const sigma = num(args.sigma, 'sigma');
    const type = requireType(args.type);
    return {
      ok: true,
      command: 'greeks',
      inputs: { S, K, T, r, sigma, type },
      price: core.bsPrice(S, K, T, r, sigma, type),
      greeks: core.bsGreeks(S, K, T, r, sigma, type),
    };
  }

  if (cmd === 'iv') {
    const miss = missingList(['price', 'S', 'K', 'T', 'type'], args);
    if (miss.length) return { ok: false, missing: miss, command: 'iv' };
    const marketPrice = num(args.price, 'price');
    const S = num(args.S, 'S');
    const K = num(args.K, 'K');
    const T = num(args.T, 'T');
    const r = optNum(args.r, rDefault);
    const type = requireType(args.type);
    const iv = core.impliedVol(marketPrice, S, K, T, r, type);
    return {
      ok: true,
      command: 'iv',
      inputs: { marketPrice, S, K, T, r, type },
      impliedVol: iv,
      impliedVolPct: iv === null ? null : iv * 100,
    };
  }

  if (cmd === 'vertical') {
    const required = [
      'ticker',
      'optionType',
      'longStrike',
      'shortStrike',
      'expiry',
      'longPremium',
      'shortPremium',
      'underlyingPrice',
      'longIv',
      'shortIv',
    ];
    const miss = missingList(required, args);
    if (miss.length) return { ok: false, missing: miss, command: 'vertical' };
    const legs = core.verticalSpread({
      ticker: String(args.ticker),
      optionType: requireType(args.optionType),
      longStrike: num(args.longStrike, 'longStrike'),
      shortStrike: num(args.shortStrike, 'shortStrike'),
      expiry: String(args.expiry),
      longPremium: num(args.longPremium, 'longPremium'),
      shortPremium: num(args.shortPremium, 'shortPremium'),
      underlyingPrice: num(args.underlyingPrice, 'underlyingPrice'),
      longIv: num(args.longIv, 'longIv'),
      shortIv: num(args.shortIv, 'shortIv'),
      quantity: optNum(args.quantity, 1),
    });
    const debit = core.netDebit(legs);
    const spot = optNum(args.spot, num(args.underlyingPrice, 'underlyingPrice'));
    const metrics = core.strategyMetrics(legs, spot);
    const width = Math.abs(num(args.shortStrike, 'shortStrike') - num(args.longStrike, 'longStrike'));
    return {
      ok: true,
      command: 'vertical',
      legs,
      netDebit: debit,
      width,
      maxGainApprox: debit > 0 ? width - debit : null,
      maxLossApprox: debit > 0 ? debit : null,
      atSpot: { spot, ...metrics },
    };
  }

  if (cmd === 'straddle') {
    const required = [
      'ticker',
      'strike',
      'expiry',
      'callPremium',
      'putPremium',
      'underlyingPrice',
      'callIv',
      'putIv',
    ];
    const miss = missingList(required, args);
    if (miss.length) return { ok: false, missing: miss, command: 'straddle' };
    const legs = core.straddle({
      ticker: String(args.ticker),
      strike: num(args.strike, 'strike'),
      expiry: String(args.expiry),
      callPremium: num(args.callPremium, 'callPremium'),
      putPremium: num(args.putPremium, 'putPremium'),
      underlyingPrice: num(args.underlyingPrice, 'underlyingPrice'),
      callIv: num(args.callIv, 'callIv'),
      putIv: num(args.putIv, 'putIv'),
      quantity: optNum(args.quantity, 1),
      side: args.side === 'short' ? 'short' : 'long',
    });
    const debit = core.netDebit(legs);
    const spot = optNum(args.spot, num(args.underlyingPrice, 'underlyingPrice'));
    return {
      ok: true,
      command: 'straddle',
      legs,
      netDebit: debit,
      atSpot: { spot, ...core.strategyMetrics(legs, spot) },
    };
  }

  if (cmd === 'payoff') {
    const miss = missingList(['legs', 'spot'], args);
    if (miss.length) return { ok: false, missing: miss, command: 'payoff' };
    const legs = JSON.parse(String(args.legs));
    const spot = num(args.spot, 'spot');
    return {
      ok: true,
      command: 'payoff',
      netDebit: core.netDebit(legs),
      atSpot: { spot, ...core.strategyMetrics(legs, spot) },
      curve: core.strategyPayoffCurve(legs, {
        center: spot,
        rangePct: optNum(args.rangePct, 0.3),
        steps: optNum(args.steps, 11),
      }),
    };
  }

  if (cmd === 'mc') {
    const miss = missingList(['legs'], args);
    if (miss.length) return { ok: false, missing: miss, command: 'mc' };
    const legs = JSON.parse(String(args.legs));
    const result = core.simulatePortfolio(legs, {
      numSimulations: optNum(args.sims, 10_000),
      riskFreeRate: optNum(args.r, rDefault),
      now: args.now ? new Date(String(args.now)) : undefined,
    });
    return { ok: true, command: 'mc', summaryStats: result.summaryStats, bins: result.returnDistribution };
  }

  return {
    ok: false,
    error: `Unknown command: ${cmd}`,
    hint: 'Use: price | greeks | iv | vertical | straddle | payoff | mc | help',
  };
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

try {
  const result = run(cmd, args);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok === false && result.error ? 1 : 0);
} catch (err) {
  console.error(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }));
  process.exit(1);
}
