from pydantic import BaseModel
from typing import Any, Dict, List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str
    files: Optional[List[str]] = []

class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    messages: List[ChatMessage]
    settings: Optional[Dict[str, Any]] = {}

class ChatResponse(BaseModel):
    response: str
    suggested_books: Optional[List[str]] = []
    sources: Optional[List[Dict[str, str]]] = []

class VectorizeRequest(BaseModel):
    book_id: str
    text_content: str

class VectorizeResponse(BaseModel):
    status: str
    book_id: str
    vector_size: int
    embedding: Optional[List[float]] = None
