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
                    
                    # Step 5: Update BM25 index (append new chunks to existing)
                    logger.info("Updating BM25 index with new chunks...")
                    if space_id in rag_engine.space_documents:
                        # Append new chunks to existing documents
                        rag_engine.space_documents[space_id].extend(chunks)
                    else:
                        # Create new if first time
                        rag_engine.space_documents[space_id] = chunks
                    
                    # Recreate BM25 with ALL documents (existing + new)
                    rag_engine.space_bm25[space_id] = BM25Okapi(
                        [doc.split() for doc in rag_engine.space_documents[space_id]]
                    )
                    
                    ingestion_status = "success"
                    logger.info(f"✅ INCREMENTAL ingestion successful: {chunks_extracted} new chunks added to space {space_id}")
                    
                    processing_details = {
                        "chunks_extracted": chunks_extracted,
                        "embeddings_generated": len(embeddings_list),
                        "space_total_chunks": len(rag_engine.space_documents.get(space_id, [])),
                        "processing_time": None  # Will be set below
                    }
                    
            except Exception as e:
                ingestion_status = "failed"
                ingestion_error = str(e)
                logger.error(f"Incremental ingestion error for space {space_id}: {e}", exc_info=True)
        else:
            ingestion_status = "skipped"
            logger.warning("RAG Engine not available - ingestion skipped")

        # Update final status with processing time
        processing_completed = datetime.now(timezone.utc)
        if file_doc.get("processing_started"):
            processing_time = (processing_completed - file_doc["processing_started"]).total_seconds()
        else:
            processing_time = 0
        
        db.files.update_one(
            {"_id": file_id},
            {
                "$set": {
                    "status": ingestion_status,
                    "ingestion_status": ingestion_status,
                    "ingestion_error": ingestion_error,
                    "processed": ingestion_status == "success",
                    "processing_stage": "completed",
                    "processing_completed": processing_completed,
                    "processing_time_seconds": processing_time,
                    "processing_details": processing_details
                }
            }
        )

        # Prepare detailed response
        response_data = {
            "message": "File uploaded successfully",
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
                "processing_time_seconds": processing_time
            },
            "processing_details": processing_details
        }
        
        if ingestion_error:
            response_data["ingestion"]["error"] = ingestion_error
            response_data["ingestion"]["error_details"] = str(ingestion_error)
        
        logger.info(f"Upload completed: {file.filename} -> {file_id}, Status: {ingestion_status}")
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
