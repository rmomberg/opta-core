# Opta

Opta is a lightweight, open-source options calculator designed for fast and intuitive analysis of options strategies.

It helps users build, visualize, and understand option payoffs and risk profiles without the complexity of institutional-grade tools.

---

## Why Opta

Options are powerful but often unintuitive. Most tools are either:
- Too complex (built for professionals)
- Too limited (basic payoff calculators)

Opta sits in between:
- Simple enough to use instantly
- Flexible enough to explore real strategies

The goal is clarity, not complexity.

---

## Features

- Option strategy builder (multi-leg support)
- Payoff diagrams
- Basic Greeks (delta, gamma, theta, vega)
- Scenario analysis (price + volatility shifts)
- Save and reload strategies
- Minimal, fast UI

---

## Design philosophy

Opta is built around three principles:

- Speed over configuration
- Clarity over completeness
- Intuition over abstraction

If a feature does not improve decision-making, it does not belong.

---

## Intended use

Opta is designed for:

- Learning options mechanics
- Testing trading ideas
- Visualizing payoff structures
- Exploring risk/reward asymmetry

Not intended for:
- Trade execution
- Brokerage integration
- Institutional risk systems

---

## Concept

Options strategies often exhibit asymmetric outcomes:
- Many small losses
- Few large wins

Opta helps make this structure visible so users can reason more clearly about risk and probability.

---

## Getting started

```bash
git clone https://github.com/your-username/opta.git
cd opta
npm install
npm run dev
