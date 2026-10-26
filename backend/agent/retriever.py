"""Splits the handbook into one chunk per '## ' section and returns only the
top-k chunks relevant to a question (TF-IDF + cosine similarity)."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import config


def load_chunks(path) -> list[dict]:
    sections = path.read_text(encoding="utf-8").split("\n## ")[1:]
    chunks = []
    for i, section in enumerate(sections, start=1):
        title, _, body = section.partition("\n")
        chunks.append({"id": f"chunk-{i:02d}", "title": title.strip(), "text": body.strip()})
    return chunks


class Retriever:
    def __init__(self, path=config.HANDBOOK_FILE):
        self.chunks = load_chunks(path)
        docs = [f"{c['title']} {c['title']} {c['text']}" for c in self.chunks]  # title counted twice
        self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform(docs)

    def search(self, query: str, k=config.TOP_K_CHUNKS) -> list[dict]:
        scores = cosine_similarity(self.vectorizer.transform([query]), self.matrix)[0]
        ranked = scores.argsort()[::-1][:k]
        return [
            {**self.chunks[i], "score": round(float(scores[i]), 3)}
            for i in ranked
            if scores[i] >= config.MIN_CHUNK_SCORE
        ]
