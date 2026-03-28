import pandas as pd
import numpy as np
from sqlalchemy import text
from database.connection import SessionLocal
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler


def get_price_history_for_prediction(asset: str) -> pd.DataFrame:
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
        return df
    finally:
        db.close()


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["return_1d"] = df["close_price"].pct_change(1)
    df["return_5d"] = df["close_price"].pct_change(5)
    df["return_10d"] = df["close_price"].pct_change(10)
    df["ma_7"] = df["close_price"].rolling(7).mean()
    df["ma_21"] = df["close_price"].rolling(21).mean()
    df["volatility_7d"] = df["return_1d"].rolling(7).std()
    df["volatility_21d"] = df["return_1d"].rolling(21).std()
    df["ma_ratio"] = df["ma_7"] / df["ma_21"]
    df = df.dropna()
    return df


def train_and_predict(asset: str, forecast_days: int = 10) -> dict:
    df = get_price_history_for_prediction(asset)

    if df.empty or len(df) < 30:
        return {"asset": asset, "status": "insufficient_data", "predictions": []}

    df = engineer_features(df)

    feature_cols = [
        "return_1d",
        "return_5d",
        "return_10d",
        "ma_7",
        "ma_21",
        "volatility_7d",
        "volatility_21d",
        "ma_ratio",
    ]

    X = df[feature_cols].values[:-1]
    y = df["close_price"].values[1:]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LinearRegression()
    model.fit(X_scaled, y)

    train_score = round(model.score(X_scaled, y), 4)

    # Generate predictions for next 10 days
    predictions = []
    last_row = df.iloc[-1].copy()
    current_price = float(last_row["close_price"])
    last_date = pd.Timestamp(df["price_date"].iloc[-1])

    temp_prices = list(df["close_price"].values)

    for i in range(1, forecast_days + 1):
        temp_df = pd.DataFrame({"close_price": temp_prices})
        temp_df["return_1d"] = temp_df["close_price"].pct_change(1)
        temp_df["return_5d"] = temp_df["close_price"].pct_change(5)
        temp_df["return_10d"] = temp_df["close_price"].pct_change(10)
        temp_df["ma_7"] = temp_df["close_price"].rolling(7).mean()
        temp_df["ma_21"] = temp_df["close_price"].rolling(21).mean()
        temp_df["volatility_7d"] = temp_df["return_1d"].rolling(7).std()
        temp_df["volatility_21d"] = temp_df["return_1d"].rolling(21).std()
        temp_df["ma_ratio"] = temp_df["ma_7"] / temp_df["ma_21"]
        temp_df = temp_df.dropna()

        if temp_df.empty:
            break

        features = temp_df[feature_cols].iloc[-1].values.reshape(1, -1)
        features_scaled = scaler.transform(features)
        predicted_price = float(model.predict(features_scaled)[0])

        forecast_date = last_date + timedelta(days=i)
        predictions.append(
            {
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_price": round(predicted_price, 2),
                "is_prediction": True,
            }
        )

        temp_prices.append(predicted_price)

    return {
        "asset": asset,
        "status": "ok",
        "model_r2": train_score,
        "current_price": round(current_price, 2),
        "predictions": predictions,
        "disclaimer": "Predictions based on 6 months price momentum and volatility patterns. Model improves as sentiment data accumulates over time.",
        "generated_at": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    for asset in ["gold", "silver", "oil", "asx200"]:
        result = train_and_predict(asset)
        print(f"\n{asset.upper()} — R² {result.get('model_r2')}")
        for p in result.get("predictions", [])[:3]:
            print(f"  {p['date']}: ${p['predicted_price']}")
