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

    @staticmethod
    def sync_with_django() -> None:
        """
        Synchronise les livres, clubs et evenements de Django vers la BD Kossi.
        Cette routine est appelee au demarrage pour s'assurer que Kossi est a jour.
        """
        try:
            import httpx
            import hashlib
            from fastapi_kossi.core.settings import BACKEND_API_URL
            
            logger.info("Debut de la synchronisation avec Django API...")
            db = get_session()
            
            def get_stable_id(django_id: Any) -> int:
                try:
                    return int(django_id)
                except (ValueError, TypeError):
                    # Generer un entier stable unique a partir du string ID
                    h = hashlib.md5(str(django_id).encode("utf-8")).hexdigest()
                    return int(h, 16) % 100000000

            # 1. Synchronisation des livres
            try:
                url = f"{BACKEND_API_URL.rstrip('/')}/livres/?page_size=1000"
                logger.info(f"Synchronisation des livres depuis {url}...")
                with httpx.Client(timeout=15.0) as client:
                    r = client.get(url)
                    if r.status_code == 200:
                        data = r.json()
                        results = data.get("results", []) if isinstance(data, dict) else data
                        for b in results:
                            django_id = b.get("id")
                            if django_id is None:
                                continue
                            book_id = get_stable_id(django_id)
                            
                            existing = db.query(Book).filter(Book.id == book_id).first()
                            
                            mots_cles_str = b.get("mots_cles") or ""
                            mots_cles = [w.strip() for w in mots_cles_str.split(",") if w.strip()] if isinstance(mots_cles_str, str) else (mots_cles_str or [])
                            
                            book_fields = {
                                "titre": b.get("titre") or "Titre inconnu",
                                "auteur": b.get("auteur") or "Auteur inconnu",
                                "genre": b.get("genre") or "Général",
                                "sous_genre": b.get("sous_genre") or "",
                                "resume": b.get("resume") or "",
                                "description": b.get("description") or "",
                                "mots_cles": mots_cles,
                                "isbn": b.get("isbn") or None,
                                "date_publication": str(b.get("annee") or ""),
                                "editeur": b.get("editeur") or "",
                                "disponible": b.get("exemplaires", 1) > 0,
                                "nombre_exemplaires": b.get("exemplaires", 1),
                                "localisation": b.get("localisation") or b.get("cote") or "",
                            }
                            
                            if existing:
                                # Mettre a jour les champs de base sans toucher a l'embedding s'il existe
                                for k, v in book_fields.items():
                                    setattr(existing, k, v)
                            else:
                                book_fields["id"] = book_id
                                new_book = Book(**book_fields)
                                db.add(new_book)
                        db.commit()
                        logger.info(f"Synchronisation livres reussie : {len(results)} livres traites.")
                    else:
                        logger.error(f"Erreur sync livres (status={r.status_code}): {r.text}")
            except Exception as e:
                logger.error(f"Erreur lors de la sync des livres: {e}", exc_info=True)

            # 2. Synchronisation des clubs
            try:
                url = f"{BACKEND_API_URL.rstrip('/')}/clubs/?page_size=100"
                logger.info(f"Synchronisation des clubs depuis {url}...")
                with httpx.Client(timeout=15.0) as client:
                    r = client.get(url)
                    if r.status_code == 200:
                        data = r.json()
                        results = data.get("results", []) if isinstance(data, dict) else data
                        for c in results:
                            django_id = c.get("id")
                            if django_id is None:
                                continue
                            club_id = get_stable_id(django_id)
                            
                            existing = db.query(Club).filter(Club.id == club_id).first()
                            
                            club_fields = {
                                "nom": c.get("name") or "Club sans nom",
                                "name": c.get("name") or "Club sans nom",
                                "description": c.get("description") or "",
                                "responsable": c.get("manager_name") or "",
                                "horaire": "Horaire non précisé", # Fallback
                                "localisation": "CAEB Natitingou",
                                "actif": True,
                            }
                            
                            if existing:
                                for k, v in club_fields.items():
                                    setattr(existing, k, v)
                            else:
                                club_fields["id"] = club_id
                                new_club = Club(**club_fields)
                                db.add(new_club)
                        db.commit()
                        logger.info(f"Synchronisation clubs reussie : {len(results)} clubs traites.")
                    else:
                        logger.error(f"Erreur sync clubs (status={r.status_code}): {r.text}")
            except Exception as e:
                logger.error(f"Erreur lors de la sync des clubs: {e}", exc_info=True)

            # 3. Synchronisation des evenements
            try:
                url = f"{BACKEND_API_URL.rstrip('/')}/evenements/?page_size=100"
                logger.info(f"Synchronisation des evenements depuis {url}...")
                with httpx.Client(timeout=15.0) as client:
                    r = client.get(url)
                    if r.status_code == 200:
                        data = r.json()
                        results = data.get("results", []) if isinstance(data, dict) else data
                        for ev in results:
                            django_id = ev.get("id")
                            if django_id is None:
                                continue
                            event_id = get_stable_id(django_id)
                            
                            existing = db.query(Event).filter(Event.id == event_id).first()
                            
                            event_fields = {
                                "titre": ev.get("title") or "Événement sans titre",
                                "title": ev.get("title") or "Événement sans titre",
                                "description": ev.get("description") or "",
                                "date_debut": str(ev.get("date") or ""),
                                "date_fin": str(ev.get("date") or ""),
                                "horaire": ev.get("time") or "",
                                "localisation": ev.get("location") or "CAEB Natitingou",
                                "categorie": ev.get("type_event") or "Général",
                            }
                            
                            if existing:
                                for k, v in event_fields.items():
                                    setattr(existing, k, v)
                            else:
                                event_fields["id"] = event_id
                                new_event = Event(**event_fields)
                                db.add(new_event)
                        db.commit()
                        logger.info(f"Synchronisation evenements reussie : {len(results)} evenements traites.")
                    else:
                        logger.error(f"Erreur sync evenements (status={r.status_code}): {r.text}")
            except Exception as e:
                logger.error(f"Erreur lors de la sync des evenements: {e}", exc_info=True)

            db.close()
            logger.info("Synchronisation terminee avec succes!")
        except Exception as e:
            logger.error(f"Erreur globale lors de la synchronisation Django-Kossi: {e}", exc_info=True)
