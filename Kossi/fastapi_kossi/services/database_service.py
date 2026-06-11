"""
services/database_service.py — Service d'acces a la base de donnees SQLite

Ce module fournit les fonctions pour recuperer les donnees depuis SQLite
de maniere simple et asynchrone.
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from fastapi_kossi.core.database import get_session
from fastapi_kossi.models.book import Book, Club, Event
from fastapi_kossi.models.chat import Conversation, ChatMessage

logger = logging.getLogger(__name__)


class DatabaseService:
    """Service centralise pour acceder a la BD SQLite."""

    @staticmethod
    def get_all_books() -> List[Dict[str, Any]]:
        """
        Recupere tous les livres du catalogue.
        
        Returns:
            Liste de dictionnaires representant les livres
        """
        try:
            db = get_session()
            books = db.query(Book).all()
            result = [book.to_dict() for book in books]
            db.close()
            logger.info(f"Catalogue charge: {len(result)} livres")
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des livres: {e}")
            return []

    @staticmethod
    def get_books_by_genre(genre: str) -> List[Dict[str, Any]]:
        """
        Recupere les livres d'un genre specifique.
        
        Args:
            genre: Genre a rechercher
            
        Returns:
            Liste de livres correspondants
        """
        try:
            db = get_session()
            books = db.query(Book).filter(
                (Book.genre == genre) | (Book.sous_genre == genre)
            ).all()
            result = [book.to_dict() for book in books]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recherche par genre: {e}")
            return []

    @staticmethod
    def get_books_by_author(author: str) -> List[Dict[str, Any]]:
        """
        Recupere les livres d'un auteur.
        
        Args:
            author: Nom de l'auteur
            
        Returns:
            Liste de livres de cet auteur
        """
        try:
            db = get_session()
            books = db.query(Book).filter(
                Book.auteur.ilike(f"%{author}%")
            ).all()
            result = [book.to_dict() for book in books]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recherche par auteur: {e}")
            return []

    @staticmethod
    def get_available_books() -> List[Dict[str, Any]]:
        """
        Recupere les livres disponibles.
        
        Returns:
            Liste de livres disponibles
        """
        try:
            db = get_session()
            books = db.query(Book).filter(Book.disponible == True).all()
            result = [book.to_dict() for book in books]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des livres disponibles: {e}")
            return []

    @staticmethod
    def search_books(query: str) -> List[Dict[str, Any]]:
        """
        Recherche les livres par titre, auteur ou resume.
        
        Args:
            query: Terme de recherche
            
        Returns:
            Liste de livres correspondants
        """
        try:
            db = get_session()
            search_term = f"%{query}%"
            books = db.query(Book).filter(
                (Book.titre.ilike(search_term)) |
                (Book.auteur.ilike(search_term)) |
                (Book.resume.ilike(search_term))
            ).all()
            result = [book.to_dict() for book in books]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recherche: {e}")
            return []

    @staticmethod
    def add_book(book_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Ajoute un livre a la BD.
        
        Args:
            book_data: Dictionnaire avec les donnees du livre
            
        Returns:
            Dictionnaire du livre ajoute, ou None en cas d'erreur
        """
        try:
            db = get_session()
            book = Book(**book_data)
            db.add(book)
            db.commit()
            db.refresh(book)
            result = book.to_dict()
            db.close()
            logger.info(f"Livre ajoute: {book.titre}")
            return result
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout d'un livre: {e}")
            return None

    @staticmethod
    def update_book(book_id: int, book_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Met a jour les donnees d'un livre.
        
        Args:
            book_id: ID du livre
            book_data: Nouvelles donnees
            
        Returns:
            Dictionnaire du livre mis a jour, ou None
        """
        try:
            db = get_session()
            book = db.query(Book).filter(Book.id == book_id).first()
            if not book:
                return None
            for key, value in book_data.items():
                setattr(book, key, value)
            db.commit()
            db.refresh(book)
            result = book.to_dict()
            db.close()
            logger.info(f"Livre mis a jour: {book.titre}")
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la mise a jour: {e}")
            return None

    @staticmethod
    def get_or_create_conversation(session_id: str, title: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Recupere ou cree une conversation pour l'ID de session fourni."""
        try:
            db = get_session()
            conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
            if not conversation:
                conversation = Conversation(session_id=session_id, title=title or "Conversation Kossi")
                db.add(conversation)
                db.commit()
                db.refresh(conversation)
            elif title and not conversation.title:
                conversation.title = title
                db.commit()
                db.refresh(conversation)
            result = conversation.to_dict()
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la creation de la conversation: {e}")
            return None

    @staticmethod
    def get_conversation(session_id: str) -> Optional[Dict[str, Any]]:
        """Recupere une conversation et ses messages par session_id."""
        try:
            db = get_session()
            conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
            if not conversation:
                db.close()
                return None
            result = conversation.to_dict()
            result["messages"] = [message.to_dict() for message in conversation.messages]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation de la conversation: {e}")
            return None

    @staticmethod
    def get_recent_conversations(limit: int = 20) -> List[Dict[str, Any]]:
        """Recupere les conversations recemment mises a jour."""
        try:
            db = get_session()
            conversations = (
                db.query(Conversation)
                .order_by(Conversation.updated_at.desc())
                .limit(limit)
                .all()
            )
            result = [conversation.to_dict() for conversation in conversations]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des conversations: {e}")
            return []

    @staticmethod
    def delete_conversation(session_id: str) -> bool:
        """Supprime une conversation et ses messages."""
        try:
            db = get_session()
            conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
            if not conversation:
                db.close()
                return False
            db.delete(conversation)
            db.commit()
            db.close()
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de la conversation: {e}")
            return False

    @staticmethod
    def add_chat_message(
        session_id: str,
        role: str,
        content: str,
        message_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        feedback: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Ajoute un message à une conversation existante ou nouvelle."""
        try:
            db = get_session()
            conversation = db.query(Conversation).filter(Conversation.session_id == session_id).first()
            if not conversation:
                conversation = Conversation(session_id=session_id, title=None)
                db.add(conversation)
                db.commit()
                db.refresh(conversation)

            chat_message = ChatMessage(
                conversation_id=conversation.id,
                message_id=message_id,
                role=role,
                content=content,
                metadata_json=metadata,
                feedback=feedback,
            )
            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)
            conversation.updated_at = func.now()
            db.commit()
            result = chat_message.to_dict()
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de l'ajout du message: {e}")
            return None

    @staticmethod
    def get_all_clubs() -> List[Dict[str, Any]]:
        """Recupere tous les clubs."""
        try:
            db = get_session()
            clubs = db.query(Club).all()
            result = [club.to_dict() for club in clubs]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des clubs: {e}")
            return []

    @staticmethod
    def get_all_events() -> List[Dict[str, Any]]:
        """Recupere tous les evenements."""
        try:
            db = get_session()
            events = db.query(Event).all()
            result = [event.to_dict() for event in events]
            db.close()
            return result
        except Exception as e:
            logger.error(f"Erreur lors de la recuperation des evenements: {e}")
            return []
