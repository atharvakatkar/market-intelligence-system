# Market Intelligence System

A multi-agent AI system that tracks real-time sentiment across financial news sources and combines it with historical price data to produce volatility risk signals for Gold, Silver, Crude Oil, and ASX200.

**Live Dashboard:** https://market-intelligence-system-app.vercel.app  
**Live API:** https://market-intelligence-system-tau.vercel.app/docs

---

## Business Problem

Market volatility is driven by two forces: price movements and narratives. Most tools track only prices. This system tracks both — scraping financial news from 6 specialist sources every 30 minutes, analysing sentiment using FinBERT, and combining it with price momentum to produce asset-specific volatility signals.

Framed for: banking risk teams, commodity trading desks, and fintech analysts who need an early warning indicator for market volatility — not a price prediction engine.

---

## Key Findings

- **ASX200 and Silver** consistently show the highest sentiment-driven volatility during the Iran war period (March 2026), reflecting cross-asset contagion from energy supply disruption
- **Oil sentiment** is overwhelmingly negative (45-55%) driven by Hormuz blockade headlines, yet price momentum remains positive — a divergence signal indicating supply fear is not yet fully priced in
- **Gold** shows safe-haven demand patterns — negative sentiment correlates with price rises, consistent with flight-to-quality behaviour during geopolitical stress
- **Lag analysis** (accumulating — requires 10+ days of data) will quantify how many days sentiment precedes price movement per asset

---

## Architecture
```
NEWS SOURCES        SPECIALIST AGENTS       PIPELINE
────────────        ─────────────────       ────────────────────
OilPrice.com   →    Oil Agent          →
Kitco          →    Commodities Agent  →    Keyword + Semantic
CNBC x3        →    News Agent         →    Relevance Filter
BBC Business   →                       →
RBA            →    Banking Agent      →    FinBERT Sentiment
FT/MarketWatch →    Macro Agent        →    Analysis
                                       →
Yahoo Finance  →    Price Agent        →    Volatility Aggregator
                                       ↓
                                  Supabase PostgreSQL
                                       ↓
                                  FastAPI (Vercel)
                                       ↓
                             React + Tailwind Dashboard
```

Pipeline runs every 30 minutes via GitHub Actions — zero cost, no infrastructure to maintain.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Sentiment Model | FinBERT (ProsusAI) via HuggingFace |
| Semantic Relevance | sentence-transformers (all-MiniLM-L6-v2) |
| Price Data | Yahoo Finance API (yfinance) |
| Backend | FastAPI |
| Database | PostgreSQL (Supabase) |
| Frontend | React + Tailwind CSS |
| Scheduling | GitHub Actions (cron) |
| Deployment | Vercel (API + Frontend) |

---

## Relevance Scoring

A two-layer relevance system filters headlines before sentiment analysis:

**Keyword matching (40% weight):** Asset-specific keyword dictionaries score each headline. "Saudi oil exports fall" scores 1.0 for oil, 0.0 for silver.

**Semantic similarity (60% weight):** sentence-transformers converts headlines and asset descriptions into vectors. Cosine similarity catches nuanced cross-asset signals that keywords miss — "Hormuz blockade" triggers gold relevance via safe-haven reasoning even without the word "gold."

Combined threshold: 0.35. Below this, headlines are filtered before reaching FinBERT.

---

## Volatility Scoring

Each asset receives a volatility score (0-1) combining three signals:

| Signal | Weight | Description |
|---|---|---|
| Sentiment score | 40% | Negative headline % from last 24 hours |
| Price momentum | 35% | 30-day price trend direction |
| Sentiment trend | 25% | Is negativity increasing over last 7 days? |

Output levels: LOW (green) / MEDIUM (yellow) / HIGH (orange) / CRITICAL (red)

---

## Price Prediction

10-day price forecasts generated using Linear Regression on 6 months of historical price data. Features: 1/5/10-day returns, 7/21-day moving averages, rolling volatility, MA ratio.

Model R²: 0.85-0.97 across assets.

Predictions are stored at generation time and compared against actual prices as each date passes — enabling ongoing accuracy tracking.

**Disclaimer:** Predictions are based on price momentum patterns. This system's value is as a volatility early warning indicator, not a price prediction engine. Reliable directional prediction requires macro data, order flow, and cross-asset signals beyond NLP scope.

---

## Data Sources

| Source | Domain | Assets |
|---|---|---|
| Kitco | Precious metals specialist | Gold, Silver |
| OilPrice.com | Energy specialist | Oil |
| CNBC (Markets, Economy, Finance feeds) | Broad financial | All |
| BBC Business | International macro | All |
| RBA communications | Australian monetary policy | ASX200, Gold |
| Financial Times + MarketWatch | High quality macro analysis | All |
| Yahoo Finance | Historical prices | All |

---

## Database Schema

6 PostgreSQL tables: `asset_prices`, `headlines`, `sentiment_scores`, `asset_sentiment_summary`, `volatility_scores`, `price_predictions`

---

## Honest Limitations

- Sentiment is one signal — this system flags volatility risk, it does not predict prices reliably
- FinBERT scores headlines individually — cross-headline narrative trends require aggregation over time (improving as data accumulates)
- Lag analysis requires 10+ days of sentiment history to produce reliable correlations
- Price predictions are momentum-based — they do not incorporate order flow, macro data, or cross-asset signals

---

## Iteration 2 Roadmap

- Regime detection — war period vs stable period sentiment weighting
- Backtesting framework — historical sentiment vs historical prices
- SHAP explainability on volatility aggregator
- Incorporation of macro indicators (CPI, yield curves, PMI)
- AUD/USD as a tracked asset