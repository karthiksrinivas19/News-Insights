from fastapi import FastAPI
from datetime import datetime
import requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sentiment_insights import router as sentiment_router
from database import SessionLocal, Article
from topic_modelling import router as topic_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify your frontend origin
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(topic_router)
app.include_router(sentiment_router)

GUARDIAN_API_KEY = "4e5da786-f445-4925-99e6-2176abe06408"
GUARDIAN_BASE_URL = "https://content.guardianapis.com/search"
GUARDIAN_PAGE_SIZE = 15

NYT_API_KEY = "pCueqJQ13lBvLH9TOBkDSI6etokIiG4E"
NYT_URL = "https://api.nytimes.com/svc/topstories/v2/home.json"
NYT_PAGE_SIZE = 15

analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment(text: str) -> str:
    if not text:
        return "neutral"
    scores = analyzer.polarity_scores(text)
    compound = scores['compound']
    print(f"Compound score: {compound}")  # Remove or comment out after debugging
    if compound >= 0.05:
        return "positive"
    elif compound <= -0.05:
        return "negative"
    else:
        return "neutral"

def update_sentiment_for_articles(db_session):
    articles = db_session.query(Article).all()
    for article in articles:
        # Combine title, description, and content for better sentiment analysis
        text = " ".join(filter(None, [article.title, article.description, article.content]))
        article.sentiment = analyze_sentiment(text)
    db_session.commit()

def fetch_guardian_articles():
    params = {
        "api-key": GUARDIAN_API_KEY,
        "page-size": GUARDIAN_PAGE_SIZE,
        "show-fields": "headline,trailText,bodyText",
        "order-by": "newest"
    }
    response = requests.get(GUARDIAN_BASE_URL, params=params)
    data = response.json()
    articles = data.get("response", {}).get("results", [])
    results = []
    for article in articles:
        results.append({
            "title": article.get("fields", {}).get("headline", ""),
            "description": article.get("fields", {}).get("trailText", ""),
            "content": article.get("fields", {}).get("bodyText", ""),
            "source": "The Guardian",
            "published_date": datetime.fromisoformat(article.get("webPublicationDate", "")[:-1]),
        })
    return results

def fetch_nyt_articles():
    params = {
        "api-key": NYT_API_KEY,
    }
    response = requests.get(NYT_URL, params=params)
    data = response.json()
    articles = data.get("results", [])
    results = []
    for article in articles[:NYT_PAGE_SIZE]:  # Limit to 15 articles
        pub_date_str = article.get("published_date", "")
        try:
            published_date = datetime.strptime(pub_date_str, "%Y-%m-%dT%H:%M:%S%z").replace(tzinfo=None)
        except Exception:
            published_date = None
        results.append({
            "title": article.get("title", ""),
            "description": article.get("abstract", ""),
            "content": article.get("abstract", ""),  # NYT does not provide full content here
            "source": "New York Times",
            "published_date": published_date,
        })
    return results

@app.get("/fetch-articles")
def fetch_and_store_articles():
    db = SessionLocal()
    guardian_articles = fetch_guardian_articles()
    nyt_articles = fetch_nyt_articles()
    all_articles = guardian_articles + nyt_articles
    for art in all_articles:
        db_article = Article(
            title=art["title"],
            description=art["description"],
            content=art["content"],
            source=art["source"],
            published_date=art["published_date"]
        )
        db.add(db_article)
    db.commit()
    update_sentiment_for_articles(db)
    db.close()
    return {"message": f"Fetched, stored, and analyzed sentiment for {len(all_articles)} articles."}

@app.get("/articles")
def get_articles():
    db = SessionLocal()
    articles = db.query(Article).order_by(Article.published_date.desc()).all()
    db.close()
    return [
        {
            "title": a.title,
            "description": a.description,
            "source": a.source,
            "published_date": a.published_date,
            "sentiment": a.sentiment
        } for a in articles
    ]
