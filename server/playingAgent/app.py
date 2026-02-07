import os
import time
import requests
import chromadb
import numpy as np
from dotenv import load_dotenv

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi

############################################
# LOAD ENV
############################################

print("🔧 Loading .env...")
load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL")

if not OPENROUTER_API_KEY:
    raise Exception("❌ OPENROUTER_API_KEY missing in .env")

print("✅ Env loaded")

############################################
# CONFIG
############################################

TOP_K = 5
MEMORY_K = 5

############################################
# INIT MODELS
############################################

print("\n🚀 Booting RAG system...\n")

print("📦 Loading embedding model...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("✅ Embedder ready")

print("📦 Loading reranker model...")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
print("✅ Reranker ready")

############################################
# VECTOR DB
############################################

print("📦 Initializing ChromaDB...")
client = chromadb.Client()
collection = client.get_or_create_collection("docs")
print("✅ Chroma ready")

############################################
# GLOBAL STATE
############################################

memory = []
bm25 = None
bm25_docs = []

############################################
# MEMORY
############################################

def add_memory(u, a):
    memory.append((u, a))
    if len(memory) > MEMORY_K:
        memory.pop(0)

def get_memory():
    return "\n".join([f"User: {u}\nAssistant: {a}" for u,a in memory])

############################################
# OPENROUTER GENERATION
############################################

def llm_generate(prompt):

    print("🤖 Sending prompt to OpenRouter...")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 400
    }

    start = time.time()

    try:
        r = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=180
        )
    except Exception as e:
        print("❌ OpenRouter connection error:", e)
        return "LLM connection failed."

    if r.status_code != 200:
        print("❌ OpenRouter STATUS:", r.status_code)
        print(r.text)
        return "OpenRouter request failed."

    elapsed = round(time.time() - start, 2)
    print(f"⏱ OpenRouter responded in {elapsed}s")

    data = r.json()

    return data["choices"][0]["message"]["content"]

############################################
# INGEST
############################################

def ingest(docs):

    global bm25, bm25_docs

    print("\n📥 Ingesting documents...")
    print("🧠 Embedding docs...")

    embeddings = embedder.encode(docs).tolist()
    ids = [str(i) for i in range(len(docs))]

    collection.add(
        documents=docs,
        embeddings=embeddings,
        ids=ids
    )

    print("📊 Building BM25 index...")

    bm25_docs = docs
    tokenized = [d.split() for d in docs]
    bm25 = BM25Okapi(tokenized)

    print(f"✅ Ingested {len(docs)} documents\n")

############################################
# RETRIEVE
############################################

def retrieve(query):

    print("🔎 Retrieving documents...")

    bm25_hits = []
    if bm25:
        scores = bm25.get_scores(query.split())
        idx = np.argsort(scores)[::-1][:TOP_K]
        bm25_hits = [bm25_docs[i] for i in idx]

    q_emb = embedder.encode([query]).tolist()

    res = collection.query(
        query_embeddings=q_emb,
        n_results=TOP_K
    )

    vec_hits = res["documents"][0]

    combined = list(set(bm25_hits + vec_hits))

    print(f"📄 Retrieved {len(combined)} candidates")

    return combined

############################################
# RERANK
############################################

def rerank(query, docs):

    print("🎯 Reranking...")

    pairs = [[query, d] for d in docs]
    scores = reranker.predict(pairs)

    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)

    return [d for d,s in ranked[:TOP_K]]

############################################
# CHAT LOOP
############################################

def chat():

    print("\n🔥 RAG READY — type 'exit' to quit\n")

    while True:

        q = input("🧑 You: ")

        if q.lower() == "exit":
            print("\n👋 Bye")
            break

        docs = retrieve(q)
        docs = rerank(q, docs)

        context = "\n".join(docs)
        history = get_memory()

        prompt = f"""
Conversation:
{history}

Context:
{context}

User question:
{q}

Answer clearly:
"""

        print("\n🧠 Thinking...\n")

        ans = llm_generate(prompt)

        print("\n🤖 Assistant:\n", ans, "\n")

        add_memory(q, ans)

############################################
# MAIN
############################################

if __name__ == "__main__":

    sample_docs = [
        "Retrieval Augmented Generation combines retrieval with language model generation.",
        "BM25 is a keyword ranking algorithm based on TF-IDF.",
        "Vector databases store embeddings for semantic similarity search.",
        "Cross encoders rerank retrieved documents using deep neural relevance scoring.",
        "Memory buffers maintain conversation context across turns.",
        "Hybrid retrieval combines BM25 and vector similarity.",
        "Reranking improves precision by evaluating query-document pairs."
    ]

    ingest(sample_docs)

    chat()
