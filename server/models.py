from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

class User(BaseModel):
    """User model for authentication."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password_hash: str
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('username')
    def validate_username(cls, v):
        """Validate username format."""
        if not v.isalnum() and '_' not in v:
            raise ValueError('Username must be alphanumeric or contain underscores')
        return v.lower()

class StudySpace(BaseModel):
    """Study space model."""
    subject: str = Field(..., min_length=1, max_length=200)
    topic: Optional[str] = Field(None, max_length=200)
    users: List[str] = []
    created_by: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('subject')
    def validate_subject(cls, v):
        """Validate subject is not empty."""
        if not v.strip():
            raise ValueError('Subject cannot be empty')
        return v.strip()

class File(BaseModel):
    """File model for uploaded documents."""
    spaceId: str
    path: str
    filename: Optional[str] = None
    type: str = Field(default="application/octet-stream")
    size: Optional[int] = Field(default=0, ge=0)
    uploadedBy: Optional[str] = None
    uploadedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('path')
    def validate_path(cls, v):
        """Validate file path is not empty."""
        if not v.strip():
            raise ValueError('File path cannot be empty')
        return v.strip()

class Chat(BaseModel):
    """Chat message model."""
    spaceId: str
    author: str
    authorType: Optional[str] = Field(default="user")
    text: str = Field(..., min_length=1)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('authorType')
    def validate_author_type(cls, v):
        """Validate author type is either 'user' or 'ai'."""
        if v not in ["user", "ai"]:
            raise ValueError("authorType must be 'user' or 'ai'")
        return v

    @field_validator('text')
    def validate_text(cls, v):
        """Validate text is not empty or whitespace only."""
        if not v.strip():
            raise ValueError('Text cannot be empty')
        return v.strip()

class Question(BaseModel):
    """Question-answer pair for quizzes."""
    q: str = Field(..., min_length=1)
    a: str = Field(..., min_length=1)

class Quiz(BaseModel):
    """Quiz model."""
    spaceId: str
    userId: str
    qA: List[Question] = []
    score: int = Field(default=0, ge=0)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))




    
# Add these to your models.py or create new Pydantic models in main.py



class PostGroup(BaseModel):
    """Group for organizing posts (like discussion rooms)."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = Field(default=True)
    created_by: Optional[str] = None
    members: List[str] = []  # User IDs
    moderators: List[str] = []  # User IDs
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('name')
    def validate_name(cls, v):
        """Validate group name."""
        if not v.strip():
            raise ValueError('Group name cannot be empty')
        return v.strip()


# Update the existing Post model to include group reference
class Post(BaseModel):
    """Study group post model."""
    groupId: str  # Reference to PostGroup
    userId: str
    title: str = Field(..., min_length=1, max_length=300)
    content: str = Field(..., min_length=1)
    files: List[str] = []
    upvotes: int = Field(default=0, ge=0)
    downvotes: int = Field(default=0, ge=0)
    comments: List[Dict[str, Any]] = []
    tags: List[str] = Field(default_factory=list)
    is_pinned: bool = Field(default=False)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('title')
    def validate_title(cls, v):
        """Validate post title."""
        if not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()

    @field_validator('content')
    def validate_content(cls, v):
        """Validate post content."""
        if not v.strip():
            raise ValueError('Content cannot be empty')
        return v.strip()


class Comment(BaseModel):
    """Comment on a post."""
    postId: str
    userId: str
    content: str = Field(..., min_length=1)
    parentCommentId: Optional[str] = None  # For nested comments
    upvotes: int = Field(default=0, ge=0)
    downvotes: int = Field(default=0, ge=0)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('content')
    def validate_content(cls, v):
        """Validate comment content."""
        if not v.strip():
            raise ValueError('Comment cannot be empty')
        return v.strip()