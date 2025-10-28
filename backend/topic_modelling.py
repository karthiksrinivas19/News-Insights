from fastapi import APIRouter
from sklearn.feature_extraction.text import TfidfVectorizer
from database import SessionLocal, Article

router = APIRouter()

@router.get("/api/topics")
def get_top_topics(top_n: int = 10):
    db = SessionLocal()
    articles = db.query(Article.title).all()
    db.close()

    documents = [a[0] for a in articles if a[0]]

    if not documents:
        return {"topics": []}

    vectorizer = TfidfVectorizer(stop_words='english', max_features=top_n)
    X = vectorizer.fit_transform(documents)
    features = vectorizer.get_feature_names_out()

    return {"topics": list(features)}
