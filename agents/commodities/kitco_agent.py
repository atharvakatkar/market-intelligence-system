import requests
from bs4 import BeautifulSoup
from datetime import datetime
from agents.news.sentiment_agent import analyse_sentiment
from agents.news.relevance_combined import filter_relevant_headlines

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def scrape_kitco():
    headlines = []
    url = "https://www.kitco.com/news/"
    try:
        session = requests.Session()
        session.headers.update(HEADERS)
        response = session.get(url, timeout=15)
        soup = BeautifulSoup(response.text, "lxml")
        all_links = soup.find_all("a")
        for link in all_links:
            text = link.get_text(strip=True)
            if len(text) > 25:
                text = text.encode("ascii", "ignore").decode("ascii")
                BLOCKLIST = [
                    "buy/sell",
                    "bullion coins",
                    "all metal quotes",
                    "precious metalsall",
                ]
                if len(text) > 25 and not any(b in text.lower() for b in BLOCKLIST):
                    headlines.append(
                        {
                            "source": "kitco",
                            "headline": text,
                            "assets": ["gold", "silver"],
                            "scraped_at": datetime.utcnow().isoformat(),
                        }
                    )
    except Exception as e:
        print(f"Kitco scrape error: {e}")
    return headlines


def run_kitco_agent():
    print("\n[KITCO AGENT] Scraping Kitco gold and silver news...")
    headlines = scrape_kitco()
    print(f"Scraped {len(headlines)} Kitco headlines")

    if not headlines:
        print("No Kitco headlines found")
        return []

    filtered = filter_relevant_headlines(headlines)
    print(f"Relevant after filtering: {len(filtered)}")

    if not filtered:
        return []

    texts = [h["headline"] for h in filtered]
    sentiments = analyse_sentiment(texts)

    results = []
    for i, headline in enumerate(filtered):
        headline["sentiment"] = sentiments[i]["sentiment"]
        headline["scores"] = sentiments[i]["scores"]
        results.append(headline)
        print(f"  [{headline['sentiment'].upper()}] {headline['headline'][:80]}")

    return results


if __name__ == "__main__":
    results = run_kitco_agent()
    print(f"\nTotal Kitco signals: {len(results)}")
