from agents.news.relevance import score_headline_keywords
from agents.news.semantic_relevance import semantic_relevance

KEYWORD_WEIGHT = 0.4
SEMANTIC_WEIGHT = 0.6

RELEVANCE_THRESHOLD = 0.35


def combined_relevance(headline: str) -> dict:
    keyword_scores = score_headline_keywords(headline)
    semantic_scores = semantic_relevance(headline)

    combined = {}
    for asset in keyword_scores.keys():
        keyword = keyword_scores[asset]
        semantic = semantic_scores[asset]
        score = round((KEYWORD_WEIGHT * keyword) + (SEMANTIC_WEIGHT * semantic), 4)
        combined[asset] = {
            "keyword": keyword,
            "semantic": semantic,
            "combined": score,
            "relevant": score >= RELEVANCE_THRESHOLD,
        }
    return combined


def filter_relevant_headlines(headlines: list) -> list:
    filtered = []
    for headline in headlines:
        scores = combined_relevance(headline["headline"])
        relevant_assets = [asset for asset, data in scores.items() if data["relevant"]]
        if relevant_assets:
            headline["relevance"] = scores
            headline["relevant_assets"] = relevant_assets
            filtered.append(headline)
    return filtered


if __name__ == "__main__":
    test_headlines = [
        {
            "headline": "Saudi Oil Exports to China Fall Amid Iran War Disruptions",
            "assets": ["oil"],
        },
        {
            "headline": "Gold prices surge as Federal Reserve signals rate pause",
            "assets": ["gold"],
        },
        {
            "headline": "RBA holds interest rates steady amid Australian inflation concerns",
            "assets": ["asx200"],
        },
        {
            "headline": "Silver futures log worst day since 2021 retreating from record",
            "assets": ["silver"],
        },
        {
            "headline": "Co-op boss quits after toxic culture claims",
            "assets": ["gold", "silver", "oil", "asx200"],
        },
        {
            "headline": "Recession odds climb on Wall Street as economy shows cracks",
            "assets": ["gold", "silver", "oil", "asx200"],
        },
        {
            "headline": "The homeless teenager who became a successful advertising boss",
            "assets": ["gold", "silver", "oil", "asx200"],
        },
    ]

    print("--- COMBINED RELEVANCE SCORES ---\n")
    for h in test_headlines:
        scores = combined_relevance(h["headline"])
        print(f"Headline: {h['headline']}")
        for asset, data in scores.items():
            bar = "█" * int(data["combined"] * 10)
            relevant = "✓ RELEVANT" if data["relevant"] else "✗ FILTERED"
            print(
                f"  {asset.upper():<10} keyword={data['keyword']:.2f} semantic={data['semantic']:.4f} combined={data['combined']:.4f} {bar} {relevant}"
            )
        print()

    print("\n--- AFTER FILTERING ---\n")
    filtered = filter_relevant_headlines(test_headlines)
    print(f"Headlines kept: {len(filtered)}/{len(test_headlines)}")
    for h in filtered:
        print(f"  [{', '.join(h['relevant_assets']).upper()}] {h['headline']}")
