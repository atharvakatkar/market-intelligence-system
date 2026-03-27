from sentence_transformers import SentenceTransformer, util
import torch

model = SentenceTransformer("all-MiniLM-L6-v2")

ASSET_DESCRIPTIONS = {
    "gold": """
        Gold is a precious metal and safe haven asset. Its price rises during geopolitical 
        tensions, wars, inflation, currency devaluation, and financial crises. It is 
        sensitive to Federal Reserve interest rate decisions, US dollar strength, and 
        central bank policy. Gold is inversely correlated with real interest rates.
    """,
    "silver": """
        Silver is both a precious metal and industrial commodity. Its price is affected by 
        inflation, interest rates, industrial demand, solar panel manufacturing, electronics 
        production, mining supply, and precious metals sentiment. Silver is more volatile 
        than gold and responds to both financial and industrial signals.
    """,
    "oil": """
        Oil and crude petroleum prices are driven by OPEC production decisions, Middle East 
        geopolitical tensions, Iran sanctions, Russia Ukraine war, supply chain disruptions, 
        Strait of Hormuz blockades, refinery capacity, US shale production, global demand, 
        China economic activity, and energy policy decisions.
    """,
    "asx200": """
        The ASX200 is the Australian stock market index. It is sensitive to Reserve Bank of 
        Australia interest rate decisions, Australian inflation, Chinese economic activity, 
        iron ore and mining sector performance, Australian dollar movements, global recession 
        fears, US Federal Reserve policy, and Australian banking sector health.
    """,
}

asset_embeddings = {
    asset: model.encode(description, convert_to_tensor=True)
    for asset, description in ASSET_DESCRIPTIONS.items()
}


def semantic_relevance(headline: str) -> dict:
    headline_embedding = model.encode(headline, convert_to_tensor=True)
    scores = {}
    for asset, asset_embedding in asset_embeddings.items():
        similarity = util.cos_sim(headline_embedding, asset_embedding).item()
        normalized = round((similarity + 1) / 2, 4)
        scores[asset] = normalized
    return scores


if __name__ == "__main__":
    test_headlines = [
        "Saudi Oil Exports to China Fall Amid Iran War Disruptions",
        "Gold prices surge as Federal Reserve signals rate pause",
        "RBA holds interest rates steady amid Australian inflation concerns",
        "Silver futures log worst day since 2021 retreating from record",
        "Co-op boss quits after toxic culture claims",
        "Recession odds climb on Wall Street as economy shows cracks",
    ]

    print("--- SEMANTIC RELEVANCE SCORES ---\n")
    for headline in test_headlines:
        scores = semantic_relevance(headline)
        print(f"Headline: {headline}")
        for asset, score in scores.items():
            bar = "█" * int(score * 10)
            print(f"  {asset.upper():<10} {score:.4f} {bar}")
        print()
