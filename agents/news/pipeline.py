from agents.news.scraper import scrape_all
from agents.news.sentiment_agent import analyse_sentiment
from datetime import datetime


def run_news_pipeline():
    print(f"\n[{datetime.utcnow().isoformat()}] Running news pipeline...")

    # Step 1 — Scrape headlines
    headlines = scrape_all()

    if not headlines:
        print("No headlines scraped. Exiting.")
        return []

    # Step 2 — Extract text for sentiment analysis
    texts = [h["headline"] for h in headlines]

    # Step 3 — Run sentiment analysis
    sentiments = analyse_sentiment(texts)

    # Step 4 — Merge results
    results = []
    for i, headline in enumerate(headlines):
        result = {
            "source": headline["source"],
            "headline": headline["headline"],
            "assets": headline["assets"],
            "sentiment": sentiments[i]["sentiment"],
            "scores": sentiments[i]["scores"],
            "scraped_at": headline["scraped_at"],
            "analysed_at": datetime.utcnow().isoformat(),
        }
        results.append(result)

    # Step 5 — Print summary
    print(f"\nProcessed {len(results)} headlines")
    print("\n--- SENTIMENT SUMMARY BY ASSET ---")

    asset_sentiments = {}
    for r in results:
        for asset in r["assets"]:
            if asset not in asset_sentiments:
                asset_sentiments[asset] = {
                    "positive": 0,
                    "negative": 0,
                    "neutral": 0,
                    "total": 0,
                }
            asset_sentiments[asset][r["sentiment"]] += 1
            asset_sentiments[asset]["total"] += 1

    for asset, counts in asset_sentiments.items():
        total = counts["total"]
        pos = round(counts["positive"] / total * 100, 1)
        neg = round(counts["negative"] / total * 100, 1)
        neu = round(counts["neutral"] / total * 100, 1)
        dominant = max(["positive", "negative", "neutral"], key=lambda x: counts[x])
        print(f"\n{asset.upper()}")
        print(f"  Positive: {pos}% | Negative: {neg}% | Neutral: {neu}%")
        print(f"  Dominant signal: {dominant.upper()}")

    return results


if __name__ == "__main__":
    results = run_news_pipeline()
