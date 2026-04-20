import requests
from bs4 import BeautifulSoup
from datetime import datetime
from agents.news.sentiment_agent import analyse_sentiment
from agents.news.relevance_combined import combined_relevance, filter_relevant_headlines

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def scrape_rba():
    headlines = []
    urls = [
        "https://www.rba.gov.au/rss/rss-cb-media-releases.xml",
        "https://www.rba.gov.au/rss/rss-cb-speeches.xml",
    ]
    for url in urls:
        try:
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.encoding = "utf-8"
            soup = BeautifulSoup(response.text, "xml")
            items = soup.find_all("item")[:10]
            for item in items:
                title = item.find("title") or item.find("cb:simpleTitle")
                pub_date = item.find("pubDate") or item.find("date")
                if title:
                    text = title.get_text(strip=True)
                    text = text.encode("ascii", "ignore").decode("ascii")
                    if len(text) > 20:
                        parsed_date = None
                        if pub_date:
                            try:
                                from dateutil import parser as dateparser
                                parsed_date = dateparser.parse(pub_date.get_text(strip=True)).isoformat()
                            except Exception:
                                parsed_date = None
                        headlines.append(
                            {
                                "source": "rba",
                                "headline": text,
                                "assets": ["gold", "silver", "asx200"],
                                "scraped_at": datetime.utcnow().isoformat(),
                                "published_at": parsed_date,
                            }
                        )
        except Exception as e:
            print(f"RBA scrape error ({url}): {e}")
    return headlines


def run_rba_agent():
    print("\n[RBA AGENT] Scraping RBA communications...")
    headlines = scrape_rba()
    print(f"Scraped {len(headlines)} RBA headlines")

    if not headlines:
        print("No RBA headlines found")
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
    results = run_rba_agent()
    print(f"\nTotal RBA signals: {len(results)}")
