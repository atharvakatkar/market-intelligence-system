import pandas as pd
import numpy as np
from sqlalchemy import text
from database.connection import SessionLocal
from datetime import datetime, timedelta

VOLATILITY_WEIGHTS = {"sentiment": 0.4, "price_momentum": 0.35, "sentiment_trend": 0.25}


def get_recent_prices(asset: str, days: int = 30) -> pd.DataFrame:
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT price_date, close_price
            FROM asset_prices
            WHERE asset = :asset
            AND price_date >= :start_date
            ORDER BY price_date ASC
        """
            ),
            {
                "asset": asset,
                "start_date": datetime.utcnow().date() - timedelta(days=days),
            },
        )
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows, columns=["price_date", "close_price"])
        df["price_date"] = pd.to_datetime(df["price_date"])
        df["close_price"] = df["close_price"].astype(float)
        return df
    finally:
        db.close()


def get_recent_sentiment(asset: str, hours: int = 24) -> dict:
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT sentiment, combined_relevance
            FROM sentiment_scores
            WHERE asset = :asset
            AND analysed_at >= :start_time
        """
            ),
            {"asset": asset, "start_time": datetime.utcnow() - timedelta(hours=hours)},
        )
        rows = result.fetchall()
        if not rows:
            return {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
        counts = {"positive": 0, "negative": 0, "neutral": 0, "total": 0}
        for sentiment, relevance in rows:
            weight = float(relevance) if relevance else 1.0
            counts[sentiment] = counts.get(sentiment, 0) + weight
            counts["total"] += weight
        return counts
    finally:
        db.close()


def get_sentiment_trend(asset: str, days: int = 7) -> float:
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT 
                DATE(pipeline_run_at) as run_date,
                negative_pct,
                positive_pct
            FROM asset_sentiment_summary
            WHERE asset = :asset
            AND pipeline_run_at >= :start_date
            ORDER BY pipeline_run_at ASC
        """
            ),
            {"asset": asset, "start_date": datetime.utcnow() - timedelta(days=days)},
        )
        rows = result.fetchall()
        if len(rows) < 2:
            return 0.0
        negative_pcts = [float(r[1]) for r in rows]
        trend = negative_pcts[-1] - negative_pcts[0]
        return round(trend, 4)
    finally:
        db.close()


def calculate_price_momentum(df: pd.DataFrame) -> float:
    if df.empty or len(df) < 5:
        return 0.0
    recent = df["close_price"].tail(5).mean()
    older = df["close_price"].head(5).mean()
    momentum = (recent - older) / older
    return round(float(momentum), 4)


def calculate_volatility_score(asset: str) -> dict:
    prices = get_recent_prices(asset)
    sentiment = get_recent_sentiment(asset)
    sentiment_trend = get_sentiment_trend(asset)

    # Price momentum — negative momentum = bearish signal
    momentum = calculate_price_momentum(prices)
    # Negative momentum increases volatility risk, positive reduces it
    momentum_score = max(0, min(1, 0.5 - momentum * 2))

    # Sentiment score — higher negative % = higher volatility risk
    if sentiment["total"] > 0:
        negative_pct = sentiment["negative"] / sentiment["total"]
        sentiment_score = negative_pct
    else:
        sentiment_score = 0.5

    # Sentiment trend — is negativity increasing?
    trend_score = max(0, min(1, 0.5 + sentiment_trend * 2))

    # Combined volatility score
    volatility_score = (
        VOLATILITY_WEIGHTS["sentiment"] * sentiment_score
        + VOLATILITY_WEIGHTS["price_momentum"] * momentum_score
        + VOLATILITY_WEIGHTS["sentiment_trend"] * trend_score
    )
    volatility_score = round(float(volatility_score), 4)

    # Volatility level
    if volatility_score >= 0.65:
        level = "CRITICAL"
        color = "red"
    elif volatility_score >= 0.50:
        level = "HIGH"
        color = "orange"
    elif volatility_score >= 0.35:
        level = "MEDIUM"
        color = "yellow"
    else:
        level = "LOW"
        color = "green"

    latest_price = None
    if not prices.empty:
        latest_price = round(float(prices["close_price"].iloc[-1]), 2)

    return {
        "asset": asset,
        "volatility_score": volatility_score,
        "volatility_level": level,
        "color": color,
        "latest_price": latest_price,
        "sentiment_score": round(sentiment_score, 4),
        "momentum_score": round(momentum_score, 4),
        "trend_score": round(trend_score, 4),
        "sentiment_trend": sentiment_trend,
        "price_momentum": momentum,
        "analysed_at": datetime.utcnow().isoformat(),
    }


def run_aggregator() -> dict:
    print("\n[AGGREGATOR] Calculating volatility scores...")
    assets = ["gold", "silver", "oil", "asx200"]
    results = {}
    for asset in assets:
        result = calculate_volatility_score(asset)
        results[asset] = result
        print(f"\n{asset.upper()}")
        print(f"  Price:           ${result['latest_price']}")
        print(
            f"  Volatility:      {result['volatility_score']} — {result['volatility_level']} {result['color'].upper()}"
        )
        print(f"  Sentiment score: {result['sentiment_score']}")
        print(f"  Momentum score:  {result['momentum_score']}")
        print(f"  Trend score:     {result['trend_score']}")
    return results


if __name__ == "__main__":
    run_aggregator()
