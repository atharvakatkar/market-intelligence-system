import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI(
    title="Market Intelligence System",
    description="Multi-agent sentiment and volatility analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://market-intelligence-system-app.vercel.app",
        "http://localhost:3000",
    ],
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


@app.get("/assets")
def get_all_assets():
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT DISTINCT ON (asset)
                asset, volatility_score, volatility_level, color,
                latest_price, sentiment_score, momentum_score,
                trend_score, calculated_at
            FROM volatility_scores
            ORDER BY asset, calculated_at DESC
        """
            )
        ).fetchall()
        assets = [
            {
                "asset": r[0],
                "volatility_score": float(r[1]) if r[1] else None,
                "volatility_level": r[2],
                "color": r[3],
                "latest_price": float(r[4]) if r[4] else None,
                "sentiment_score": float(r[5]) if r[5] else None,
                "momentum_score": float(r[6]) if r[6] else None,
                "trend_score": float(r[7]) if r[7] else None,
                "analysed_at": r[8].isoformat() if r[8] else None,
            }
            for r in results
        ]
        return {"assets": assets, "generated_at": datetime.utcnow().isoformat()}
    finally:
        db.close()


@app.get("/asset/{asset_name}")
def get_asset(asset_name: str, days: int = 30, db: Session = Depends(get_db)):
    db = SessionLocal()
    try:
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

        prices = db.execute(
            text("""
                SELECT price_date, close_price
                FROM asset_prices
                WHERE asset = :asset
                AND price_date >= CURRENT_DATE - :days
                ORDER BY price_date DESC
            """),
            {"asset": asset_name, "days": days}
        ).fetchall()

        headlines = db.execute(
            text(
                """
            SELECT h.headline, h.source, ss.sentiment,
                ss.combined_relevance, ss.analysed_at, h.published_at
            FROM headlines h
            JOIN sentiment_scores ss ON h.id = ss.headline_id
            WHERE ss.asset = :asset
            ORDER BY h.published_at DESC NULLS LAST
            LIMIT 10
        """
            ),
            {"asset": asset_name},
        ).fetchall()

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
                    "published_at": h[5].isoformat() if h[5] else None,
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
                ss.sentiment, ss.combined_relevance, ss.analysed_at, h.published_at
            FROM headlines h
            JOIN sentiment_scores ss ON h.id = ss.headline_id
            ORDER BY h.published_at DESC NULLS LAST
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
                    "published_at": r[6].isoformat() if r[6] else None,
                }
                for r in results
            ]
        }
    finally:
        db.close()


@app.get("/exchange-rate")
def get_exchange_rate():
    import yfinance as yf

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


@app.get("/predictions/accuracy/{asset_name}")
def get_prediction_accuracy(asset_name: str):
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT DISTINCT ON (prediction_date)
                prediction_date, predicted_price, actual_price,
                model_r2, generated_at,
                CASE
                    WHEN actual_price IS NOT NULL
                    THEN ABS(predicted_price - actual_price) / actual_price * 100
                    ELSE NULL
                END as error_pct
            FROM price_predictions
            WHERE asset = :asset
            ORDER BY prediction_date ASC, generated_at DESC
        """
            ),
            {"asset": asset_name},
        ).fetchall()

        completed = [r for r in results if r[2] is not None]
        avg_error = None
        if completed:
            errors = [float(r[5]) for r in completed if r[5] is not None]
            avg_error = round(sum(errors) / len(errors), 2) if errors else None

        return {
            "asset": asset_name,
            "avg_error_pct": avg_error,
            "predictions": [
                {
                    "date": str(r[0]),
                    "predicted_price": float(r[1]),
                    "actual_price": float(r[2]) if r[2] else None,
                    "error_pct": round(float(r[5]), 2) if r[5] else None,
                    "model_r2": float(r[3]) if r[3] else None,
                    "generated_at": r[4].isoformat(),
                }
                for r in results
            ],
        }
    finally:
        db.close()


@app.get("/predictions/{asset_name}")
def get_predictions(asset_name: str):
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT DISTINCT ON (prediction_date)
                prediction_date, predicted_price, model_r2
            FROM price_predictions
            WHERE asset = :asset
            ORDER BY prediction_date ASC, generated_at DESC
        """
            ),
            {"asset": asset_name},
        ).fetchall()
        return {
            "asset": asset_name,
            "predictions": [
                {
                    "date": str(r[0]),
                    "predicted_price": float(r[1]),
                    "is_prediction": True,
                }
                for r in results
            ],
            "disclaimer": "Predictions based on 6 months price momentum and volatility patterns. Model improves as sentiment data accumulates over time.",
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


@app.get("/sentiment/history/{asset_name}")
def get_sentiment_history(asset_name: str):
    db = SessionLocal()
    try:
        results = db.execute(
            text(
                """
            SELECT
                DATE(pipeline_run_at) as run_date,
                AVG(negative_pct) as negative_pct,
                AVG(positive_pct) as positive_pct,
                AVG(neutral_pct) as neutral_pct,
                SUM(headline_count) as headline_count
            FROM asset_sentiment_summary
            WHERE asset = :asset
            GROUP BY DATE(pipeline_run_at)
            ORDER BY run_date ASC
        """
            ),
            {"asset": asset_name},
        ).fetchall()
        return {
            "asset": asset_name,
            "history": [
                {
                    "date": str(r[0]),
                    "negative_pct": round(float(r[1]) * 100, 1),
                    "positive_pct": round(float(r[2]) * 100, 1),
                    "neutral_pct": round(float(r[3]) * 100, 1),
                    "headline_count": int(r[4]),
                }
                for r in results
            ],
        }
    finally:
        db.close()


@app.get("/lag-analysis")
def get_lag_analysis():
    db = SessionLocal()
    try:
        assets = ["gold", "silver", "oil", "asx200"]
        results = {}
        for asset in assets:
            rows = db.execute(
                text(
                    """
                SELECT COUNT(DISTINCT DATE(pipeline_run_at))
                FROM asset_sentiment_summary
                WHERE asset = :asset
            """
                ),
                {"asset": asset},
            ).fetchone()
            count = rows[0] if rows else 0
            results[asset] = {
                "asset": asset,
                "status": "insufficient_data" if count < 10 else "ok",
                "rows": count,
                "lags": {},
            }
        return {"lag_analysis": results, "generated_at": datetime.utcnow().isoformat()}
    finally:
        db.close()


@app.get("/pipeline/last-run")
def get_last_run():
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT MAX(pipeline_run_at) as last_run
            FROM asset_sentiment_summary
        """
            )
        ).fetchone()
        last_run = result[0] if result else None
        now = datetime.utcnow()
        minutes_ago = None
        if last_run:
            diff = now - last_run
            minutes_ago = int(diff.total_seconds() / 60)
        return {
            "last_run": last_run.isoformat() if last_run else None,
            "minutes_ago": minutes_ago,
        }
    finally:
        db.close()
