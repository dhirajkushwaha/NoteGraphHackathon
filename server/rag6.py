import os, sys, json, requests
import numpy as np
from dotenv import load_dotenv
from pypdf import PdfReader
import easyocr
from pymongo import MongoClient
from neo4j import GraphDatabase

from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings import SentenceTransformerEmbeddings

from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi

############################################
# ENV
###########################################



# asdasdasdas

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")

NEO4J_URI = os.getenv("NEO4J_URI","bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER","neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS","riraru1234")

MONGO_URI = os.getenv("MONGO_URI","mongodb://localhost:27017")

############################################
# CONFIG
############################################

TOP_K = 5
CHUNK_SIZE = 400

############################################
# INIT
############################################

print("🚀 Booting TRUE GraphRAG")

embedder = SentenceTransformer("all-MiniLM-L6-v2")
reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
ocr_reader = easyocr.Reader(['en'], gpu=False)

neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER,NEO4J_PASS))
mongo = MongoClient(MONGO_URI)
mongo_chunks = mongo.rag.chunks

bm25 = None
bm25_docs = []

graph_embedder = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")

retriever = VectorRetriever(
    neo4j_driver,
    index_name="chunk_embedding_index",
    embedder=graph_embedder,
    return_properties=["text"]
)

############################################
# HELPERS
############################################

def chunk_text(text):
    words=text.split()
    return [" ".join(words[i:i+CHUNK_SIZE]) for i in range(0,len(words),CHUNK_SIZE)]

############################################
# FILE READERS
############################################

def read_pdf(path):
    r=PdfReader(path)
    return " ".join([p.extract_text() or "" for p in r.pages])

def read_image(path):
    return " ".join([r[1] for r in ocr_reader.readtext(path)])

def load_files(folder):

    docs=[]
    for f in os.listdir(folder):
        p=os.path.join(folder,f)
        print("📄",f)

        if f.endswith(".pdf"):
            t=read_pdf(p)
        elif f.lower().endswith((".png",".jpg",".jpeg")):
            t=read_image(p)
        else:
            continue

        docs+=chunk_text(t)

    return docs

############################################
# LLM UTIL
############################################

def llm(prompt):

    r=requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization":f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type":"application/json"
        },
        json={
            "model":OPENROUTER_MODEL,
            "messages":[{"role":"user","content":prompt}],
            "temperature":0.2
        }
    )

    return r.json()["choices"][0]["message"]["content"]

############################################
# CONCEPT EXTRACTION
############################################

def extract_concepts(text):

    prompt=f"""
Extract key concepts and prerequisite relations.

Return JSON:

{{
 "concepts":["A","B"],
 "edges":[["A","requires","B"]]
}}

Text:
{text[:2000]}
"""

    out=llm(prompt)

    try:
        return json.loads(out)
    except:
        return {"concepts":[],"edges":[]}

############################################
# GRAPH INSERT
############################################

def insert_graph(chunk, emb):

    concepts=extract_concepts(chunk)

    with neo4j_driver.session() as s:

        s.run("""
        CREATE (c:Chunk {text:$t, embedding:$e})
        """,t=chunk,e=emb)

        for c in concepts["concepts"]:
            s.run("MERGE (:Concept {name:$n})",n=c)

        for a,_,b in concepts["edges"]:
            s.run("""
            MATCH (a:Concept{name:$a}),(b:Concept{name:$b})
            MERGE (a)-[:REQUIRES]->(b)
            """,a=a,b=b)

        for c in concepts["concepts"]:
            s.run("""
            MATCH (co:Concept{name:$c})
            MATCH (ch:Chunk{text:$t})
            MERGE (co)-[:EXPLAINED_BY]->(ch)
            """,c=c,t=chunk)

############################################
# INGEST
############################################

def ingest(docs):

    global bm25,bm25_docs

    print("🧠 Embedding...")

    embs=embedder.encode(docs).tolist()

    mongo_chunks.delete_many({})

    for d,e in zip(docs,embs):
        mongo_chunks.insert_one({"text":d, "embedding": e})
        insert_graph(d,e)

    bm25_docs=docs
    bm25=BM25Okapi([d.split() for d in docs])

    print("✅ Graph + Mongo + BM25 ready")

############################################
# RETRIEVE
############################################

def retrieve(q):

    hits=[]

    # BM25
    scores=bm25.get_scores(q.split())
    idx=np.argsort(scores)[::-1][:TOP_K]
    hits+=[bm25_docs[i] for i in idx]

    # Neo4j Vector + Graph
    q_vec = embedder.encode(q).tolist()

    graph_res = retriever.search(
        query_vector=q_vec,
        top_k=TOP_K
    )

    for r in graph_res.items:
        hits.append(r.content)

    return list(set(hits))

############################################
# RERANK
############################################

def rerank(q,docs):

    pairs=[[q,d] for d in docs]
    scores=reranker.predict(pairs)

    ranked=sorted(zip(docs,scores),key=lambda x:x[1],reverse=True)
    return [d for d,_ in ranked[:TOP_K]]

############################################
# CHAT
############################################

def chat():

    print("\n🔥 TRUE GraphRAG READY\n")

    while True:

        q=input("You: ")
        if q=="exit": break

        docs=rerank(q,retrieve(q))

        prompt=f"""
Context:
{" ".join(docs)}

Question:
{q}

Answer clearly:
"""

        print("\nAssistant:\n",llm(prompt),"\n")

############################################
# MAIN
############################################

if __name__=="__main__":

    if len(sys.argv)<2:
        print("python rag.py data")
        exit()

    docs=load_files(sys.argv[1])
    ingest(docs)
    chat()
