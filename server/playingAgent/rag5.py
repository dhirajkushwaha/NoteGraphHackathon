import os
import sys
import requests
import chromadb
import numpy as np
from dotenv import load_dotenv
from pypdf import PdfReader
import easyocr
from pymongo import MongoClient
from neo4j import GraphDatabase
from sklearn.metrics.pairwise import cosine_similarity

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi

############################################
# ENV
############################################

load_dotenv()

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
NEO4J_URI = os.environ.get("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASS = os.environ.get("NEO4J_PASS", "riraru1234")

############################################
# CONFIG
############################################

TOP_K = 5
MEMORY_K = 5
CHUNK_SIZE = 400

############################################
# INIT
############################################

print("🚀 Booting Hybrid + Graph RAG")

embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

ocr_reader = easyocr.Reader(['en'], gpu=False)

client = chromadb.Client()
collection = client.get_or_create_collection("docs")

mongo = MongoClient(MONGO_URI)
mongo_chunks = mongo.gfgIIITK.chunks

neo4j = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))

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
    return " ".join([p.extract_text() or "" for p in reader.pages])

def read_image(path):
    return " ".join([r[1] for r in ocr_reader.readtext(path)])

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

        docs.extend(chunk_text(text))

    return docs

############################################
# MEMORY
############################################

def add_memory(u,a):
    memory.append((u,a))
    if len(memory)>MEMORY_K:
        memory.pop(0)

def get_memory():
    return "\n".join([f"User:{u}\nAssistant:{a}" for u,a in memory])

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
        json=payload
    )

    return r.json()["choices"][0]["message"]["content"]

############################################
# GRAPH INSERT
############################################

def neo4j_insert(text, emb):

    with neo4j.session() as s:
        s.run("""
        CREATE (c:Chunk {text:$t, embedding:$e})
        """, t=text, e=emb)

############################################
# GRAPH SEARCH
############################################

def graph_search(query_emb):

    with neo4j.session() as s:
        res=s.run("MATCH (c:Chunk) RETURN c.text, c.embedding")

        scored=[]
        for r in res:
            score=cosine_similarity([query_emb],[r["c.embedding"]])[0][0]
            scored.append((r["c.text"],score))

    scored.sort(key=lambda x:x[1],reverse=True)
    return [t for t,s in scored[:TOP_K]]

############################################
# INGEST
############################################

def ingest(docs):

    global bm25,bm25_docs

    print("🧠 Embedding chunks...")

    embeds=embedder.encode(docs).tolist()

    ids=[str(i) for i in range(len(docs))]

    collection.add(documents=docs,embeddings=embeds,ids=ids)

    mongo_chunks.delete_many({})

    for d,e in zip(docs,embeds):
        mongo_chunks.insert_one({"text":d,"embedding":e})
        neo4j_insert(d,e)

    bm25_docs=docs
    bm25=BM25Okapi([d.split() for d in docs])

    print(f"✅ Indexed {len(docs)} chunks")

############################################
# RETRIEVE
############################################

def retrieve(q):

    hits=[]

    # BM25
    if bm25:
        scores=bm25.get_scores(q.split())
        idx=np.argsort(scores)[::-1][:TOP_K]
        hits+= [bm25_docs[i] for i in idx]

    # Vector
    q_emb=embedder.encode([q])[0]
    res=collection.query(query_embeddings=[q_emb.tolist()],n_results=TOP_K)
    hits+=res["documents"][0]

    # Graph
    hits+=graph_search(q_emb)

    return list(set(hits))

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

    print("\n🔥 Hybrid GraphRAG Ready\n")

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

    docs=load_files(sys.argv[1])
    ingest(docs)
    chat()
