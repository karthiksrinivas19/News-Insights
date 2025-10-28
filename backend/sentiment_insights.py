from fastapi import APIRouter
from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal, Article

router = APIRouter()

@router.get("/api/sentiment-summary")
def sentiment_summary():
    db: Session = SessionLocal()
    sentiments = db.query(Article.sentiment).all()
    db.close()
    counts = Counter(s[0] for s in sentiments)
    return {
        "positive": counts.get("positive", 0),
        "neutral": counts.get("neutral", 0),
        "negative": counts.get("negative", 0)
    }

@router.get("/api/source-stats")
def source_sentiment_stats():
    db: Session = SessionLocal()
    results = (
        db.query(Article.source, Article.sentiment, func.count(Article.id))
        .group_by(Article.source, Article.sentiment)
        .all()
    )
    db.close()
    stats = {}
    for source, sentiment, count in results:
        if source not in stats:
            stats[source] = {}
        stats[source][sentiment] = count
    return stats
