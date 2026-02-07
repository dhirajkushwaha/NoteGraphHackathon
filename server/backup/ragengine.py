import os, json, requests
import numpy as np
from pypdf import PdfReader
import easyocr
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
from neo4j import GraphDatabase
from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings import SentenceTransformerEmbeddings
from typing import List, Dict, Any
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

############################################
# CONFIG
############################################

TOP_K = 5
CHUNK_SIZE = 400

# Global variables
embedder = None
reranker = None
ocr_reader = None
driver = None
retriever = None
bm25 = None
bm25_docs = []

############################################
# INITIALIZATION
############################################

def init_graph(uri: str, user: str, password: str):
    """
    Initialize Neo4j connection and retriever.
    """
    global driver, retriever, embedder, reranker, ocr_reader
    
    logger.info(f"Initializing Neo4j connection to {uri}")
    
    # Initialize embedder and reranker if not already done
    if embedder is None:
        embedder = SentenceTransformer("all-MiniLM-L6-v2")
    
    if reranker is None:
        reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    if ocr_reader is None:
        ocr_reader = easyocr.Reader(['en'], gpu=False)
    
    # Initialize Neo4j driver
    driver = GraphDatabase.driver(uri, auth=(user, password))
    
    # Initialize retriever
    graph_embedder = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")
    retriever = VectorRetriever(
        driver,
        index_name="chunk_embedding_index",
        embedder=graph_embedder,
        return_properties=["text"]
    )
    
    # Create indexes if they don't exist
    with driver.session() as session:
        # Create vector index for chunks
        session.run("""
        CREATE VECTOR INDEX chunk_embedding_index IF NOT EXISTS
        FOR (c:Chunk) ON (c.embedding)
        OPTIONS {indexConfig: {
            `vector.dimensions`: 384,
            `vector.similarity_function`: 'cosine'
        }}
        """)
        
        # Create index for space
        session.run("CREATE INDEX space_index IF NOT EXISTS FOR (c:Chunk) ON (c.space)")
        session.run("CREATE INDEX concept_space_index IF NOT EXISTS FOR (c:Concept) ON (c.space)")
    
    logger.info("Graph initialization complete")

############################################
# TEXT PROCESSING
############################################

def chunk_text(text: str) -> List[str]:
    """Split text into chunks."""
    words = text.split()
    return [" ".join(words[i:i + CHUNK_SIZE]) for i in range(0, len(words), CHUNK_SIZE)]

def read_pdf(path: str) -> str:
    """Extract text from PDF file."""
    try:
        reader = PdfReader(path)
        text = " ".join([page.extract_text() or "" for page in reader.pages])
        return text.strip()
    except Exception as e:
        logger.error(f"Error reading PDF {path}: {e}")
        return ""

def read_image(path: str) -> str:
    """Extract text from image using OCR."""
    try:
        results = ocr_reader.readtext(path)
        text = " ".join([result[1] for result in results])
        return text.strip()
    except Exception as e:
        logger.error(f"Error reading image {path}: {e}")
        return ""

def read_txt(path: str) -> str:
    """Read text file."""
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Error reading text file {path}: {e}")
        return ""

############################################
# LLM INTERFACE
############################################

def extract_concepts(text: str, llm_func) -> Dict[str, Any]:
    """
    Extract concepts and relationships using LLM.
    """
    prompt = f"""
    Extract key concepts and their prerequisite relationships from the following text.
    Return a JSON object with exactly this structure:
    {{
        "concepts": ["concept1", "concept2", ...],
        "edges": [["prerequisite", "requires", "dependent"], ...]
    }}
    
    Text: {text[:2000]}
    
    Return only valid JSON, no additional text.
    """
    
    try:
        response = llm_func(prompt)
        
        # Clean response
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.endswith("```"):
            response = response[:-3]
        response = response.strip()
        
        result = json.loads(response)
        
        # Validate structure
        if not isinstance(result.get("concepts", []), list):
            result["concepts"] = []
        if not isinstance(result.get("edges", []), list):
            result["edges"] = []
            
        # Ensure edges have correct format
        valid_edges = []
        for edge in result["edges"]:
            if isinstance(edge, list) and len(edge) >= 3:
                valid_edges.append([str(edge[0]), str(edge[1]), str(edge[2])])
        result["edges"] = valid_edges
        
        return result
    except Exception as e:
        logger.error(f"Error extracting concepts: {e}")
        return {"concepts": [], "edges": []}

############################################
# GRAPH OPERATIONS
############################################

def insert_graph(chunk: str, embedding: List[float], space: str, llm_func):
    """
    Insert chunk and extracted concepts into Neo4j graph.
    """
    if not chunk.strip():
        return
    
    # Extract concepts using LLM
    concepts_data = extract_concepts(chunk, llm_func)
    
    with driver.session() as session:
        # Create chunk node
        session.run("""
            CREATE (c:Chunk {
                text: $text,
                embedding: $embedding,
                space: $space,
                chunk_id: $chunk_id
            })
            RETURN c
        """, 
        text=chunk, 
        embedding=embedding, 
        space=space,
        chunk_id=f"{space}_{hash(chunk)}")
        
        # Create concept nodes
        for concept_name in concepts_data["concepts"]:
            if concept_name:  # Skip empty concepts
                session.run("""
                    MERGE (concept:Concept {name: $name, space: $space})
                    ON CREATE SET concept.created_at = timestamp()
                """, name=concept_name.strip(), space=space)
        
        # Create prerequisite relationships
        for edge in concepts_data["edges"]:
            if len(edge) >= 3:
                source = str(edge[0]).strip()
                relationship = str(edge[1]).strip()
                target = str(edge[2]).strip()
                
                if source and target:
                    session.run("""
                        MATCH (a:Concept {name: $source, space: $space})
                        MATCH (b:Concept {name: $target, space: $space})
                        MERGE (a)-[r:RELATED_TO {type: $rel}]->(b)
                        SET r.strength = coalesce(r.strength, 0) + 1
                    """, source=source, target=target, rel=relationship, space=space)
        
        # Link concepts to chunks
        for concept_name in concepts_data["concepts"]:
            if concept_name:
                session.run("""
                    MATCH (concept:Concept {name: $concept_name, space: $space})
                    MATCH (chunk:Chunk {chunk_id: $chunk_id})
                    MERGE (concept)-[:EXPLAINED_BY]->(chunk)
                """, concept_name=concept_name.strip(), space=space, chunk_id=f"{space}_{hash(chunk)}")

############################################
# INGESTION
############################################

def ingest(files: List[str], space: str, llm_func):
    """
    Ingest files into the knowledge graph for a specific space.
    """
    global bm25, bm25_docs
    
    if not files:
        logger.warning("No files provided for ingestion")
        return
    
    logger.info(f"Ingesting {len(files)} files into space: {space}")
    
    # Clear existing data for this space
    with driver.session() as session:
        session.run("MATCH (c:Chunk {space: $space}) DETACH DELETE c", space=space)
    
    all_chunks = []
    
    for file_path in files:
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            continue
        
        try:
            # Determine file type and extract text
            if file_path.lower().endswith('.pdf'):
                text = read_pdf(file_path)
            elif file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                text = read_image(file_path)
            elif file_path.lower().endswith('.txt'):
                text = read_txt(file_path)
            else:
                logger.warning(f"Unsupported file type: {file_path}")
                continue
            
            if not text.strip():
                logger.warning(f"No text extracted from: {file_path}")
                continue
            
            # Chunk the text
            chunks = chunk_text(text)
            all_chunks.extend(chunks)
            
            logger.info(f"Extracted {len(chunks)} chunks from {os.path.basename(file_path)}")
            
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            continue
    
    if not all_chunks:
        logger.error("No chunks extracted from files")
        return
    
    # Generate embeddings
    logger.info(f"Generating embeddings for {len(all_chunks)} chunks")
    embeddings = embedder.encode(all_chunks).tolist()
    
    # Insert into graph
    logger.info("Inserting chunks into graph...")
    for chunk, embedding in zip(all_chunks, embeddings):
        insert_graph(chunk, embedding, space, llm_func)
    
    # Update BM25 for retrieval
    bm25_docs = all_chunks
    bm25 = BM25Okapi([doc.split() for doc in all_chunks])
    
    logger.info(f"Successfully ingested {len(all_chunks)} chunks into space: {space}")

############################################
# RETRIEVAL
############################################

def retrieve(query: str, space: str = None) -> List[str]:
    """
    Retrieve relevant chunks using hybrid search (BM25 + vector).
    """
    hits = []
    
    # BM25 retrieval
    if bm25 and bm25_docs:
        try:
            scores = bm25.get_scores(query.split())
            idx = np.argsort(scores)[::-1][:TOP_K]
            hits.extend([bm25_docs[i] for i in idx])
        except Exception as e:
            logger.error(f"BM25 retrieval error: {e}")
    
    # Vector retrieval with space filtering
    if retriever and space:
        try:
            query_vector = embedder.encode(query).tolist()
            
            # Use retriever with custom query for space filtering
            with driver.session() as session:
                result = session.run("""
                    CALL db.index.vector.queryNodes('chunk_embedding_index', $top_k, $query_vector)
                    YIELD node, score
                    WHERE node.space = $space
                    RETURN node.text AS text, score
                    ORDER BY score DESC
                    LIMIT $top_k
                """, 
                top_k=TOP_K, 
                query_vector=query_vector, 
                space=space)
                
                for record in result:
                    hits.append(record["text"])
        except Exception as e:
            logger.error(f"Vector retrieval error: {e}")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_hits = []
    for hit in hits:
        if hit and hit not in seen:
            seen.add(hit)
            unique_hits.append(hit)
    
    return unique_hits[:TOP_K * 2]  # Return more for reranking

############################################
# RERANKING AND ANSWERING
############################################

def rerank_documents(query: str, documents: List[str]) -> List[str]:
    """
    Rerank documents using cross-encoder.
    """
    if not documents:
        return []
    
    pairs = [[query, doc] for doc in documents]
    scores = reranker.predict(pairs)
    
    ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in ranked[:TOP_K]]

def ask(query: str, space: str, llm_func) -> str:
    """
    Answer question using retrieval from the specified space.
    """
    if not query.strip():
        return "Please provide a question."
    
    logger.info(f"Processing query: '{query}' for space: {space}")
    
    # Retrieve relevant documents
    retrieved_docs = retrieve(query, space)
    
    if not retrieved_docs:
        logger.warning("No relevant documents found")
        return "I couldn't find relevant information in the uploaded documents. Please try asking about something else or upload more documents."
    
    # Rerank documents
    relevant_docs = rerank_documents(query, retrieved_docs)
    
    if not relevant_docs:
        return "I couldn't find relevant information to answer your question."
    
    # Prepare context
    context = "\n\n".join([f"Document {i+1}: {doc}" for i, doc in enumerate(relevant_docs[:3])])
    
    # Generate answer using LLM
    prompt = f"""Based on the following context from study materials, answer the question clearly and concisely.
If the answer cannot be found in the context, say so honestly.

Context:
{context}

Question: {query}

Provide a clear, detailed answer based only on the context above:"""
    
    try:
        answer = llm_func(prompt)
        logger.info("Successfully generated answer")
        return answer.strip()
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        return "I encountered an error while processing your question. Please try again."

############################################
# UTILITY FUNCTIONS
############################################

def clear_space(space: str):
    """
    Clear all data for a specific space.
    """
    with driver.session() as session:
        session.run("MATCH (c:Chunk {space: $space}) DETACH DELETE c", space=space)
        session.run("MATCH (c:Concept {space: $space}) DETACH DELETE c", space=space)
    logger.info(f"Cleared all data for space: {space}")

def get_space_stats(space: str) -> Dict[str, Any]:
    """
    Get statistics for a space.
    """
    with driver.session() as session:
        # Count chunks
        chunk_count = session.run(
            "MATCH (c:Chunk {space: $space}) RETURN count(c) as count",
            space=space
        ).single()["count"]
        
        # Count concepts
        concept_count = session.run(
            "MATCH (c:Concept {space: $space}) RETURN count(c) as count",
            space=space
        ).single()["count"]
        
        # Count relationships
        rel_count = session.run(
            "MATCH (a:Concept {space: $space})-[r]->(b:Concept {space: $space}) RETURN count(r) as count",
            space=space
        ).single()["count"]
    
    return {
        "chunks": chunk_count,
        "concepts": concept_count,
        "relationships": rel_count,
        "space": space
    }