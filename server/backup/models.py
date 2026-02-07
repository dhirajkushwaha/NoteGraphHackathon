from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class User(BaseModel):
    email: EmailStr
    username: str
    password_hash: str
    created_at: Optional[datetime] = None

class StudySpace(BaseModel):
    subject: str
    topic: Optional[str] = None
    users: List[str] = []
    created_by: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class File(BaseModel):
    spaceId: str
    path: str
    filename: Optional[str] = None
    type: str
    size: Optional[int] = 0
    uploadedBy: Optional[str] = None
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)

class Chat(BaseModel):
    spaceId: str
    author: str
    authorType: Optional[str] = "user"  # "user" or "ai"
    text: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Question(BaseModel):
    q: str
    a: str

class Quiz(BaseModel):
    spaceId: str
    userId: str
    qA: List[Question] = []
    score: int = 0
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class Post(BaseModel):
    userId: str
    title: str
    content: str
    files: List[str] = []
    upvotes: int = 0
    downvotes: int = 0
    comments: List[Dict[str, Any]] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)