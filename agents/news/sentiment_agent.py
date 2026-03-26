from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F

MODEL_NAME = "ProsusAI/finbert"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()

LABELS = ["positive", "negative", "neutral"]

def analyse_sentiment(texts: list[str]) -> list[dict]:
    results = []
    for text in texts:
        try:
            inputs = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            with torch.no_grad():
                outputs = model(**inputs)
            probs = F.softmax(outputs.logits, dim=-1).squeeze()
            scores = {LABELS[i]: round(probs[i].item(), 4) for i in range(3)}
            dominant = max(scores, key=scores.get)
            results.append({
                "text": text[:100],
                "sentiment": dominant,
                "scores": scores
            })
        except Exception as e:
            print(f"Error analysing text: {e}")
    return results

if __name__ == "__main__":
    test_headlines = [
        "Gold prices surge as geopolitical tensions escalate in Middle East",
        "Oil supply increases as OPEC raises production targets",
        "ASX 200 falls sharply amid global recession fears",
        "Silver demand rises on industrial growth in Asia"
    ]
    results = analyse_sentiment(test_headlines)
    for r in results:
        print(f"\nText: {r['text']}")
        print(f"Sentiment: {r['sentiment']}")
        print(f"Scores: {r['scores']}")
