import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.stocks.price_agent import fetch_historical_prices
from agents.news.scraper import scrape_all
from agents.news.sentiment_agent import analyse_sentiment
from agents.news.relevance_combined import combined_relevance, filter_relevant_headlines
from database.writer import save_asset_prices, save_headlines_and_sentiment, save_sentiment_summary
from datetime import datetime

def run_full_pipeline():
    print(f"\n{'='*60}")
    print(f"PIPELINE RUN — {datetime.utcnow().isoformat()}")
    print(f"{'='*60}")

    # Step 1 — Fetch and save historical prices
    print("\n[1/4] Fetching asset prices...")
    prices = fetch_historical_prices()
    save_asset_prices(prices)

    # Step 2 — Scrape headlines
    print("\n[2/4] Scraping headlines...")
    headlines = scrape_all()
    print(f"Scraped {len(headlines)} headlines")

    # Step 3 — Score relevance
    print("\n[3/4] Scoring relevance...")
    scored_headlines = filter_relevant_headlines(headlines)
    print(f"Relevant headlines after filtering: {len(scored_headlines)}")

    # Step 4 — Run sentiment analysis
    print("\n[4/4] Running sentiment analysis...")
    texts = [h["headline"] for h in scored_headlines]
    sentiments = analyse_sentiment(texts)

    # Merge sentiment into headlines
    results = []
    asset_sentiments = {}

    for i, headline in enumerate(scored_headlines):
        headline["sentiment"] = sentiments[i]["sentiment"]
        headline["scores"] = sentiments[i]["scores"]
        results.append(headline)

        for asset in headline.get("relevant_assets", []):
            if asset not in asset_sentiments:
                asset_sentiments[asset] = {
                    "positive": 0,
                    "negative": 0,
                    "neutral": 0,
                    "total": 0
                }
            asset_sentiments[asset][headline["sentiment"]] += 1
            asset_sentiments[asset]["total"] += 1

    # Save to database
    save_headlines_and_sentiment(results)
    save_sentiment_summary(asset_sentiments)

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

    return results, asset_sentiments

if __name__ == "__main__":
    run_full_pipeline()
