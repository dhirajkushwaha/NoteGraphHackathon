from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Form, Body, Query
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from jose import jwt, JWTError
from pymongo import MongoClient
from dotenv import load_dotenv
import os, uuid, requests, logging, bcrypt
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId 
from ragengine import RAGEngine
from models import User, StudySpace, File as FileModel, Chat

from rank_bm25 import BM25Okapi



############################################
# ENV
############################################

load_dotenv()

# JWT Configuration
SECRET = os.getenv("JWT_SECRET", "supersecretkeychangemeinproduction")
ALGO = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Database Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS", "password")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# LLM Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

# Storage Configuration
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "storage/files")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

############################################
# INIT
############################################

app = FastAPI(
    title="GraphRAG Study Platform API",
    description="A knowledge graph enhanced RAG system for study materials",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# MongoDB Connection
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    mongo_client.server_info()  # Test connection
    db = mongo_client.app
    logging.info("✅ MongoDB connected successfully")
except Exception as e:
    logging.error(f"❌ MongoDB connection failed: {e}")
    raise


# Initialize RAG Engine
rag_engine = None
try:
    rag_engine = RAGEngine(NEO4J_URI, NEO4J_USER, NEO4J_PASS)
    logger.info("✅ RAG Engine initialized successfully")
except Exception as e:
    logger.error(f"❌ RAG Engine initialization failed: {e}")
    rag_engine = None

############################################
# LLM Wrapper
############################################

def llm(prompt: str) -> str:
    """Call LLM via OpenRouter API."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "GraphRAG Study Platform"
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a helpful study assistant."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 1000
            },
            timeout=30
        )

        response.raise_for_status()
        data = response.json()

        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"]
        else:
            raise HTTPException(status_code=500, detail="Invalid response from LLM")

    except requests.exceptions.RequestException as e:
        logger.error(f"LLM API error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM service error: {str(e)}")

############################################
# AUTH Utilities
############################################

def create_access_token(data: dict):
    """Create JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGO)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt."""
    try:
        # Try direct verification first
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            # Hash with SHA-256 first for consistency
            import hashlib
            password_bytes = hashlib.sha256(password_bytes).digest()
            if len(password_bytes) > 72:
                password_bytes = password_bytes[:72]
        
        return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
    except Exception as e:
        logging.error(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    try:
        # Truncate password if it's too long for bcrypt (72 bytes max)
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            # Hash with SHA-256 first to handle long passwords
            import hashlib
            password_bytes = hashlib.sha256(password_bytes).digest()
            if len(password_bytes) > 72:
                password_bytes = password_bytes[:72]
        
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    except Exception as e:
        logging.error(f"Password hashing error: {e}")
        raise HTTPException(status_code=500, detail="Password hashing failed")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Get current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    
    return user

############################################
# HEALTH & INFO
############################################

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint."""
    return {
        "status": "GraphRAG backend running",
        "version": "1.0.0",
        "endpoints": {
            "auth": ["/register", "/login"],
            "spaces": ["/spaces", "/spaces/{id}"],
            "files": ["/spaces/{id}/files", "/spaces/{id}/upload"],
            "chat": ["/spaces/{id}/chat", "/spaces/{id}/chats"],
            "stats": ["/spaces/{id}/stats"]
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    try:
        # Check MongoDB
        mongo_client.server_info()

        # Check RAG Engine
        if rag_engine is None:
            return {"status": "unhealthy", "error": "RAG Engine not initialized"}, 500

        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "error": str(e)}, 500

############################################
# AUTH Endpoints
############################################

@app.post("/register", tags=["Auth"])
async def register(
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...)
):
    """Register a new user."""
    
    print("=" * 50)
    print("DEBUG: REGISTER REQUEST RECEIVED")
    print(f"DEBUG: email = {repr(email)}")
    print(f"DEBUG: username = {repr(username)}")
    print(f"DEBUG: password = {repr(password)}")
    print(f"DEBUG: password length = {len(password)}")
    print("=" * 50)
    
    # Log the attempt
    logging.info(f"Register attempt: email={email}, username={username}, password_len={len(password)}")
    
    # Validate inputs
    if not email or not username or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Check password length
    password_bytes = len(password.encode('utf-8'))
    if password_bytes > 1000:  # Reasonable upper limit
        raise HTTPException(status_code=400, detail="Password is too long")
    
    # Check if user exists
    if db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already taken")

    try:
        # Create user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(password)
        
        user_data = {
            "_id": user_id,
            "email": email,
            "username": username,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow()
        }
        
        db.users.insert_one(user_data)
        logging.info(f"User created: {user_id}")

        # Create token
        token = create_access_token({"id": user_id})

        return {
            "message": "User registered successfully",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": email,
                "username": username
            }
        }
    except Exception as e:
        logging.error(f"Registration error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/login", tags=["Auth"])
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    """Login user."""
    
    logging.info(f"Login attempt: email={email}")
    
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token({"id": user["_id"]})
    
    logging.info(f"Login successful: {user['_id']}")
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "email": user["email"],
            "username": user["username"]
        }
    }


@app.get("/me", tags=["Auth"])
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "username": current_user["username"],
        "created_at": current_user.get("created_at").isoformat() if current_user.get("created_at") else None
    }

############################################
# StudySpace Endpoints
############################################

@app.get("/spaces", tags=["StudySpaces"])
async def list_spaces(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    """List user's study spaces."""

    spaces = list(db.studyspaces.find(
        {"users": current_user["_id"]}
    ).skip(skip).limit(limit))

    for space in spaces:
        space["_id"] = str(space["_id"])
        space["createdAt"] = space["createdAt"].isoformat() if space.get("createdAt") else None

    return {"spaces": spaces, "count": len(spaces)}

@app.post("/spaces", tags=["StudySpaces"])
async def create_space(
    space_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new study space."""
    
    logger.info(f"Creating new study space for user: {current_user['_id']} ({current_user['username']})")
    logger.info(f"Request data: subject={space_data.get('subject')}, topic={space_data.get('topic')}")
    logger.debug(f"Full request data: {space_data}")

    try:
        subject = space_data.get("subject")
        topic = space_data.get("topic")
        
        if not subject:
            logger.warning(f"Missing subject field for user {current_user['_id']}")
            logger.warning(f"Received data: {space_data}")
            raise HTTPException(status_code=400, detail="Subject is required")
        
        # Validate subject length
        if len(subject.strip()) == 0:
            logger.warning(f"Empty subject field for user {current_user['_id']}")
            raise HTTPException(status_code=400, detail="Subject cannot be empty or just whitespace")
        
        if len(subject) > 200:
            logger.warning(f"Subject too long ({len(subject)} chars) for user {current_user['_id']}")
            raise HTTPException(status_code=400, detail="Subject is too long (max 200 characters)")
        
        # Validate topic length if provided
        if topic and len(topic) > 200:
            logger.warning(f"Topic too long ({len(topic)} chars) for user {current_user['_id']}")
            raise HTTPException(status_code=400, detail="Topic is too long (max 200 characters)")

        space_id = str(uuid.uuid4())
        
        logger.info(f"Generated space ID: {space_id}")
        
        # Prepare document for insertion
        space_doc = {
            "_id": space_id,
            "subject": subject.strip(),
            "topic": topic.strip() if topic else None,
            "users": [current_user["_id"]],
            "created_by": current_user["_id"],
            "createdAt": datetime.now(timezone.utc)
        }
        
        logger.debug(f"Space document to insert: {space_doc}")
        
        # Insert into database
        result = db.studyspaces.insert_one(space_doc)
        
        logger.info(f"Space created successfully: {space_id}")
        logger.info(f"MongoDB insert result: inserted_id={result.inserted_id}")

        # Prepare response
        response_data = {
            "message": "Study space created successfully",
            "space_id": space_id,
            "space": {
                "id": space_id,
                "subject": subject.strip(),
                "topic": topic.strip() if topic else None,
                "users": [current_user["_id"]]
            }
        }
        
        logger.info(f"Returning response for space: {space_id}")
        logger.debug(f"Response data: {response_data}")
        
        return response_data
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error creating study space for user {current_user['_id']}: {e}", exc_info=True)
        logger.error(f"Stack trace for debugging:")
        import traceback
        logger.error(traceback.format_exc())
        
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create study space: {str(e)}"
        )

@app.get("/spaces/{space_id}", tags=["StudySpaces"])
async def get_space(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get study space details."""

    space = db.studyspaces.find_one({"_id": space_id})

    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized to access this space")

    space["_id"] = str(space["_id"])
    space["createdAt"] = space["createdAt"].isoformat() if space.get("createdAt") else None

    return space



@app.delete("/spaces/{space_id}", tags=["StudySpaces"])
async def delete_space(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete study space and associated data."""

    space = db.studyspaces.find_one({"_id": space_id})

    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized to delete this space")

    # Delete space from database
    db.studyspaces.delete_one({"_id": space_id})

    # Delete associated files
    db.files.delete_many({"spaceId": space_id})

    # Delete associated chats
    db.chats.delete_many({"spaceId": space_id})

    # Clear graph data for this space
    if rag_engine:
        try:
            rag_engine.clear_space(space_id)
        except Exception as e:
            logger.warning(f"Error clearing graph data for space {space_id}: {e}")

    return {"message": "Study space deleted successfully"}

############################################
# File Endpoints
############################################

@app.get("/spaces/{space_id}/files", tags=["Files"])
async def list_files(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """List files in a study space."""

    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    files = list(db.files.find({"spaceId": space_id}).sort("uploadedAt", -1))

    for file in files:
        file["_id"] = str(file["_id"])
        file["uploadedAt"] = file["uploadedAt"].isoformat() if file.get("uploadedAt") else None
        file["filename"] = os.path.basename(file.get("path", ""))
        try:
            file["size"] = os.path.getsize(file.get("path", "")) if os.path.exists(file.get("path", "")) else 0
        except Exception as e:
            logger.warning(f"Error getting file size for {file.get('path')}: {e}")
            file["size"] = 0

    return {"files": files, "count": len(files)}

@app.post("/spaces/{space_id}/upload", tags=["Files"])
async def upload_file(
    space_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload file to study space with incremental ingestion and progress tracking."""
    
    logger.info(f"File upload started for space: {space_id}")
    logger.info(f"Uploaded by user: {current_user['_id']} ({current_user['username']})")
    logger.info(f"Filename: {file.filename}")
    logger.info(f"Content type: {file.content_type}")

    # Check space exists and user has access
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        logger.warning(f"Space not found for upload: {space_id}")
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        logger.warning(f"Unauthorized upload attempt: User {current_user['_id']} to space {space_id}")
        logger.warning(f"Space users: {space.get('users', [])}")
        raise HTTPException(status_code=403, detail="Not authorized to upload to this space")

    # Validate file
    if not file.filename:
        logger.warning(f"Invalid file uploaded - no filename provided")
        raise HTTPException(status_code=400, detail="Invalid file - no filename provided")

    # Validate file extension
    allowed_extensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.csv', '.json']
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_extensions:
        logger.warning(f"Invalid file extension: {file_ext} for file: {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join([ext for ext in allowed_extensions if ext])}"
        )

    try:
        # Read file content in chunks for better memory management
        MAX_SIZE = 10 * 1024 * 1024  # 10MB
        content_chunks = []
        total_size = 0
        
        logger.info(f"Reading file content: {file.filename}")
        
        while True:
            chunk = await file.read(1024 * 1024)  # Read 1MB at a time
            if not chunk:
                break
            total_size += len(chunk)
            
            # Check size limit
            if total_size > MAX_SIZE:
                logger.warning(f"File too large: {file.filename}, size: {total_size} bytes")
                raise HTTPException(
                    status_code=400, 
                    detail=f"File too large ({total_size:,} bytes). Maximum size is 10MB."
                )
            
            content_chunks.append(chunk)
        
        if total_size == 0:
            logger.warning(f"Empty file uploaded: {file.filename}")
            raise HTTPException(status_code=400, detail="File is empty")
        
        logger.info(f"File read complete: {file.filename}, size: {total_size:,} bytes")
        
        # Combine chunks
        content = b"".join(content_chunks)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}{file_ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        logger.info(f"Saving file to: {filepath}")
        
        # Save file
        try:
            with open(filepath, "wb") as f:
                f.write(content)
            logger.info(f"File saved successfully: {filepath}")
        except Exception as e:
            logger.error(f"Error writing file {filepath}: {e}", exc_info=True)
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to save file: {str(e)}"
            )

        # Save file metadata with progress tracking
        file_id = str(uuid.uuid4())
        file_doc = {
            "_id": file_id,
            "spaceId": space_id,
            "path": filepath,
            "filename": file.filename,
            "original_filename": file.filename,
            "type": file.content_type or "application/octet-stream",
            "size": total_size,
            "uploadedBy": current_user["_id"],
            "uploadedByUsername": current_user.get("username"),
            "uploadedAt": datetime.now(timezone.utc),
            "extension": file_ext,
            "status": "uploaded",
            "processed": False,  # Track if RAG processed it
            "chunks_count": 0,   # Track how many chunks extracted
            "processing_stage": "uploaded",  # Track processing stage
            "processing_started": None,
            "processing_completed": None,
            "ingestion_status": "pending",
            "ingestion_error": None,
            "embeddings_generated": False,
            "concepts_extracted": False,
            "neo4j_stored": False
        }
        
        logger.info(f"Saving file metadata: {file_id}")
        result = db.files.insert_one(file_doc)
        logger.info(f"File metadata saved: {file_id}, MongoDB ID: {result.inserted_id}")

        # INCREMENTAL ingestion - only process the new file
        ingestion_status = "pending"
        ingestion_error = None
        chunks_extracted = 0
        processing_details = {}
        bm25_status = "not_attempted"
        
        if rag_engine:
            try:
                logger.info(f"Starting INCREMENTAL RAG ingestion for space: {space_id}")
                logger.info(f"Processing only new file: {file.filename}")
                
                # Update status to processing started
                db.files.update_one(
                    {"_id": file_id},
                    {"$set": {
                        "status": "processing",
                        "processing_stage": "text_extraction",
                        "processing_started": datetime.now(timezone.utc)
                    }}
                )
                
                # Step 1: Extract text from the new file
                logger.info(f"Extracting text from: {file.filename}")
                text = ""
                if filepath.lower().endswith(".pdf"):
                    text = rag_engine.read_pdf(filepath)
                elif filepath.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                    text = rag_engine.read_image(filepath)
                elif filepath.lower().endswith(".txt"):
                    text = rag_engine.read_txt(filepath)
                
                if not text.strip():
                    raise HTTPException(status_code=400, detail="No text extracted from file")
                
                # Update: text extracted
                db.files.update_one(
                    {"_id": file_id},
                    {"$set": {"processing_stage": "chunking"}}
                )
                
                # Step 2: Chunk the text
                logger.info(f"Chunking text from: {file.filename}")
                chunks = rag_engine.chunk_text(text)
                chunks_extracted = len(chunks)
                
                db.files.update_one(
                    {"_id": file_id},
                    {"$set": {
                        "chunks_count": chunks_extracted,
                        "processing_stage": "embedding_generation"
                    }}
                )
                logger.info(f"Extracted {chunks_extracted} chunks from {file.filename}")
                
                if not chunks:
                    ingestion_status = "no_chunks"
                    logger.warning(f"No chunks extracted from: {file.filename}")
                else:
                    # Step 3: Generate embeddings (incremental - only for new chunks)
                    logger.info(f"Generating embeddings for {chunks_extracted} new chunks")
                    embeddings = rag_engine.embedder.encode(chunks, convert_to_tensor=False)
                    
                    # Convert to lists for Neo4j
                    embeddings_list = []
                    for emb in embeddings:
                        if hasattr(emb, "tolist"):
                            embeddings_list.append(emb.tolist())
                        elif hasattr(emb, "numpy"):
                            embeddings_list.append(emb.numpy().tolist())
                        else:
                            embeddings_list.append(list(emb))
                    
                    db.files.update_one(
                        {"_id": file_id},
                        {"$set": {
                            "embeddings_generated": True,
                            "processing_stage": "graph_insertion"
                        }}
                    )
                    
                    # Step 4: Insert into Neo4j (incremental - no clearing of existing data)
                    logger.info("Inserting new chunks into Neo4j graph (incremental)...")
                    for chunk, embedding in zip(chunks, embeddings_list):
                        rag_engine.insert_graph(chunk, embedding, space_id, llm)
                    
                    db.files.update_one(
                        {"_id": file_id},
                        {"$set": {
                            "concepts_extracted": True,
                            "neo4j_stored": True,
                            "processing_stage": "indexing"
                        }}
                    )
                    
                    # Step 5: Update BM25 index (append new chunks to existing) - WITH ERROR HANDLING
                    logger.info("Updating BM25 index with new chunks...")
                    try:
                        if space_id in rag_engine.space_documents:
                            # Append new chunks to existing documents
                            rag_engine.space_documents[space_id].extend(chunks)
                            logger.info(f"Appended {len(chunks)} chunks to existing BM25 index for space {space_id}")
                        else:
                            # Create new if first time
                            rag_engine.space_documents[space_id] = chunks
                            logger.info(f"Created new BM25 index for space {space_id} with {len(chunks)} chunks")
                        
                        # Try to create BM25 index with error handling
                        try:
                            # Import BM25Okapi with error handling
                            try:
                                from rank_bm25 import BM25Okapi
                                
                                # Tokenize documents for BM25
                                tokenized_docs = [doc.split() for doc in rag_engine.space_documents[space_id]]
                                
                                # Create BM25 index
                                rag_engine.space_bm25[space_id] = BM25Okapi(tokenized_docs)
                                bm25_status = "success"
                                logger.info(f"✅ BM25 index created/updated for space {space_id} with {len(tokenized_docs)} documents")
                                
                            except ImportError as import_error:
                                bm25_status = "import_failed"
                                rag_engine.space_bm25[space_id] = None
                                logger.warning(f"BM25Okapi import failed, skipping BM25 indexing: {import_error}")
                                logger.warning("Vector search will still work, but keyword search (BM25) will be limited")
                                
                            except Exception as bm25_error:
                                bm25_status = "creation_failed"
                                rag_engine.space_bm25[space_id] = None
                                logger.warning(f"BM25 index creation failed: {bm25_error}")
                                logger.warning("Continuing without BM25 - vector search will still work")
                                
                        except Exception as e:
                            bm25_status = "error"
                            logger.warning(f"BM25 update error (non-critical): {e}")
                            # Don't fail the whole ingestion because of BM25
                    
                    except Exception as e:
                        bm25_status = "failed"
                        logger.warning(f"BM25 update failed (non-critical): {e}")
                        # Continue anyway - Neo4j vector search will still work
                    
                    ingestion_status = "success"
                    logger.info(f"✅ INCREMENTAL ingestion successful: {chunks_extracted} new chunks added to space {space_id}")
                    
                    processing_details = {
                        "chunks_extracted": chunks_extracted,
                        "embeddings_generated": len(embeddings_list),
                        "space_total_chunks": len(rag_engine.space_documents.get(space_id, [])),
                        "bm25_status": bm25_status,
                        "processing_time": None  # Will be set below
                    }
                    
            except Exception as e:
                ingestion_status = "failed"
                ingestion_error = str(e)
                logger.error(f"Incremental ingestion error for space {space_id}: {e}", exc_info=True)
                
                # Check if it's a BM25-specific error
                if "BM25Okapi" in str(e) or "BM25" in str(e):
                    logger.warning("BM25-related error detected, but Neo4j data might still be saved")
                    # Check if Neo4j data was saved before the error
                    if chunks_extracted > 0:
                        ingestion_status = "partial_success"
                        ingestion_error = f"File processed but BM25 indexing failed: {str(e)}"
        else:
            ingestion_status = "skipped"
            logger.warning("RAG Engine not available - ingestion skipped")

        # Update final status with processing time
        processing_completed = datetime.now(timezone.utc)
        if file_doc.get("processing_started"):
            processing_time = (processing_completed - file_doc["processing_started"]).total_seconds()
        else:
            processing_time = 0
        
        # Determine if file was actually processed (even if BM25 failed)
        was_processed = ingestion_status in ["success", "partial_success"] and chunks_extracted > 0
        
        db.files.update_one(
            {"_id": file_id},
            {
                "$set": {
                    "status": ingestion_status,
                    "ingestion_status": ingestion_status,
                    "ingestion_error": ingestion_error,
                    "processed": was_processed,
                    "processing_stage": "completed",
                    "processing_completed": processing_completed,
                    "processing_time_seconds": processing_time,
                    "processing_details": processing_details,
                    "bm25_status": bm25_status
                }
            }
        )

        # Prepare detailed response based on ingestion status
        if ingestion_status == "success":
            message = "File uploaded and processed successfully"
        elif ingestion_status == "partial_success":
            message = "File uploaded and content processed, but some indexing features may be limited"
        elif ingestion_status == "failed":
            message = "File uploaded but processing failed"
        else:
            message = "File uploaded successfully"
        
        response_data = {
            "message": message,
            "file_id": file_id,
            "filename": file.filename,
            "original_filename": file.filename,
            "size": total_size,
            "size_formatted": f"{total_size:,} bytes",
            "type": file.content_type or "application/octet-stream",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "uploaded_by": {
                "id": current_user["_id"],
                "username": current_user.get("username")
            },
            "ingestion": {
                "status": ingestion_status,
                "message": f"Incremental ingestion {ingestion_status}",
                "chunks_extracted": chunks_extracted,
                "processing_time_seconds": processing_time,
                "bm25_status": bm25_status
            },
            "processing_details": processing_details
        }
        
        if ingestion_error:
            response_data["ingestion"]["error"] = ingestion_error
        
        logger.info(f"Upload completed: {file.filename} -> {file_id}, Status: {ingestion_status}, BM25: {bm25_status}")
        logger.debug(f"Response data: {response_data}")
        
        return response_data
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Upload failed: {str(e)}"
        )

@app.delete("/spaces/{space_id}/files/{file_id}", tags=["Files"])
async def delete_file(
    space_id: str,
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete file from study space with complete re-ingestion."""
    
    logger.info(f"File deletion requested: space={space_id}, file={file_id}")
    logger.info(f"Requested by user: {current_user['_id']} ({current_user['username']})")

    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        logger.warning(f"Space not found for deletion: {space_id}")
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        logger.warning(f"Unauthorized deletion attempt: User {current_user['_id']} in space {space_id}")
        raise HTTPException(status_code=403, detail="Not authorized")

    file = db.files.find_one({"_id": file_id, "spaceId": space_id})
    if not file:
        logger.warning(f"File not found: {file_id} in space {space_id}")
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Mark file as deleting for tracking
        db.files.update_one(
            {"_id": file_id},
            {"$set": {
                "status": "deleting",
                "deletion_started": datetime.now(timezone.utc),
                "deleted_by": current_user["_id"]
            }}
        )
        
        # Delete physical file
        file_path = file.get("path")
        physical_deleted = False
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                physical_deleted = True
                logger.info(f"Physical file deleted: {file_path}")
            except Exception as e:
                logger.warning(f"Error deleting physical file {file_path}: {e}")
                physical_deleted = False
        
        # Delete from database
        db.files.delete_one({"_id": file_id})
        logger.info(f"File metadata deleted from MongoDB: {file_id}")
        
        # Update deletion status
        deletion_status = "completed" if physical_deleted else "partial"
        
        # Re-ingest remaining files (FULL re-ingestion needed after deletion)
        reingestion_status = "skipped"
        reingestion_error = None
        
        if rag_engine:
            try:
                logger.info(f"Starting FULL re-ingestion for space {space_id} after file deletion")
                
                # Get remaining files
                space_files = [f["path"] for f in db.files.find({"spaceId": space_id})]
                
                if space_files:
                    logger.info(f"Re-ingesting {len(space_files)} remaining files for space {space_id}")
                    
                    # Clear existing Neo4j data for this space (needed when deleting)
                    rag_engine.clear_space(space_id)
                    logger.info(f"Cleared Neo4j data for space {space_id}")
                    
                    # Re-ingest ALL remaining files
                    rag_engine.ingest(space_files, space_id, llm, clear_existing=False)
                    
                    reingestion_status = "success"
                    logger.info(f"✅ Re-ingestion successful for space {space_id}")
                else:
                    # No files left, just clear the space
                    rag_engine.clear_space(space_id)
                    reingestion_status = "cleared"
                    logger.info(f"Space {space_id} cleared (no files remaining)")
                    
            except Exception as e:
                reingestion_status = "failed"
                reingestion_error = str(e)
                logger.error(f"Re-ingestion error for space {space_id}: {e}", exc_info=True)
        
        # Log deletion summary
        logger.info(f"File deletion completed: {file_id}, Status: {deletion_status}, Re-ingestion: {reingestion_status}")
        
        return {
            "message": "File deleted successfully",
            "file_id": file_id,
            "filename": file.get("filename"),
            "physical_deleted": physical_deleted,
            "metadata_deleted": True,
            "deletion_status": deletion_status,
            "reingestion_status": reingestion_status,
            "remaining_files": db.files.count_documents({"spaceId": space_id})
        }
        
    except Exception as e:
        logger.error(f"Error during file deletion: {e}", exc_info=True)
        # Try to restore status if deletion failed
        try:
            db.files.update_one(
                {"_id": file_id},
                {"$set": {
                    "status": "error",
                    "deletion_error": str(e),
                    "deletion_completed": datetime.now(timezone.utc)
                }}
            )
        except:
            pass
            
        raise HTTPException(
            status_code=500,
            detail=f"File deletion failed: {str(e)}"
        )



############################################
# Chat Endpoints
############################################

@app.post("/spaces/{space_id}/chat", tags=["Chat"])
async def chat(
    space_id: str,
    message: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI about study materials."""

    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save user message
    user_chat_id = str(uuid.uuid4())
    db.chats.insert_one({
        "_id": user_chat_id,
        "spaceId": space_id,
        "author": current_user["_id"],
        "authorType": "user",
        "text": message,
        "createdAt": datetime.now(timezone.utc)
    })

    # Get AI response
    answer = "Sorry, I encountered an error processing your question. Please try again."

    if rag_engine:
        try:
            answer = rag_engine.ask(message, space_id, llm)
        except Exception as e:
            logger.error(f"Chat error: {e}")

    # Save AI response
    ai_chat_id = str(uuid.uuid4())
    db.chats.insert_one({
        "_id": ai_chat_id,
        "spaceId": space_id,
        "author": "AI",
        "authorType": "ai",
        "text": answer,
        "createdAt": datetime.now(timezone.utc)
    })

    return {
        "question": message,
        "answer": answer,
        "space_id": space_id
    }

@app.get("/spaces/{space_id}/chats", tags=["Chat"])
async def get_chats(
    space_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0)
):
    """Get chat history for a study space."""

    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    chats = list(db.chats.find({"spaceId": space_id})
                 .sort("createdAt", -1)
                 .skip(skip)
                 .limit(limit))

    # Reverse to chronological order
    chats.reverse()

    for chat in chats:
        chat["_id"] = str(chat["_id"])
        chat["createdAt"] = chat["createdAt"].isoformat() if chat.get("createdAt") else None

    return {"chats": chats, "count": len(chats)}

############################################
# Stats & Admin
############################################

@app.get("/spaces/{space_id}/stats", tags=["Stats"])
async def get_space_stats(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a study space."""

    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")

    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get file count
    file_count = db.files.count_documents({"spaceId": space_id})

    # Get chat count
    chat_count = db.chats.count_documents({"spaceId": space_id})

    # Get graph stats
    graph_stats = {}
    if rag_engine:
        try:
            graph_stats = rag_engine.get_space_stats(space_id)
        except Exception as e:
            graph_stats = {"error": str(e)}

    return {
        "space_id": space_id,
        "files": file_count,
        "chats": chat_count,
        "graph": graph_stats,
        "space_info": {
            "subject": space.get("subject"),
            "topic": space.get("topic"),
            "created_at": space.get("createdAt").isoformat() if space.get("createdAt") else None
        }
    }

@app.get("/admin/stats", tags=["Admin"])
async def admin_stats():
    """Admin statistics."""
    user_count = db.users.count_documents({})
    space_count = db.studyspaces.count_documents({})
    file_count = db.files.count_documents({})
    chat_count = db.chats.count_documents({})

    return {
        "users": user_count,
        "spaces": space_count,
        "files": file_count,
        "chats": chat_count
    }

############################################
# ERROR HANDLERS
############################################

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    debug_mode = os.getenv("DEBUG", "False").lower() == "true"
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if debug_mode else None
        }
    )

############################################
# STARTUP & SHUTDOWN
############################################

@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    logger.info("Starting GraphRAG backend...")

    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Create indexes
    try:
        db.users.create_index("email", unique=True)
        db.users.create_index("username", unique=True)
        db.studyspaces.create_index("users")
        db.files.create_index("spaceId")
        db.chats.create_index("spaceId")
        
        # New indexes for posts feature
        db.postgroups.create_index("name", unique=True)
        db.postgroups.create_index("members")
        db.postgroups.create_index("is_public")
        db.posts.create_index("groupId")
        db.posts.create_index("userId")
        db.posts.create_index([("groupId", 1), ("createdAt", -1)])
        db.posts.create_index([("groupId", 1), ("upvotes", -1)])
        
        logger.info("✅ Database indexes created")
    except Exception as e:
        logger.warning(f"Error creating indexes: {e}")

    logger.info("✅ Startup complete")
    

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logger.info("Shutting down GraphRAG backend...")

    try:
        mongo_client.close()
        if rag_engine:
            rag_engine.close()
        logger.info("✅ Shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

















############################################
# StudySpace User Management Endpoints
############################################

@app.get("/spaces/{space_id}/users", tags=["StudySpaces"])
async def get_space_users(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all users in a study space."""
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    # Check if current user is in space
    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user details for all users in space
    user_ids = space.get("users", [])
    users = list(db.users.find({"_id": {"$in": user_ids}}))
    
    # Format response
    formatted_users = []
    for user in users:
        formatted_users.append({
            "id": user["_id"],
            "username": user["username"],
            "email": user["email"],
            "is_owner": user["_id"] == space.get("created_by"),
            "added_at": space.get("createdAt")  # Note: we should track when users were added
        })
    
    return {
        "space_id": space_id,
        "users": formatted_users,
        "total": len(formatted_users)
    }


@app.post("/spaces/{space_id}/users", tags=["StudySpaces"])
async def add_user_to_space(
    space_id: str,
    username_or_email: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Add a user to study space by username or email."""
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    # Check if current user is space owner/creator
    if current_user["_id"] != space.get("created_by"):
        raise HTTPException(status_code=403, detail="Only space owner can add users")
    
    # Find user by username or email
    user_to_add = db.users.find_one({
        "$or": [
            {"username": username_or_email},
            {"email": username_or_email}
        ]
    })
    
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_id = user_to_add["_id"]
    
    # Check if user is already in space
    if user_id in space.get("users", []):
        raise HTTPException(status_code=400, detail="User already in space")
    
    # Check if trying to add yourself
    if user_id == current_user["_id"]:
        raise HTTPException(status_code=400, detail="You are already in this space")
    
    # Add user to space
    result = db.studyspaces.update_one(
        {"_id": space_id},
        {"$addToSet": {"users": user_id}}  # Using $addToSet to prevent duplicates
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add user to space")
    
    logger.info(f"User {user_id} added to space {space_id} by {current_user['_id']}")
    
    return {
        "message": "User added to space successfully",
        "space_id": space_id,
        "user": {
            "id": user_id,
            "username": user_to_add["username"],
            "email": user_to_add["email"]
        }
    }


@app.delete("/spaces/{space_id}/users/{user_id}", tags=["StudySpaces"])
async def remove_user_from_space(
    space_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a user from study space."""
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    # Check if current user is space owner/creator
    if current_user["_id"] != space.get("created_by"):
        raise HTTPException(status_code=403, detail="Only space owner can remove users")
    
    # Check if trying to remove owner
    if user_id == space.get("created_by"):
        raise HTTPException(status_code=400, detail="Cannot remove space owner")
    
    # Check if user is in space
    if user_id not in space.get("users", []):
        raise HTTPException(status_code=400, detail="User not in space")
    
    # Remove user from space
    result = db.studyspaces.update_one(
        {"_id": space_id},
        {"$pull": {"users": user_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to remove user from space")
    
    logger.info(f"User {user_id} removed from space {space_id} by {current_user['_id']}")
    
    return {
        "message": "User removed from space successfully",
        "space_id": space_id,
        "user_id": user_id
    }


@app.post("/spaces/{space_id}/leave", tags=["StudySpaces"])
async def leave_space(
    space_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Leave a study space (remove yourself)."""
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    # Check if user is in space
    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=400, detail="You are not in this space")
    
    # Check if user is owner
    if current_user["_id"] == space.get("created_by"):
        raise HTTPException(status_code=400, detail="Space owner cannot leave. Transfer ownership or delete space.")
    
    # Remove user from space
    result = db.studyspaces.update_one(
        {"_id": space_id},
        {"$pull": {"users": current_user["_id"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to leave space")
    
    logger.info(f"User {current_user['_id']} left space {space_id}")
    
    return {
        "message": "Left space successfully",
        "space_id": space_id
    }
    
    
    
    
    
    
    ############################################
# Post Groups Endpoints
############################################

@app.get("/groups", tags=["Posts"])
async def list_groups(
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    public_only: bool = Query(False)
):
    """List post groups (discussion rooms)."""
    
    query = {}
    
    if public_only:
        query["is_public"] = True
    else:
        # Show public groups + groups user is member of
        query["$or"] = [
            {"is_public": True},
            {"members": current_user["_id"]},
            {"moderators": current_user["_id"]},
            {"created_by": current_user["_id"]}
        ]
    
    groups = list(db.postgroups.find(query)
                  .sort("createdAt", -1)
                  .skip(skip)
                  .limit(limit))
    
    # Get user info for creators
    for group in groups:
        group["_id"] = str(group["_id"])
        group["createdAt"] = group["createdAt"].isoformat() if group.get("createdAt") else None
        
        # Get creator info
        creator = db.users.find_one({"_id": group.get("created_by")})
        if creator:
            group["created_by_user"] = {
                "id": creator["_id"],
                "username": creator["username"]
            }
        
        # Check if current user is member
        group["is_member"] = current_user["_id"] in group.get("members", [])
        group["is_moderator"] = current_user["_id"] in group.get("moderators", [])
        group["is_creator"] = current_user["_id"] == group.get("created_by")
    
    return {"groups": groups, "count": len(groups)}


@app.post("/groups", tags=["Posts"])
async def create_group(
    group_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new post group (discussion room)."""
    
    name = group_data.get("name")
    description = group_data.get("description")
    is_public = group_data.get("is_public", True)
    
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")
    
    # Check if group name already exists
    existing = db.postgroups.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Group name already exists")
    
    group_id = str(uuid.uuid4())
    
    group_doc = {
        "_id": group_id,
        "name": name.strip(),
        "description": description.strip() if description else None,
        "is_public": is_public,
        "created_by": current_user["_id"],
        "members": [current_user["_id"]],  # Creator is automatically a member
        "moderators": [current_user["_id"]],  # Creator is automatically a moderator
        "createdAt": datetime.now(timezone.utc)
    }
    
    db.postgroups.insert_one(group_doc)
    
    logger.info(f"Group created: {group_id} by {current_user['_id']}")
    
    return {
        "message": "Group created successfully",
        "group_id": group_id,
        "group": {
            "id": group_id,
            "name": name.strip(),
            "description": description,
            "is_public": is_public,
            "created_by": current_user["_id"]
        }
    }


@app.get("/groups/{group_id}", tags=["Posts"])
async def get_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get group details."""
    
    group = db.postgroups.find_one({"_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check access for private groups
    if not group.get("is_public", True):
        if (current_user["_id"] not in group.get("members", []) and
            current_user["_id"] not in group.get("moderators", []) and
            current_user["_id"] != group.get("created_by")):
            raise HTTPException(status_code=403, detail="Not authorized to access this group")
    
    group["_id"] = str(group["_id"])
    group["createdAt"] = group["createdAt"].isoformat() if group.get("createdAt") else None
    
    # Get creator info
    creator = db.users.find_one({"_id": group.get("created_by")})
    if creator:
        group["created_by_user"] = {
            "id": creator["_id"],
            "username": creator["username"]
        }
    
    # Get member info
    member_ids = group.get("members", [])
    moderator_ids = group.get("moderators", [])
    
    all_user_ids = list(set(member_ids + moderator_ids + [group.get("created_by")]))
    users = list(db.users.find({"_id": {"$in": all_user_ids}}))
    
    user_map = {user["_id"]: user for user in users}
    
    # Format members
    formatted_members = []
    for member_id in member_ids:
        if member_id in user_map:
            formatted_members.append({
                "id": member_id,
                "username": user_map[member_id]["username"],
                "email": user_map[member_id]["email"],
                "role": "moderator" if member_id in moderator_ids else "member",
                "is_creator": member_id == group.get("created_by")
            })
    
    group["members"] = formatted_members
    group["member_count"] = len(formatted_members)
    
    # Check current user's role
    group["current_user_role"] = "non_member"
    if current_user["_id"] == group.get("created_by"):
        group["current_user_role"] = "creator"
    elif current_user["_id"] in moderator_ids:
        group["current_user_role"] = "moderator"
    elif current_user["_id"] in member_ids:
        group["current_user_role"] = "member"
    
    return group


@app.post("/groups/{group_id}/join", tags=["Posts"])
async def join_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Join a group."""
    
    group = db.postgroups.find_one({"_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if already a member
    if current_user["_id"] in group.get("members", []):
        raise HTTPException(status_code=400, detail="Already a member of this group")
    
    # Add user to members
    result = db.postgroups.update_one(
        {"_id": group_id},
        {"$addToSet": {"members": current_user["_id"]}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to join group")
    
    logger.info(f"User {current_user['_id']} joined group {group_id}")
    
    return {
        "message": "Joined group successfully",
        "group_id": group_id
    }


@app.post("/groups/{group_id}/leave", tags=["Posts"])
async def leave_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Leave a group."""
    
    group = db.postgroups.find_one({"_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is creator
    if current_user["_id"] == group.get("created_by"):
        raise HTTPException(status_code=400, detail="Group creator cannot leave. Delete group or transfer ownership.")
    
    # Check if user is a member
    if current_user["_id"] not in group.get("members", []):
        raise HTTPException(status_code=400, detail="Not a member of this group")  # FIXED HERE
    
    # Remove from members and moderators
    result = db.postgroups.update_one(
        {"_id": group_id},
        {
            "$pull": {
                "members": current_user["_id"],
                "moderators": current_user["_id"]
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to leave group")
    
    logger.info(f"User {current_user['_id']} left group {group_id}")
    
    return {
        "message": "Left group successfully",
        "group_id": group_id
    }



############################################
# Posts Endpoints
############################################

@app.get("/groups/{group_id}/posts", tags=["Posts"])
async def list_posts(
    group_id: str,
    current_user: dict = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest", enum=["newest", "oldest", "popular"])
):
    """List posts in a group."""
    
    group = db.postgroups.find_one({"_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check access for private groups
    if not group.get("is_public", True):
        if (current_user["_id"] not in group.get("members", []) and
            current_user["_id"] not in group.get("moderators", []) and
            current_user["_id"] != group.get("created_by")):
            raise HTTPException(status_code=403, detail="Not authorized to access this group")
    
    # Build sort order
    sort_field = "createdAt"
    sort_direction = -1  # Descending
    
    if sort_by == "oldest":
        sort_direction = 1  # Ascending
    elif sort_by == "popular":
        sort_field = "upvotes"
        sort_direction = -1
    
    # Query posts
    posts = list(db.posts.find({"groupId": group_id})
                 .sort(sort_field, sort_direction)
                 .skip(skip)
                 .limit(limit))
    
    # Get user info for posts
    user_ids = set([post.get("userId") for post in posts])
    users = list(db.users.find({"_id": {"$in": list(user_ids)}}))
    user_map = {user["_id"]: user for user in users}
    
    # Format posts
    formatted_posts = []
    for post in posts:
        post["_id"] = str(post["_id"])
        post["createdAt"] = post["createdAt"].isoformat() if post.get("createdAt") else None
        
        # Add user info
        user = user_map.get(post.get("userId"))
        if user:
            post["author"] = {
                "id": user["_id"],
                "username": user["username"]
            }
        
        # Count comments
        post["comment_count"] = len(post.get("comments", []))
        
        # Check if current user has upvoted/downvoted
        post["user_upvoted"] = False
        post["user_downvoted"] = False
        
        formatted_posts.append(post)
    
    return {
        "group_id": group_id,
        "posts": formatted_posts,
        "count": len(formatted_posts)
    }


@app.post("/groups/{group_id}/posts", tags=["Posts"])
async def create_post(
    group_id: str,
    post_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new post in a group."""
    
    group = db.postgroups.find_one({"_id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is member (for private groups) or allow anyone for public groups
    if not group.get("is_public", True):
        if (current_user["_id"] not in group.get("members", []) and
            current_user["_id"] not in group.get("moderators", []) and
            current_user["_id"] != group.get("created_by")):
            raise HTTPException(status_code=403, detail="Must be a member to post in this group")
    
    title = post_data.get("title")
    content = post_data.get("content")
    tags = post_data.get("tags", [])
    files = post_data.get("files", [])
    
    if not title or not content:
        raise HTTPException(status_code=400, detail="Title and content are required")
    
    post_id = str(uuid.uuid4())
    
    post_doc = {
        "_id": post_id,
        "groupId": group_id,
        "userId": current_user["_id"],
        "title": title.strip(),
        "content": content.strip(),
        "tags": tags,
        "files": files,
        "upvotes": 0,
        "downvotes": 0,
        "comments": [],
        "is_pinned": False,
        "createdAt": datetime.now(timezone.utc)
    }
    
    db.posts.insert_one(post_doc)
    
    logger.info(f"Post created: {post_id} in group {group_id} by {current_user['_id']}")
    
    return {
        "message": "Post created successfully",
        "post_id": post_id,
        "post": {
            "id": post_id,
            "title": title.strip(),
            "content": content.strip(),
            "groupId": group_id,
            "author": {
                "id": current_user["_id"],
                "username": current_user["username"]
            }
        }
    }


@app.get("/posts/{post_id}", tags=["Posts"])
async def get_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single post with details."""
    
    post = db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get group to check access
    group = db.postgroups.find_one({"_id": post.get("groupId")})
    if not group:
        raise HTTPException(status_code=404, detail="Associated group not found")
    
    # Check access for private groups
    if not group.get("is_public", True):
        if (current_user["_id"] not in group.get("members", []) and
            current_user["_id"] not in group.get("moderators", []) and
            current_user["_id"] != group.get("created_by")):
            raise HTTPException(status_code=403, detail="Not authorized to access this post")
    
    post["_id"] = str(post["_id"])
    post["createdAt"] = post["createdAt"].isoformat() if post.get("createdAt") else None
    
    # Get author info
    author = db.users.find_one({"_id": post.get("userId")})
    if author:
        post["author"] = {
            "id": author["_id"],
            "username": author["username"],
            "email": author["email"]
        }
    
    # Get group info
    post["group"] = {
        "id": group["_id"],
        "name": group.get("name"),
        "is_public": group.get("is_public", True)
    }
    
    # Format comments with user info
    comments = post.get("comments", [])
    if comments:
        comment_user_ids = [comment.get("userId") for comment in comments if comment.get("userId")]
        comment_users = list(db.users.find({"_id": {"$in": comment_user_ids}}))
        comment_user_map = {user["_id"]: user for user in comment_users}
        
        for comment in comments:
            user = comment_user_map.get(comment.get("userId"))
            if user:
                comment["author"] = {
                    "id": user["_id"],
                    "username": user["username"]
                }
            comment["createdAt"] = comment.get("createdAt", datetime.now(timezone.utc)).isoformat()
    
    return post


@app.post("/posts/{post_id}/upvote", tags=["Posts"])
async def upvote_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Upvote a post."""
    
    post = db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already upvoted (simplified - in real app, track per user)
    # For now, just increment
    result = db.posts.update_one(
        {"_id": post_id},
        {"$inc": {"upvotes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to upvote post")
    
    return {
        "message": "Post upvoted",
        "post_id": post_id,
        "upvotes": post.get("upvotes", 0) + 1
    }


@app.post("/posts/{post_id}/downvote", tags=["Posts"])
async def downvote_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Downvote a post."""
    
    post = db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = db.posts.update_one(
        {"_id": post_id},
        {"$inc": {"downvotes": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to downvote post")
    
    return {
        "message": "Post downvoted",
        "post_id": post_id,
        "downvotes": post.get("downvotes", 0) + 1
    }


@app.post("/posts/{post_id}/comments", tags=["Posts"])
async def add_comment(
    post_id: str,
    comment_data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Add a comment to a post."""
    
    post = db.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    content = comment_data.get("content")
    parent_comment_id = comment_data.get("parentCommentId")
    
    if not content:
        raise HTTPException(status_code=400, detail="Comment content is required")
    
    comment_id = str(uuid.uuid4())
    
    comment = {
        "_id": comment_id,
        "postId": post_id,
        "userId": current_user["_id"],
        "content": content.strip(),
        "parentCommentId": parent_comment_id,
        "upvotes": 0,
        "downvotes": 0,
        "createdAt": datetime.now(timezone.utc)
    }
    
    # Add comment to post
    result = db.posts.update_one(
        {"_id": post_id},
        {"$push": {"comments": comment}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=500, detail="Failed to add comment")
    
    logger.info(f"Comment added to post {post_id} by {current_user['_id']}")
    
    return {
        "message": "Comment added successfully",
        "comment_id": comment_id,
        "comment": {
            "id": comment_id,
            "content": content.strip(),
            "author": {
                "id": current_user["_id"],
                "username": current_user["username"]
            }
        }
    }