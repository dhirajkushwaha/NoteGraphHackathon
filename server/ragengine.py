import os, json, requests, logging, hashlib
import numpy as np
from pypdf import PdfReader
import easyocr
from sentence_transformers import SentenceTransformer, CrossEncoder
from rank_bm25 import BM25Okapi
from neo4j import GraphDatabase
from neo4j_graphrag.retrievers import VectorRetriever
from neo4j_graphrag.embeddings import SentenceTransformerEmbeddings
from typing import List, Dict, Any, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

############################################
# CONFIG
############################################

TOP_K = 5
CHUNK_SIZE = 400

############################################
# RAG ENGINE CLASS
############################################


class RAGEngine:
    """Class-based RAG engine to avoid global state management issues."""

    def __init__(self, uri: str, user: str, password: str):
        """Initialize RAG Engine with Neo4j connection."""
        logger.info(f"Initializing RAG Engine with Neo4j at {uri}")

        # Initialize models
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        self.ocr_reader = easyocr.Reader(["en"], gpu=False)

        # Initialize Neo4j driver
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

        # Initialize retriever
        graph_embedder = SentenceTransformerEmbeddings("all-MiniLM-L6-v2")
        self.retriever = VectorRetriever(
            self.driver,
            index_name="chunk_embedding_index",
            embedder=graph_embedder,
            return_properties=["text", "space"],
        )

        # Space-aware BM25 storage (maps space_id -> BM25 instance)
        self.space_bm25: Dict[str, BM25Okapi] = {}
        self.space_documents: Dict[str, List[str]] = {}

        # Create indexes
        self._create_indexes()

        logger.info("✅ RAG Engine initialized successfully")

    def _create_indexes(self):
        """Create necessary Neo4j indexes."""
        try:
            with self.driver.session() as session:
                # Create vector index for chunks
                session.run(
                    """
                CREATE VECTOR INDEX chunk_embedding_index IF NOT EXISTS
                FOR (c:Chunk) ON (c.embedding)
                OPTIONS {indexConfig: {
                    `vector.dimensions`: 384,
                    `vector.similarity_function`: 'cosine'
                }}
                """
                )

                # Create indexes for space filtering
                session.run(
                    "CREATE INDEX space_index IF NOT EXISTS FOR (c:Chunk) ON (c.space)"
                )
                session.run(
                    "CREATE INDEX concept_space_index IF NOT EXISTS FOR (c:Concept) ON (c.space)"
                )
                logger.info("✅ Indexes created/verified")
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")

    ############################################
    # TEXT PROCESSING
    ############################################

    def chunk_text(self, text: str) -> List[str]:
        """Split text into chunks."""
        if not text:
            return []
        words = text.split()
        return [
            " ".join(words[i : i + CHUNK_SIZE])
            for i in range(0, len(words), CHUNK_SIZE)
        ]

    def read_pdf(self, path: str) -> str:
        """Extract text from PDF file."""
        try:
            reader = PdfReader(path)
            text = " ".join([page.extract_text() or "" for page in reader.pages])
            return text.strip()
        except Exception as e:
            logger.error(f"Error reading PDF {path}: {e}")
            return ""

    def read_image(self, path: str) -> str:
        """Extract text from image using OCR."""
        try:
            results = self.ocr_reader.readtext(path)
            text = " ".join([result[1] for result in results if result[1]])
            return text.strip()
        except Exception as e:
            logger.error(f"Error reading image {path}: {e}")
            return ""

    def read_txt(self, path: str) -> str:
        """Read text file."""
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Error reading text file {path}: {e}")
            return ""

    ############################################
    # LLM INTERFACE
    ############################################

    def extract_concepts(self, text: str, llm_func) -> Dict[str, Any]:
        """Extract concepts and relationships using LLM."""
        if not text or not text.strip():
            return {"concepts": [], "edges": []}

        prompt = f"""
    Extract key concepts and their prerequisite relationships from the following text.
    Return a JSON object with exactly this structure:
    {{
        "concepts": ["concept1", "concept2", ...],
        "edges": [["prerequisite", "requires", "dependent"], ...]
    }}

    Important: Return ONLY valid JSON, no additional text or markdown.

    Text: {text[:2000]}

    JSON:"""

        try:
            response = llm_func(prompt)

            # Clean response
            response = response.strip()
            
            # Remove markdown code blocks if present
            if response.startswith("```json"):
                response = response[7:]
            elif response.startswith("```"):
                response = response[3:]
            
            if response.endswith("```"):
                response = response[:-3]
            
            response = response.strip()
            
            # Try to find JSON object in response
            import re
            
            # Look for JSON object pattern
            json_pattern = r'\{[^{}]*\}'
            json_matches = re.findall(json_pattern, response, re.DOTALL)
            
            if json_matches:
                # Use the first JSON-like object found
                json_str = json_matches[0]
                result = json.loads(json_str)
            else:
                # If no JSON object found, try to parse the whole response
                try:
                    result = json.loads(response)
                except json.JSONDecodeError:
                    logger.warning(f"Could not parse JSON from response: {response[:200]}...")
                    return {"concepts": [], "edges": []}

            # Validate structure
            if not isinstance(result.get("concepts", []), list):
                result["concepts"] = []
            if not isinstance(result.get("edges", []), list):
                result["edges"] = []

            # Clean concepts
            clean_concepts = []
            for concept in result["concepts"]:
                if isinstance(concept, str) and concept.strip():
                    clean_concepts.append(concept.strip())
                elif isinstance(concept, (int, float)):
                    clean_concepts.append(str(concept))
            
            result["concepts"] = clean_concepts

            # Validate edges
            valid_edges = []
            for edge in result["edges"]:
                if isinstance(edge, (list, tuple)) and len(edge) >= 3:
                    try:
                        source = str(edge[0]).strip() if edge[0] is not None else ""
                        rel = str(edge[1]).strip() if edge[1] is not None else ""
                        target = str(edge[2]).strip() if edge[2] is not None else ""
                        if source and rel and target:
                            valid_edges.append([source, rel, target])
                    except Exception:
                        continue
            
            result["edges"] = valid_edges

            logger.debug(f"Extracted {len(result['concepts'])} concepts and {len(result['edges'])} edges")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in concept extraction: {e}")
            logger.debug(f"Response that failed: {response[:500] if 'response' in locals() else 'No response'}")
            return {"concepts": [], "edges": []}
        except Exception as e:
            logger.error(f"Error extracting concepts: {e}")
            return {"concepts": [], "edges": []}




    ############################################
    # GRAPH OPERATIONS
    ############################################

    def _generate_chunk_id(self, chunk: str, space: str) -> str:
        """Generate unique chunk ID using hash (more collision-resistant than simple hash)."""
        content = f"{space}_{chunk}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    

    def insert_graph(self, chunk: str, embedding: List[float], space: str, llm_func):
        """Insert chunk and extracted concepts into Neo4j graph."""
        if not chunk or not chunk.strip():
            return

        try:
            # Extract concepts
            concepts_data = self.extract_concepts(chunk, llm_func)

            chunk_id = self._generate_chunk_id(chunk, space)

            with self.driver.session() as session:
                # Create chunk node
                session.run("""
                    CREATE (c:Chunk {
                        text: $text,
                        embedding: $embedding,
                        space: $space,
                        chunk_id: $chunk_id
                    })
                """,
                text=chunk,
                embedding=embedding,  # Now this is a Python list, not tensor
                space=space,
                chunk_id=chunk_id)

                # Create concept nodes and relationships
                for concept_name in concepts_data["concepts"]:
                    if concept_name:
                        session.run("""
                            MERGE (concept:Concept {name: $name, space: $space})
                            ON CREATE SET concept.created_at = timestamp()
                        """, name=concept_name, space=space)

                        # Link concept to chunk
                        session.run("""
                            MATCH (concept:Concept {name: $concept_name, space: $space})
                            MATCH (chunk:Chunk {chunk_id: $chunk_id})
                            MERGE (concept)-[:EXPLAINED_BY]->(chunk)
                        """, concept_name=concept_name, space=space, chunk_id=chunk_id)

                # Create prerequisite relationships
                for edge in concepts_data["edges"]:
                    if len(edge) >= 3:
                        source, rel, target = edge[0], edge[1], edge[2]

                        session.run("""
                            MATCH (a:Concept {name: $source, space: $space})
                            MATCH (b:Concept {name: $target, space: $space})
                            MERGE (a)-[r:RELATED_TO {type: $rel}]->(b)
                            SET r.strength = coalesce(r.strength, 0) + 1
                        """, source=source, target=target, rel=rel, space=space)
                        
        except Exception as e:
            logger.error(f"Error inserting graph data: {e}")
            # Log the embedding type for debugging
            logger.debug(f"Embedding type: {type(embedding)}, first few values: {embedding[:3] if embedding else 'None'}")

    ############################################
    # INGESTION
    ############################################

    def ingest(self, files: List[str], space: str, llm_func):
        """Ingest files into the knowledge graph for a specific space."""
        if not files:
            logger.warning("No files provided for ingestion")
            return

        logger.info(f"Ingesting {len(files)} files into space: {space}")

        # Clear existing data for this space
        try:
            with self.driver.session() as session:
                session.run(
                    "MATCH (c:Chunk {space: $space}) DETACH DELETE c", space=space
                )
                session.run(
                    "MATCH (c:Concept {space: $space}) DETACH DELETE c", space=space
                )
        except Exception as e:
            logger.warning(f"Error clearing old chunks: {e}")

        all_chunks = []

        for file_path in files:
            if not os.path.exists(file_path):
                logger.warning(f"File not found: {file_path}")
                continue

            try:
                # Extract text based on file type
                if file_path.lower().endswith(".pdf"):
                    text = self.read_pdf(file_path)
                elif file_path.lower().endswith(
                    (".png", ".jpg", ".jpeg", ".gif", ".bmp")
                ):
                    text = self.read_image(file_path)
                elif file_path.lower().endswith(".txt"):
                    text = self.read_txt(file_path)
                else:
                    logger.warning(f"Unsupported file type: {file_path}")
                    continue

                if not text.strip():
                    logger.warning(f"No text extracted from: {file_path}")
                    continue

                # Chunk the text
                chunks = self.chunk_text(text)
                if chunks:
                    all_chunks.extend(chunks)
                    logger.info(
                        f"Extracted {len(chunks)} chunks from {os.path.basename(file_path)}"
                    )

            except Exception as e:
                logger.error(f"Error processing {file_path}: {e}")
                continue

        if not all_chunks:
            logger.error(f"No chunks extracted from files for space {space}")
            # Clear space-specific indexes
            if space in self.space_bm25:
                del self.space_bm25[space]
            if space in self.space_documents:
                del self.space_documents[space]
            return

        try:
            # Generate embeddings
            logger.info(f"Generating embeddings for {len(all_chunks)} chunks")

            # Generate embeddings with numpy arrays
            embeddings = self.embedder.encode(
                all_chunks, convert_to_tensor=False
            )  # Already returns numpy

            # Convert embeddings to Python lists for Neo4j
            embeddings_list = []
            for emb in embeddings:
                if hasattr(emb, "tolist"):
                    embeddings_list.append(emb.tolist())
                elif hasattr(emb, "numpy"):
                    embeddings_list.append(emb.numpy().tolist())
                else:
                    embeddings_list.append(list(emb))

            # Insert into graph
            logger.info("Inserting chunks into graph...")
            for chunk, embedding in zip(all_chunks, embeddings_list):
                self.insert_graph(chunk, embedding, space, llm_func)

            # Update space-specific BM25
            self.space_documents[space] = all_chunks
            self.space_bm25[space] = BM25Okapi([doc.split() for doc in all_chunks])

            logger.info(
                f"✅ Successfully ingested {len(all_chunks)} chunks into space {space}"
            )
        except Exception as e:
            logger.error(f"Error during ingestion: {e}")
            raise

    ############################################
    # RETRIEVAL
    ############################################

    def retrieve(self, query: str, space: str) -> List[str]:
        """Retrieve relevant chunks using hybrid search with space filtering."""
        if not query or not space:
            return []

        hits = []

        # BM25 retrieval (space-aware)
        if space in self.space_bm25 and self.space_documents.get(space):
            try:
                bm25 = self.space_bm25[space]
                docs = self.space_documents[space]
                scores = np.array(bm25.get_scores(query.split()))
                idx = np.argsort(scores)[::-1][:TOP_K]
                hits.extend([docs[i] for i in idx if i < len(docs)])
            except Exception as e:
                logger.warning(f"BM25 retrieval error: {e}")

        # Vector retrieval with space filtering
        try:
            query_vector = self.embedder.encode(query, convert_to_tensor=False)
            if hasattr(query_vector, 'tolist'):
                query_vector = query_vector.tolist()
            elif hasattr(query_vector, 'numpy'):
                query_vector = query_vector.numpy().tolist()

            with self.driver.session() as session:
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
                    text = record["text"]
                    if text:
                        hits.append(text)
        except Exception as e:
            logger.warning(f"Vector retrieval error: {e}")

        # Remove duplicates while preserving order
        seen = set()
        unique_hits = []
        for hit in hits:
            if hit and hit not in seen:
                seen.add(hit)
                unique_hits.append(hit)

        return unique_hits[:TOP_K * 2]

    ############################################
    # RERANKING AND ANSWERING
    ############################################

    def rerank_documents(self, query: str, documents: List[str]) -> List[str]:
        """Rerank documents using cross-encoder."""
        if not documents:
            return []

        try:
            pairs = [[query, doc] for doc in documents]
            scores = self.reranker.predict(pairs)

            ranked = sorted(zip(documents, scores), key=lambda x: x[1], reverse=True)
            return [doc for doc, _ in ranked[:TOP_K]]
        except Exception as e:
            logger.error(f"Reranking error: {e}")
            return documents[:TOP_K]

    def ask(self, query: str, space: str, llm_func) -> str:
        """Answer question using retrieval from the specified space."""
        if not query or not query.strip():
            return "Please provide a question."

        if not space:
            return "Invalid space."

        logger.info(f"Processing query: '{query}' for space: {space}")

        # Retrieve relevant documents
        retrieved_docs = self.retrieve(query, space)

        if not retrieved_docs:
            logger.warning(f"No relevant documents found for space {space}")
            return "I couldn't find relevant information in the uploaded documents. Please try asking about something else or upload more documents."

        # Rerank documents
        relevant_docs = self.rerank_documents(query, retrieved_docs)

        if not relevant_docs:
            return "I couldn't find relevant information to answer your question."

        # Prepare context
        context = "\n\n".join(
            [f"Document {i+1}: {doc}" for i, doc in enumerate(relevant_docs[:3])]
        )

        # Generate answer using LLM
        prompt = f"""Based on the following context from study materials, answer the question clearly and concisely.
If the answer cannot be found in the context, say so honestly.

Context:
{context}

Question: {query}

Provide a clear, detailed answer based only on the context above:"""

        try:
            answer = llm_func(prompt)
            logger.info("✅ Successfully generated answer")
            return answer.strip()
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return "I encountered an error while processing your question. Please try again."

    ############################################
    # UTILITY FUNCTIONS
    ############################################

    def clear_space(self, space: str):
        """Clear all data for a specific space."""
        try:
            with self.driver.session() as session:
                session.run(
                    "MATCH (c:Chunk {space: $space}) DETACH DELETE c", space=space
                )
                session.run(
                    "MATCH (c:Concept {space: $space}) DETACH DELETE c", space=space
                )

            # Clear space-specific indexes
            if space in self.space_bm25:
                del self.space_bm25[space]
            if space in self.space_documents:
                del self.space_documents[space]

            logger.info(f"✅ Cleared all data for space: {space}")
        except Exception as e:
            logger.error(f"Error clearing space {space}: {e}")

    def get_space_stats(self, space: str) -> Dict[str, Any]:
        """Get statistics for a space."""
        try:
            with self.driver.session() as session:
                chunk_count = session.run(
                    "MATCH (c:Chunk {space: $space}) RETURN count(c) as count",
                    space=space,
                ).single()["count"]

                concept_count = session.run(
                    "MATCH (c:Concept {space: $space}) RETURN count(c) as count",
                    space=space,
                ).single()["count"]

                rel_count = session.run(
                    "MATCH (a:Concept {space: $space})-[r]->(b:Concept {space: $space}) RETURN count(r) as count",
                    space=space,
                ).single()["count"]

            return {
                "chunks": chunk_count,
                "concepts": concept_count,
                "relationships": rel_count,
                "space": space,
            }
        except Exception as e:
            logger.error(f"Error getting space stats: {e}")
            return {"error": str(e)}

    def close(self):
        """Close Neo4j driver connection."""
        try:
            if self.driver:
                self.driver.close()
            logger.info("✅ RAG Engine closed")
        except Exception as e:
            logger.error(f"Error closing RAG Engine: {e}")
