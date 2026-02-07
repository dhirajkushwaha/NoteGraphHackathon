import os
import sys
import time
import requests
import chromadb
import numpy as np
from dotenv import load_dotenv
from pypdf import PdfReader
from PIL import Image
import easyocr

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi

############################################
# ENV
############################################

load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL")

if not OPENROUTER_API_KEY:
    raise Exception("OPENROUTER_API_KEY missing")

############################################
# CONFIG
############################################

TOP_K = 5
MEMORY_K = 5
CHUNK_SIZE = 400

############################################
# INIT MODELS
############################################

print("🚀 Booting RAG...")

embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

print("📦 Loading EasyOCR (first run downloads models)...")
ocr_reader = easyocr.Reader(['en'], gpu=False)

client = chromadb.Client()
collection = client.get_or_create_collection("docs")

memory = []
bm25 = None
bm25_docs = []

############################################
# HELPERS
############################################

def chunk_text(text):
    words = text.split()
    return [" ".join(words[i:i+CHUNK_SIZE]) for i in range(0,len(words),CHUNK_SIZE)]

############################################
# FILE READERS
############################################

def read_pdf(path):
    reader = PdfReader(path)
    text=""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def read_image(path):
    result = ocr_reader.readtext(path)
    lines = [r[1] for r in result]
    return " ".join(lines)

def load_files(folder):

    docs=[]

    for file in os.listdir(folder):

        path=os.path.join(folder,file)

        print(f"📄 Reading {file}")

        if file.lower().endswith(".pdf"):
            text=read_pdf(path)

        elif file.lower().endswith((".png",".jpg",".jpeg")):
            text=read_image(path)

        else:
            continue

        chunks=chunk_text(text)
        docs.extend(chunks)

    return docs

############################################
# MEMORY
############################################

def add_memory(u,a):
    memory.append((u,a))
    if len(memory)>MEMORY_K:
        memory.pop(0)

def get_memory():
    return "\n".join([f"User: {u}\nAssistant: {a}" for u,a in memory])

############################################
# OPENROUTER
############################################

def llm_generate(prompt):

    headers={
        "Authorization":f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type":"application/json"
    }

    payload={
        "model":OPENROUTER_MODEL,
        "messages":[{"role":"user","content":prompt}],
        "temperature":0.3,
        "max_tokens":400
    }

    r=requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=180
    )

    return r.json()["choices"][0]["message"]["content"]

############################################
# INGEST
############################################

def ingest(docs):

    global bm25,bm25_docs

    print("🧠 Embedding chunks...")

    embeds=embedder.encode(docs).tolist()

    ids=[str(i) for i in range(len(docs))]

    collection.add(documents=docs,embeddings=embeds,ids=ids)

    bm25_docs=docs
    bm25=BM25Okapi([d.split() for d in docs])

    print(f"✅ Indexed {len(docs)} chunks")

############################################
# RETRIEVE
############################################

def retrieve(q):

    bm=[]
    if bm25:
        scores=bm25.get_scores(q.split())
        idx=np.argsort(scores)[::-1][:TOP_K]
        bm=[bm25_docs[i] for i in idx]

    emb=embedder.encode([q]).tolist()

    res=collection.query(query_embeddings=emb,n_results=TOP_K)

    vec=res["documents"][0]

    return list(set(bm+vec))

############################################
# RERANK
############################################

def rerank(q,docs):
    pairs=[[q,d] for d in docs]
    scores=reranker.predict(pairs)
    ranked=sorted(zip(docs,scores),key=lambda x:x[1],reverse=True)
    return [d for d,s in ranked[:TOP_K]]

############################################
# CHAT
############################################

def chat():

    print("\n🔥 READY — type exit\n")

    while True:

        q=input("You: ")

        if q=="exit":
            break

        docs=rerank(q,retrieve(q))

        prompt=f"""
Conversation:
{get_memory()}

Context:
{" ".join(docs)}

Question:
{q}

Answer clearly:
"""

        ans=llm_generate(prompt)

        print("\nAssistant:\n",ans,"\n")

        add_memory(q,ans)

############################################
# MAIN
############################################

if __name__=="__main__":

    if len(sys.argv)<2:
        print("Usage: python rag.py data")
        exit()

    folder=sys.argv[1]

    print("📥 Loading files...")

    docs=load_files(folder)

    ingest(docs)

    chat()
