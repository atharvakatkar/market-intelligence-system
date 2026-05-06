import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.stocks.price_agent import fetch_historical_prices
from agents.news.scraper import scrape_all
from agents.news.sentiment_agent import analyse_sentiment
from agents.news.relevance_combined import filter_relevant_headlines
from agents.banking.rba_agent import run_rba_agent
from agents.banking.worldbank_agent import run_worldbank_agent
from agents.commodities.kitco_agent import run_kitco_agent
from agents.oil.oil_agent import run_oil_agent
from agents.india.india_agent import run_india_agent
from database.writer import (
    save_asset_prices,
    save_headlines_and_sentiment,
    save_sentiment_summary,
    save_volatility_scores,
    save_predictions,
    update_actual_prices,
)
from aggregator.aggregator import run_aggregator
from aggregator.predictor import train_and_predict
from datetime import datetime


def run_full_pipeline():
    print(f"\n{'='*60}")
    print(f"PIPELINE RUN — {datetime.utcnow().isoformat()}")
    print(f"{'='*60}")

    # Step 1 — Fetch and save historical prices
    print("\n[1/4] Fetching asset prices...")
    prices = fetch_historical_prices()
    save_asset_prices(prices)

    # Step 2 — Run all specialist agents
    print("\n[2/4] Running specialist agents...")
    all_results = []
    all_results.extend(run_rba_agent())
    all_results.extend(run_worldbank_agent())
    all_results.extend(run_kitco_agent())
    all_results.extend(run_oil_agent())
    all_results.extend(run_india_agent())

    # Step 3 — Scrape and process general news
    print("\n[3/4] Scraping general news...")
    headlines = scrape_all()
    scored_headlines = filter_relevant_headlines(headlines)
    texts = [h["headline"] for h in scored_headlines]
    sentiments = analyse_sentiment(texts)
    for i, headline in enumerate(scored_headlines):
        headline["sentiment"] = sentiments[i]["sentiment"]
        headline["scores"] = sentiments[i]["scores"]
    all_results.extend(scored_headlines)
    print(f"Total signals across all agents: {len(all_results)}")

    # Step 4 — Build asset sentiment summary from all_results
    print("\n[4/4] Building sentiment summary...")
    asset_sentiments = {}
    for headline in all_results:
        for asset in headline.get("relevant_assets", []):
            if asset not in asset_sentiments:
                asset_sentiments[asset] = {
                    "positive": 0,
                    "negative": 0,
                    "neutral": 0,
                    "total": 0,
                }
            sentiment = headline.get("sentiment", "neutral")
            asset_sentiments[asset][sentiment] += 1
            asset_sentiments[asset]["total"] += 1

    # Save to database
    save_headlines_and_sentiment(all_results)
    save_sentiment_summary(asset_sentiments)

    # Step 5 — Run aggregator and save volatility scores
    print("\n[5/5] Running aggregator and predictions...")
    volatility_scores = run_aggregator()
    save_volatility_scores(volatility_scores)

    # Step 6 — Generate and save predictions
    for asset in ["gold", "silver", "oil", "asx200", "audinr"]:
        pred_result = train_and_predict(asset)
        if pred_result["status"] == "ok":
            save_predictions(asset, pred_result["predictions"], pred_result["model_r2"])

    # Step 7 — Update actual prices for past predictions
    update_actual_prices()

    # Print summary
    print(f"\n{'='*60}")
    print("PIPELINE COMPLETE — ASSET SENTIMENT SUMMARY")
    print(f"{'='*60}")
    for asset, counts in asset_sentiments.items():
        total = counts["total"]
        pos = round(counts["positive"] / total * 100, 1)
        neg = round(counts["negative"] / total * 100, 1)
        neu = round(counts["neutral"] / total * 100, 1)
        dominant = max(["positive", "negative", "neutral"], key=lambda x: counts[x])
        print(f"\n{asset.upper()}")
        print(f"  Positive: {pos}% | Negative: {neg}% | Neutral: {neu}%")
        print(f"  Dominant: {dominant.upper()}")

    return all_results, asset_sentiments


if __name__ == "__main__":
    run_full_pipeline()
