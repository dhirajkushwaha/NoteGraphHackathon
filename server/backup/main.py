from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Form, Body, Query
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from passlib.context import CryptContext
from jose import jwt, JWTError
from pymongo import MongoClient
from dotenv import load_dotenv
import os, uuid, requests
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging

from ragengine import init_graph, ingest, ask, clear_space, get_space_stats
from models import User, StudySpace, File as FileModel, Chat

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
UPLOAD_DIR = "storage/files"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

# Initialize Graph
try:
    init_graph(NEO4J_URI, NEO4J_USER, NEO4J_PASS)
    logging.info("✅ Neo4j graph initialized successfully")
except Exception as e:
    logging.error(f"❌ Neo4j initialization failed: {e}")

############################################
# LLM Wrapper
############################################

def llm(prompt: str) -> str:
    """
    Call LLM via OpenRouter API.
    """
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
        logging.error(f"LLM API error: {e}")
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
    """Verify password."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password."""
    return pwd_context.hash(password)

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
        
        # Check Neo4j
        with init_graph.__globals__["driver"].session() as session:
            session.run("RETURN 1")
        
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
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
    
    # Check if user exists
    if db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(password)
    
    user = User(
        email=email,
        username=username,
        password_hash=hashed_password,
        created_at=datetime.utcnow()
    )
    
    db.users.insert_one({
        "_id": user_id,
        **user.model_dump(exclude={"created_at"}),
        "created_at": user.created_at
    })
    
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

@app.post("/login", tags=["Auth"])
async def login(
    email: str = Form(...),
    password: str = Form(...)
):
    """Login user."""
    
    user = db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    token = create_access_token({"id": user["_id"]})
    
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
        "created_at": current_user.get("created_at")
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
    subject: str = Form(...),
    topic: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """Create a new study space."""
    
    space_id = str(uuid.uuid4())
    
    space = StudySpace(
        subject=subject,
        topic=topic,
        users=[current_user["_id"]],
        created_by=current_user["_id"]
    )
    
    db.studyspaces.insert_one({
        "_id": space_id,
        **space.model_dump(exclude={"createdAt"}),
        "createdAt": space.createdAt
    })
    
    return {
        "message": "Study space created successfully",
        "space_id": space_id,
        "space": {
            "id": space_id,
            "subject": subject,
            "topic": topic,
            "users": [current_user["_id"]]
        }
    }

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
    try:
        clear_space(space_id)
    except Exception as e:
        logging.warning(f"Error clearing graph data for space {space_id}: {e}")
    
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
        file["size"] = os.path.getsize(file.get("path", "")) if os.path.exists(file.get("path", "")) else 0
    
    return {"files": files, "count": len(files)}

@app.post("/spaces/{space_id}/upload", tags=["Files"])
async def upload_file(
    space_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload file to study space."""
    
    # Check space exists and user has access
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file size (max 10MB)
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    # Reset file pointer
    await file.seek(0)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Save file metadata
    file_doc = FileModel(
        spaceId=space_id,
        path=filepath,
        filename=file.filename,
        type=file.content_type or "application/octet-stream",
        size=len(content),
        uploadedBy=current_user["_id"]
    )
    
    db.files.insert_one({
        "_id": str(uuid.uuid4()),
        **file_doc.model_dump(exclude={"uploadedAt"}),
        "uploadedAt": file_doc.uploadedAt
    })
    
    # Get all files for this space
    space_files = [f["path"] for f in db.files.find({"spaceId": space_id})]
    
    # Ingest into graph (async - could be moved to background task)
    try:
        ingest(space_files, space_id, llm)
        ingestion_status = "success"
    except Exception as e:
        logging.error(f"Ingestion error: {e}")
        ingestion_status = f"partial - {str(e)}"
    
    return {
        "message": "File uploaded successfully",
        "filename": file.filename,
        "filepath": filepath,
        "size": len(content),
        "ingestion_status": ingestion_status
    }

@app.delete("/spaces/{space_id}/files/{file_id}", tags=["Files"])
async def delete_file(
    space_id: str,
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete file from study space."""
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    file = db.files.find_one({"_id": file_id, "spaceId": space_id})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    if os.path.exists(file.get("path", "")):
        os.remove(file["path"])
    
    # Delete from database
    db.files.delete_one({"_id": file_id})
    
    # Re-ingest remaining files (in background ideally)
    space_files = [f["path"] for f in db.files.find({"spaceId": space_id})]
    if space_files:
        try:
            ingest(space_files, space_id, llm)
        except Exception as e:
            logging.error(f"Re-ingestion error: {e}")
    
    return {"message": "File deleted successfully"}

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
    
    space = db.studyspaces.find_one({"_id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Study space not found")
    
    if current_user["_id"] not in space.get("users", []):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save user message
    user_chat = Chat(
        spaceId=space_id,
        author=current_user["_id"],
        text=message,
        authorType="user"
    )
    
    db.chats.insert_one({
        "_id": str(uuid.uuid4()),
        **user_chat.model_dump(exclude={"createdAt"}),
        "createdAt": user_chat.createdAt
    })
    
    # Get AI response
    try:
        answer = ask(message, space_id, llm)
    except Exception as e:
        logging.error(f"Chat error: {e}")
        answer = "Sorry, I encountered an error processing your question. Please try again."
    
    # Save AI response
    ai_chat = Chat(
        spaceId=space_id,
        author="AI",
        text=answer,
        authorType="ai"
    )
    
    db.chats.insert_one({
        "_id": str(uuid.uuid4()),
        **ai_chat.model_dump(exclude={"createdAt"}),
        "createdAt": ai_chat.createdAt
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
    try:
        graph_stats = get_space_stats(space_id)
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
    """Admin statistics (no auth for demo)."""
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
    logging.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG", "False") == "True" else None
        }
    )

############################################
# STARTUP & SHUTDOWN
############################################

@app.on_event("startup")
async def startup_event():
    """Startup event handler."""
    logging.info("Starting GraphRAG backend...")
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Create indexes
    db.users.create_index("email", unique=True)
    db.users.create_index("username", unique=True)
    db.studyspaces.create_index("users")
    db.files.create_index("spaceId")
    db.chats.create_index("spaceId")
    
    logging.info("✅ Startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler."""
    logging.info("Shutting down GraphRAG backend...")
    
    # Close connections
    mongo_client.close()
    if 'driver' in init_graph.__globals__:
        init_graph.__globals__['driver'].close()
    
    logging.info("✅ Shutdown complete")