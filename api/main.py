import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database.connection import SessionLocal
from aggregator.aggregator import run_aggregator
from datetime import datetime
import yfinance as yf

app = FastAPI(
    title="Market Intelligence System",
    description="Multi-agent sentiment and volatility analysis for Gold, Silver, Oil and ASX200",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Market Intelligence System",
        "version": "1.0.0",
        "assets": ["gold", "silver", "oil", "asx200"],
        "status": "live",
    }


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/exchange-rate")
def get_exchange_rate():
    try:
        ticker = yf.Ticker("AUDUSD=X")
        data = ticker.history(period="1d", interval="1m")
        if data.empty:
            return {"rate": None, "error": "No data"}
        rate = round(float(data["Close"].iloc[-1]), 4)
        return {
            "aud_usd": rate,
            "usd_aud": round(1 / rate, 4),
            "fetched_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {"rate": None, "error": str(e)}


@app.get("/assets")
def get_all_assets():
    scores = run_aggregator()
    return {
        "assets": list(scores.values()),
        "generated_at": datetime.utcnow().isoformat(),
    }


@app.get("/asset/{asset_name}")
def get_asset(asset_name: str):
    assets = ["gold", "silver", "oil", "asx200"]
    if asset_name not in assets:
        return {"error": f"Asset {asset_name} not found. Choose from {assets}"}

    db = SessionLocal()
    try:
        # Latest volatility score
        vol = db.execute(
            text(
                """
            SELECT volatility_score, volatility_level, color,
                   latest_price, sentiment_score, momentum_score,
                   trend_score, calculated_at
            FROM volatility_scores
            WHERE asset = :asset
            ORDER BY calculated_at DESC
            LIMIT 1
        """
            ),
            {"asset": asset_name},
        ).fetchone()

        # Price history last 30 days
        prices = db.execute(
            text(
                """
            SELECT price_date, close_price
            FROM asset_prices
            WHERE asset = :asset
            ORDER BY price_date DESC
            LIMIT 30
        """
            ),
            {"asset": asset_name},
        ).fetchall()

        # Recent headlines
        headlines = db.execute(
            text(
                """
            SELECT h.headline, h.source, ss.sentiment,
                   ss.combined_relevance, ss.analysed_at
            FROM headlines h
            JOIN sentiment_scores ss ON h.id = ss.headline_id
            WHERE ss.asset = :asset
            ORDER BY ss.analysed_at DESC
            LIMIT 10
        """
            ),
            {"asset": asset_name},
        ).fetchall()

        # Sentiment trend
        trend = db.execute(
            text(
                """
            SELECT negative_pct, positive_pct, neutral_pct,
                   headline_count, pipeline_run_at
            FROM asset_sentiment_summary
            WHERE asset = :asset
            ORDER BY pipeline_run_at DESC
            LIMIT 20
        """
            ),
            {"asset": asset_name},
        ).fetchall()

        return {
            "asset": asset_name,
            "volatility": {
                "score": float(vol[0]) if vol else None,
                "level": vol[1] if vol else None,
                "color": vol[2] if vol else None,
                "latest_price": float(vol[3]) if vol else None,
                "sentiment_score": float(vol[4]) if vol else None,
                "momentum_score": float(vol[5]) if vol else None,
                "trend_score": float(vol[6]) if vol else None,
                "calculated_at": vol[7].isoformat() if vol else None,
            },
            "prices": [{"date": str(p[0]), "close": float(p[1])} for p in prices],
            "headlines": [
                {
                    "headline": h[0],
                    "source": h[1],
                    "sentiment": h[2],
                    "relevance": float(h[3]) if h[3] else None,
                    "analysed_at": h[4].isoformat() if h[4] else None,
                }
                for h in headlines
            ],
            "sentiment_trend": [
                {
                    "negative_pct": float(t[0]),
                    "positive_pct": float(t[1]),
                    "neutral_pct": float(t[2]),
                    "headline_count": t[3],
                    "run_at": t[4].isoformat(),
                }
                for t in trend
            ],
        }
    finally:
        db.close()


@app.get("/headlines")
def get_headlines(limit: int = 20):
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT h.headline, h.source, ss.asset,
                   ss.sentiment, ss.combined_relevance, ss.analysed_at
            FROM headlines h
            JOIN sentiment_scores ss ON h.id = ss.headline_id
            ORDER BY ss.analysed_at DESC
            LIMIT :limit
        """
            ),
            {"limit": limit},
        ).fetchall()
        return {
            "headlines": [
                {
                    "headline": r[0],
                    "source": r[1],
                    "asset": r[2],
                    "sentiment": r[3],
                    "relevance": float(r[4]) if r[4] else None,
                    "analysed_at": r[5].isoformat() if r[5] else None,
                }
                for r in results
            ]
        }
    finally:
        db.close()


@app.get("/volatility/history/{asset_name}")
def get_volatility_history(asset_name: str):
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT volatility_score, volatility_level, color,
                   latest_price, calculated_at
            FROM volatility_scores
            WHERE asset = :asset
            ORDER BY calculated_at DESC
            LIMIT 50
        """
            ),
            {"asset": asset_name},
        ).fetchall()
        return {
            "asset": asset_name,
            "history": [
                {
                    "volatility_score": float(r[0]),
                    "volatility_level": r[1],
                    "color": r[2],
                    "price": float(r[3]) if r[3] else None,
                    "calculated_at": r[4].isoformat(),
                }
                for r in results
            ],
        }
    finally:
        db.close()
