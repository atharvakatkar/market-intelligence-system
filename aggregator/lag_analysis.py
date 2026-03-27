import pandas as pd
import numpy as np
from sqlalchemy import text
from database.connection import SessionLocal
from datetime import datetime, timedelta


def get_sentiment_history(asset: str) -> pd.DataFrame:
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT 
                DATE(pipeline_run_at) as run_date,
                negative_pct,
                positive_pct,
                neutral_pct,
                headline_count
            FROM asset_sentiment_summary
            WHERE asset = :asset
            ORDER BY pipeline_run_at ASC
        """
            ),
            {"asset": asset},
        )
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(
            rows,
            columns=[
                "run_date",
                "negative_pct",
                "positive_pct",
                "neutral_pct",
                "headline_count",
            ],
        )
        df["run_date"] = pd.to_datetime(df["run_date"])
        df = df.groupby("run_date").mean().reset_index()
        return df
    finally:
        db.close()


def get_price_history(asset: str) -> pd.DataFrame:
    db = SessionLocal()
    try:
        result = db.execute(
            text(
                """
            SELECT price_date, close_price
            FROM asset_prices
            WHERE asset = :asset
            ORDER BY price_date ASC
        """
            ),
            {"asset": asset},
        )
        rows = result.fetchall()
        if not rows:
            return pd.DataFrame()
        df = pd.DataFrame(rows, columns=["price_date", "close_price"])
        df["price_date"] = pd.to_datetime(df["price_date"])
        df["close_price"] = df["close_price"].astype(float)
        df["price_return"] = df["close_price"].pct_change()
        return df
    finally:
        db.close()


def calculate_lag_correlation(asset: str, max_lag_days: int = 5) -> dict:
    sentiment_df = get_sentiment_history(asset)
    price_df = get_price_history(asset)

    if sentiment_df.empty or price_df.empty:
        return {"asset": asset, "status": "insufficient_data", "lags": {}}

    # Merge on date
    merged = pd.merge(
        price_df[["price_date", "price_return"]],
        sentiment_df[["run_date", "negative_pct", "positive_pct"]].rename(
            columns={"run_date": "price_date"}
        ),
        on="price_date",
        how="inner",
    )

    if len(merged) < 10:
        return {
            "asset": asset,
            "status": "insufficient_data",
            "rows": len(merged),
            "lags": {},
        }

    lag_results = {}
    for lag in range(0, max_lag_days + 1):
        if lag == 0:
            corr = merged["negative_pct"].corr(merged["price_return"])
        else:
            corr = merged["negative_pct"].corr(merged["price_return"].shift(-lag))
        lag_results[f"lag_{lag}d"] = (
            round(float(corr), 4) if not np.isnan(corr) else None
        )

    best_lag = max(
        lag_results,
        key=lambda x: abs(lag_results[x]) if lag_results[x] is not None else 0,
    )

    return {
        "asset": asset,
        "status": "ok",
        "rows": len(merged),
        "lag_correlations": lag_results,
        "best_lag": best_lag,
        "best_correlation": lag_results[best_lag],
        "interpretation": interpret_correlation(lag_results[best_lag], best_lag),
    }


def interpret_correlation(corr: float, lag: str) -> str:
    if corr is None:
        return "Insufficient data"
    lag_days = lag.replace("lag_", "").replace("d", "")
    direction = "negative" if corr < 0 else "positive"
    strength = (
        "strong" if abs(corr) > 0.5 else "moderate" if abs(corr) > 0.3 else "weak"
    )
    if corr < 0:
        meaning = "negative sentiment precedes price drops"
    else:
        meaning = "negative sentiment precedes price rises (contrarian signal)"
    return f"{strength} {direction} correlation at {lag_days} day lag — {meaning}"


def run_lag_analysis() -> dict:
    print("\n[LAG ANALYSIS] Calculating sentiment-to-price lag correlations...")
    assets = ["gold", "silver", "oil", "asx200"]
    results = {}
    for asset in assets:
        result = calculate_lag_correlation(asset)
        results[asset] = result
        print(f"\n{asset.upper()}")
        if result["status"] == "insufficient_data":
            print(f"  Insufficient data — need more pipeline runs")
            print(f"  Rows available: {result.get('rows', 0)}")
        else:
            print(f"  Data rows: {result['rows']}")
            print(f"  Lag correlations:")
            for lag, corr in result["lag_correlations"].items():
                bar = "█" * int(abs(corr) * 10) if corr else ""
                print(f"    {lag}: {corr} {bar}")
            print(f"  Best lag: {result['best_lag']}")
            print(f"  Interpretation: {result['interpretation']}")
    return results


if __name__ == "__main__":
    run_lag_analysis()
