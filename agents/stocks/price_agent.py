import yfinance as yf
import pandas as pd
from datetime import datetime

ASSETS = {
    "gold": "GC=F",
    "silver": "SI=F",
    "oil": "CL=F",
    "asx200": "^AXJO"
}

def fetch_historical_prices(period="6mo", interval="1d"):
    results = {}
    for asset_name, ticker in ASSETS.items():
        try:
            ticker_obj = yf.Ticker(ticker)
            df = ticker_obj.history(period=period, interval=interval)
            if df.empty:
                print(f"No data returned for {asset_name}")
                continue
            df = df[["Close", "Volume"]].copy()
            df.index = pd.to_datetime(df.index)
            df.index = df.index.tz_localize(None)
            df.columns = ["close", "volume"]
            df["asset"] = asset_name
            df["fetched_at"] = datetime.utcnow()
            results[asset_name] = df
            print(f"Fetched {len(df)} rows for {asset_name}")
        except Exception as e:
            print(f"Error fetching {asset_name}: {e}")
    return results

if __name__ == "__main__":
    data = fetch_historical_prices()
    for asset, df in data.items():
        print(f"\n{asset.upper()}")
        print(df.tail(3))
