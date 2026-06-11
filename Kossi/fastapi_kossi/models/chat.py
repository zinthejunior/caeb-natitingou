"""
models/chat.py — Modèles SQLAlchemy pour l'historique de conversation et les messages

Ce module définit les tables SQLite pour stocker les sessions de chat et les
messages échangés entre l'utilisateur et Kossi.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from fastapi_kossi.core.database import Base


class Conversation(Base):
    """Représente une session de chat avec Kossi."""

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(128), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)

    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.timestamp",
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title or "Conversation Kossi",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "metadata": self.metadata_json,
        }


class ChatMessage(Base):
    """Représente un message envoyé ou reçu dans une conversation."""

    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    message_id = Column(String(128), nullable=True, unique=True)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column("metadata", JSON, nullable=True)
    feedback = Column(String(20), nullable=True)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "message_id": self.message_id,
            "role": self.role,
            "content": self.content,
            "metadata": self.metadata_json,
            "feedback": self.feedback,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
