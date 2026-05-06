ASSET_KEYWORDS = {
    "gold": [
        "gold",
        "bullion",
        "safe haven",
        "precious metal",
        "inflation",
        "fed",
        "federal reserve",
        "interest rate",
        "dollar",
        "treasury",
        "xau",
        "mint",
        "commodity",
        "hedge",
        "geopolitical",
        "war",
        "conflict",
        "sanctions",
        "rba",
        "central bank",
    ],
    "silver": [
        "silver",
        "precious metal",
        "industrial metal",
        "mining",
        "xag",
        "commodity",
        "bullion",
        "solar",
        "electronics",
        "manufacturing",
        "supply chain",
        "demand",
        "inflation",
        "fed",
        "interest rate",
    ],
    "oil": [
        "oil",
        "crude",
        "brent",
        "wti",
        "opec",
        "energy",
        "refinery",
        "fuel",
        "petroleum",
        "gas",
        "pipeline",
        "barrel",
        "supply",
        "drilling",
        "iran",
        "saudi",
        "middle east",
        "russia",
        "ukraine",
        "hormuz",
        "lng",
        "shale",
        "embargo",
        "sanctions",
    ],
    "audinr": [
        "rupee",
        "inr",
        "rbi",
        "reserve bank of india",
        "forex",
        "exchange rate",
        "aud",
        "australian dollar",
        "remittance",
        "dollar rupee",
        "depreciation",
        "appreciation",
        "currency intervention",
        "monetary policy",
        "inflation",
        "interest rate",
        "capital outflow",
        "capital inflow",
        "trade deficit",
        "current account",
        "foreign exchange",
        "fx reserve",
    ],
    "asx200": [
        "asx",
        "australia",
        "rba",
        "reserve bank",
        "aussie",
        "sydney",
        "melbourne",
        "australian",
        "interest rate",
        "inflation",
        "gdp",
        "recession",
        "stocks",
        "equity",
        "market",
        "shares",
        "economy",
        "trade",
        "china",
        "iron ore",
        "mining",
        "banking",
    ],
}


def keyword_relevance(headline: str, asset: str) -> float:
    headline_lower = headline.lower()
    keywords = ASSET_KEYWORDS.get(asset, [])

    if not keywords:
        return 0.0

    matches = sum(1 for keyword in keywords if keyword in headline_lower)
    score = min(matches / 3, 1.0)
    return round(score, 4)


def score_headline_keywords(headline: str) -> dict:
    scores = {}
    for asset in ASSET_KEYWORDS.keys():
        scores[asset] = keyword_relevance(headline, asset)
    return scores


if __name__ == "__main__":
    test_headlines = [
        "Saudi Oil Exports to China Fall Amid Iran War Disruptions",
        "Gold prices surge as Federal Reserve signals rate pause",
        "RBA holds interest rates steady amid Australian inflation concerns",
        "Silver demand rises on solar panel manufacturing growth",
        "Co-op boss quits after toxic culture claims",
    ]

    print("--- KEYWORD RELEVANCE SCORES ---\n")
    for headline in test_headlines:
        scores = score_headline_keywords(headline)
        print(f"Headline: {headline}")
        for asset, score in scores.items():
            bar = "█" * int(score * 10)
            print(f"  {asset.upper():<10} {score:.2f} {bar}")
        print()
