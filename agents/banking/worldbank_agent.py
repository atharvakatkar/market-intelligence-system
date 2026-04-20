import requests
from bs4 import BeautifulSoup
from datetime import datetime
from agents.news.sentiment_agent import analyse_sentiment
from agents.news.relevance_combined import filter_relevant_headlines

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}


def scrape_imf():
    headlines = []
    urls = [
        "https://www.ft.com/rss/home",
        "https://feeds.marketwatch.com/marketwatch/topstories",
    ]
    sources = ["ft", "marketwatch"]
    for i, url in enumerate(urls):
        try:
            session = requests.Session()
            session.headers.update(HEADERS)
            response = session.get(url, timeout=15)
            soup = BeautifulSoup(response.text, "xml")
            items = soup.find_all("item")[:10]
            for item in items:
                title = item.find("title")
                pub_date = item.find("pubDate")
                if title:
                    text = title.get_text(strip=True)
                    text = text.encode("ascii", "ignore").decode("ascii")
                    if len(text) > 25:
                        parsed_date = None
                        if pub_date:
                            try:
                                from email.utils import parsedate_to_datetime
                                parsed_date = parsedate_to_datetime(pub_date.get_text(strip=True)).isoformat()
                            except Exception:
                                parsed_date = None
                        headlines.append(
                            {
                                "source": sources[i],
                                "headline": text,
                                "assets": ["gold", "silver", "oil", "asx200"],
                                "scraped_at": datetime.utcnow().isoformat(),
                                "published_at": parsed_date,
                            }
                        )
        except Exception as e:
            print(f"Scrape error ({url}): {e}")
    return headlines


def run_worldbank_agent():
    print("\n[IMF AGENT] Scraping IMF communications...")
    headlines = scrape_imf()
    print(f"Scraped {len(headlines)} IMF headlines")

    if not headlines:
        print("No IMF headlines found")
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
    results = run_worldbank_agent()
    print(f"\nTotal IMF signals: {len(results)}")
