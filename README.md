# Multi-Asset Sentiment & Volatility Forecasting Platform

Multi-agent financial news intelligence system tracking commodity and equity volatility risk across 5 assets. Scrapes 10+ sources every 15 minutes, runs FinBERT sentiment analysis, and delivers 5-day price forecasts via a live React dashboard.

**[Live Dashboard](https://market-intelligence-system-app.vercel.app)** | **[API](https://market-intelligence-system-tau.vercel.app)**


**Target use case:** Banking risk teams, commodity trading desks, FX transfer timing.

---

## Assets Tracked

| Asset | Ticker | Sources |
|---|---|---|
| Gold | GC=F | Kitco, CNBC, BBC, FT, MarketWatch, RBA |
| Silver | SI=F | Kitco, CNBC, BBC, FT, MarketWatch |
| Crude Oil | CL=F | OilPrice.com, CNBC, BBC, FT, MarketWatch |
| ASX 200 | ^AXJO | RBA, CNBC, BBC, FT, MarketWatch |
| AUD/INR | AUDINR=X | ForexLive, FXStreet, Economic Times, Business Standard, Mint, Hindustan Times |

---

## Architecture

```
NEWS SOURCES       SPECIALIST AGENTS       PIPELINE
──────────────     ─────────────────       ─────────────────────────────
OilPrice.com  →   Oil Agent          →
Kitco         →   Commodities Agent  →    Two-Layer Relevance Filter
CNBC / BBC    →   News Agent         →    (Keyword 40% + Semantic 60%)
RBA           →   Banking Agent      →
FT/MarketWatch→   Macro Agent        →    FinBERT Sentiment Analysis
ET / FXStreet →   India/FX Agent     →
                                     →    Volatility Aggregator
Yahoo Finance →   Price Agent        →    (Sentiment 40% + Momentum 35% + Trend 25%)
                                          ↓
                                     Supabase PostgreSQL
                                          ↓
                                     FastAPI (Vercel)
                                          ↓
                                     React + Tailwind Dashboard
```

---

## Key Technical Decisions

**FinBERT over VADER or TextBlob.** Generic sentiment models misclassify financial language — "the company beat earnings" scores neutral on VADER. FinBERT, trained on financial text, correctly identifies it as positive.

**Two-layer relevance filter.** Keywords catch hard irrelevance. Semantic similarity catches nuanced cross-asset signals — "Hormuz blockade" triggers gold relevance via safe-haven reasoning even without the word "gold". Neither layer alone is sufficient.

**Linear regression for predictions.** In banking, model decisions need to be auditable. A linear model's coefficients directly show which features drive the forecast — a regulatory consideration, not just a technical preference.

**Sentiment lag validation before use as a prediction feature.** Sentiment only feeds price predictions once the lag is empirically validated per asset. Adding weak signals to a high R² model risks overfitting on limited data.

**Zero-cost permanent stack.** Supabase (free forever), Vercel (free forever), GitHub Actions cron scheduler (free forever) — no expiring free tiers, no infrastructure costs.

---

## Prediction Model Performance

| Asset | R² | Sentiment Lag |
|---|---|---|
| Gold | 0.93 | 4-day |
| Silver | 0.89 | 4-day |
| Crude Oil | 0.97 | 2-day |
| ASX 200 | 0.82 | 1-day |
| AUD/INR | 0.97 | Same-day (0-day) |

---

## Volatility Scoring

| Signal | Weight | Calculation |
|---|---|---|
| Sentiment score | 40% | Negative headline % from last 24 hours |
| Price momentum | 35% | (avg last 5 days − avg first 5 days) / avg first 5 days |
| Sentiment trend | 25% | Is negativity increasing over last 7 days? |

Risk levels: LOW (0–35%) · MEDIUM (35–50%) · HIGH (50–65%) · CRITICAL (65%+)

---

## Honest Limitations

- Sentiment is one signal — this system flags elevated volatility risk, it does not reliably predict price direction
- Lag correlations currently 0.23–0.38 — moderate, will strengthen as data accumulates beyond 6 months
- HTML-scraped sources (Kitco, OilPrice) have null publication timestamps — not fabricated, left honest

---

## Run Locally

```bash
cd ~/personal_projects/market-intelligence-system
source .venv/bin/activate

python pipeline_runner.py                              # Run full pipeline once
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
cd frontend && npm start
```

**Required environment variables:**
```
DATABASE_URL=postgresql://[user]:[password]@[host]:6543/postgres
REACT_APP_GROQ_API_KEY=your_groq_key
```

---

## Roadmap

- Regime detection — war/crisis vs stable period sentiment weighting
- Backtesting framework against historical prices
- SHAP explainability on the volatility aggregator
- Macro indicators — CPI, yield curves, PMI as additional features
- Stronger lag correlations as prediction features once 6-month data threshold is reached

---

**Atharva Katkar** | [GitHub](https://github.com/atharvakatkar) | [LinkedIn](https://www.linkedin.com/in/ankatkar/) | Macquarie University
