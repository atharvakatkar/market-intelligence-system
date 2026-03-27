-- Asset prices table
CREATE TABLE IF NOT EXISTS asset_prices (
    id SERIAL PRIMARY KEY,
    asset VARCHAR(20) NOT NULL,
    close_price DECIMAL(12,4) NOT NULL,
    volume BIGINT,
    price_date DATE NOT NULL,
    fetched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(asset, price_date)
);

-- Headlines table
CREATE TABLE IF NOT EXISTS headlines (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    headline TEXT NOT NULL,
    scraped_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sentiment scores table
CREATE TABLE IF NOT EXISTS sentiment_scores (
    id SERIAL PRIMARY KEY,
    headline_id INTEGER REFERENCES headlines(id),
    asset VARCHAR(20) NOT NULL,
    sentiment VARCHAR(20) NOT NULL,
    positive_score DECIMAL(6,4),
    negative_score DECIMAL(6,4),
    neutral_score DECIMAL(6,4),
    keyword_relevance DECIMAL(6,4),
    semantic_relevance DECIMAL(6,4),
    combined_relevance DECIMAL(6,4),
    analysed_at TIMESTAMP DEFAULT NOW()
);

-- Asset sentiment summary table
CREATE TABLE IF NOT EXISTS asset_sentiment_summary (
    id SERIAL PRIMARY KEY,
    asset VARCHAR(20) NOT NULL,
    positive_pct DECIMAL(6,4),
    negative_pct DECIMAL(6,4),
    neutral_pct DECIMAL(6,4),
    dominant_sentiment VARCHAR(20),
    headline_count INTEGER,
    pipeline_run_at TIMESTAMP DEFAULT NOW()
);