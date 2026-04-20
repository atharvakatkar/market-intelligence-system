from sqlalchemy import text
from database.connection import SessionLocal
from datetime import datetime


def save_asset_prices(prices: dict):
    db = SessionLocal()
    try:
        for asset, df in prices.items():
            for date, row in df.iterrows():
                db.execute(
                    text(
                        """
                    INSERT INTO asset_prices (asset, close_price, volume, price_date, fetched_at)
                    VALUES (:asset, :close_price, :volume, :price_date, :fetched_at)
                    ON CONFLICT (asset, price_date) DO UPDATE
                    SET close_price = EXCLUDED.close_price,
                        volume = EXCLUDED.volume,
                        fetched_at = EXCLUDED.fetched_at
                """
                    ),
                    {
                        "asset": asset,
                        "close_price": float(row["close"]),
                        "volume": int(row["volume"]),
                        "price_date": date.date(),
                        "fetched_at": row["fetched_at"],
                    },
                )
        db.commit()
        print(f"Saved price data for {len(prices)} assets")
    except Exception as e:
        db.rollback()
        print(f"Error saving prices: {e}")
    finally:
        db.close()


def save_headlines_and_sentiment(results: list):
    db = SessionLocal()
    try:
        saved = 0
        for r in results:
            result = db.execute(
                text(
                    """
                INSERT INTO headlines (source, headline, scraped_at, published_at)
                VALUES (:source, :headline, :scraped_at, :published_at)
                RETURNING id
            """
                ),
                {
                    "source": r["source"],
                    "headline": r["headline"],
                    "scraped_at": r["scraped_at"],
                    "published_at": r.get("published_at", None),
                },
            )
            headline_id = result.fetchone()[0]

            for asset in r.get("relevant_assets", []):
                relevance = r.get("relevance", {}).get(asset, {})
                scores = r.get("scores", {})
                db.execute(
                    text(
                        """
                    INSERT INTO sentiment_scores (
                        headline_id, asset, sentiment,
                        positive_score, negative_score, neutral_score,
                        keyword_relevance, semantic_relevance, combined_relevance,
                        analysed_at
                    ) VALUES (
                        :headline_id, :asset, :sentiment,
                        :positive_score, :negative_score, :neutral_score,
                        :keyword_relevance, :semantic_relevance, :combined_relevance,
                        :analysed_at
                    )
                """
                    ),
                    {
                        "headline_id": headline_id,
                        "asset": asset,
                        "sentiment": r.get("sentiment", "neutral"),
                        "positive_score": float(scores.get("positive", 0)),
                        "negative_score": float(scores.get("negative", 0)),
                        "neutral_score": float(scores.get("neutral", 0)),
                        "keyword_relevance": float(relevance.get("keyword", 0)),
                        "semantic_relevance": float(relevance.get("semantic", 0)),
                        "combined_relevance": float(relevance.get("combined", 0)),
                        "analysed_at": datetime.utcnow(),
                    },
                )
            saved += 1
        db.commit()
        print(f"Saved {saved} headlines with sentiment scores")
    except Exception as e:
        db.rollback()
        print(f"Error saving headlines: {e}")
    finally:
        db.close()


def save_sentiment_summary(asset_sentiments: dict):
    db = SessionLocal()
    try:
        for asset, counts in asset_sentiments.items():
            total = counts["total"]
            db.execute(
                text(
                    """
                INSERT INTO asset_sentiment_summary (
                    asset, positive_pct, negative_pct, neutral_pct,
                    dominant_sentiment, headline_count, pipeline_run_at
                ) VALUES (
                    :asset, :positive_pct, :negative_pct, :neutral_pct,
                    :dominant_sentiment, :headline_count, :pipeline_run_at
                )
            """
                ),
                {
                    "asset": asset,
                    "positive_pct": round(counts["positive"] / total, 4),
                    "negative_pct": round(counts["negative"] / total, 4),
                    "neutral_pct": round(counts["neutral"] / total, 4),
                    "dominant_sentiment": max(
                        ["positive", "negative", "neutral"], key=lambda x: counts[x]
                    ),
                    "headline_count": total,
                    "pipeline_run_at": datetime.utcnow(),
                },
            )
        db.commit()
        print(f"Saved sentiment summary for {len(asset_sentiments)} assets")
    except Exception as e:
        db.rollback()
        print(f"Error saving sentiment summary: {e}")
    finally:
        db.close()


def save_volatility_scores(scores: dict):
    db = SessionLocal()
    try:
        for asset, data in scores.items():
            db.execute(
                text(
                    """
                INSERT INTO volatility_scores (
                    asset, volatility_score, volatility_level, color,
                    latest_price, sentiment_score, momentum_score,
                    trend_score, sentiment_trend, price_momentum,
                    calculated_at
                ) VALUES (
                    :asset, :volatility_score, :volatility_level, :color,
                    :latest_price, :sentiment_score, :momentum_score,
                    :trend_score, :sentiment_trend, :price_momentum,
                    :calculated_at
                )
            """
                ),
                {
                    "asset": asset,
                    "volatility_score": data["volatility_score"],
                    "volatility_level": data["volatility_level"],
                    "color": data["color"],
                    "latest_price": data["latest_price"],
                    "sentiment_score": data["sentiment_score"],
                    "momentum_score": data["momentum_score"],
                    "trend_score": data["trend_score"],
                    "sentiment_trend": data["sentiment_trend"],
                    "price_momentum": data["price_momentum"],
                    "calculated_at": data["analysed_at"],
                },
            )
        db.commit()
        print(f"Saved volatility scores for {len(scores)} assets")
    except Exception as e:
        db.rollback()
        print(f"Error saving volatility scores: {e}")
    finally:
        db.close()


def save_predictions(asset: str, predictions: list, model_r2: float):
    db = SessionLocal()
    try:
        for p in predictions:
            db.execute(
                text(
                    """
                INSERT INTO price_predictions (
                    asset, prediction_date, predicted_price, model_r2, generated_at
                ) VALUES (
                    :asset, :prediction_date, :predicted_price, :model_r2, :generated_at
                )
                ON CONFLICT (asset, prediction_date) 
                DO UPDATE SET
                    predicted_price = EXCLUDED.predicted_price,
                    model_r2 = EXCLUDED.model_r2,
                    generated_at = EXCLUDED.generated_at
            """
                ),
                {
                    "asset": asset,
                    "prediction_date": p["date"],
                    "predicted_price": p["predicted_price"],
                    "model_r2": model_r2,
                    "generated_at": datetime.utcnow(),
                },
            )
        db.commit()
        print(f"Saved {len(predictions)} predictions for {asset}")
    except Exception as e:
        db.rollback()
        print(f"Error saving predictions for {asset}: {e}")
    finally:
        db.close()


def update_actual_prices():
    db = SessionLocal()
    try:
        db.execute(
            text(
                """
            UPDATE price_predictions pp
            SET actual_price = ap.close_price
            FROM asset_prices ap
            WHERE pp.asset = ap.asset
            AND pp.prediction_date = ap.price_date
            AND pp.prediction_date <= CURRENT_DATE
        """
            )
        )
        db.commit()
        print("Updated actual prices for past predictions")
    except Exception as e:
        db.rollback()
        print(f"Error updating actual prices: {e}")
    finally:
        db.close()
