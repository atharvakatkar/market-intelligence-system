import requests
from bs4 import BeautifulSoup
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def scrape_kitco():
    headlines = []
    try:
        url = "https://www.kitco.com/news/gold"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "lxml")
        articles = soup.select(
            "h3.article-title, h2.article-title, .news-title, h3 a, h2 a"
        )
        for article in articles[:10]:
            text = article.get_text(strip=True)
            if len(text) > 20:
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


def scrape_oilprice():
    headlines = []
    try:
        url = "https://oilprice.com/Latest-Energy-News/World-News/"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "lxml")
        articles = soup.select("h2.categoryArticle__title, h3 a, .article-title a")
        for article in articles[:10]:
            text = article.get_text(strip=True)
            if len(text) > 20:
                headlines.append(
                    {
                        "source": "oilprice",
                        "headline": text,
                        "assets": ["oil"],
                        "scraped_at": datetime.utcnow().isoformat(),
                    }
                )
    except Exception as e:
        print(f"OilPrice scrape error: {e}")
    return headlines


def scrape_reuters():
    headlines = []
    try:
        url = "https://www.cnbc.com/id/10000664/device/rss/rss.html"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "xml")
        items = soup.find_all("item")[:10]
        for item in items:
            title = item.find("title")
            if title:
                text = title.get_text(strip=True)
                if len(text) > 20:
                    headlines.append(
                        {
                            "source": "cnbc",
                            "headline": text,
                            "assets": ["gold", "silver", "oil", "asx200"],
                            "scraped_at": datetime.utcnow().isoformat(),
                        }
                    )
    except Exception as e:
        print(f"Reuters scrape error: {e}")
    return headlines


def scrape_bbc():
    headlines = []
    try:
        url = "https://feeds.bbci.co.uk/news/business/rss.xml"
        response = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(response.text, "xml")
        items = soup.find_all("item")[:10]
        for item in items:
            title = item.find("title")
            if title:
                text = title.get_text(strip=True)
                if len(text) > 20:
                    headlines.append(
                        {
                            "source": "bbc",
                            "headline": text,
                            "assets": ["gold", "silver", "oil", "asx200"],
                            "scraped_at": datetime.utcnow().isoformat(),
                        }
                    )
    except Exception as e:
        print(f"BBC scrape error: {e}")
    return headlines


def scrape_all():
    all_headlines = []
    all_headlines.extend(scrape_kitco())
    all_headlines.extend(scrape_oilprice())
    all_headlines.extend(scrape_reuters())
    all_headlines.extend(scrape_bbc())
    print(f"Total headlines scraped: {len(all_headlines)}")
    return all_headlines


if __name__ == "__main__":
    headlines = scrape_all()
    for h in headlines:
        print(f"\n[{h['source'].upper()}] {h['headline']}")
