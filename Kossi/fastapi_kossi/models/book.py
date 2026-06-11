"""
models/book.py — Modeles SQLAlchemy pour la base de donnees

Ce module defnit la structure des donnees stockees dans SQLite,
notamment les livres du catalogue.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, JSON
from sqlalchemy.sql import func
from fastapi_kossi.core.database import Base
from typing import Optional, List


class Book(Base):
    """
    Modele representant un livre du catalogue CAEB.
    
    Attributes:
        id : Identifiant unique du livre
        titre : Titre du livre
        auteur : Nom de l'auteur
        genre : Genre principal (roman, sciences, histoire, etc.)
        sous_genre : Sous-categorie optionnelle
        resume : Resume ou description du contenu
        description : Description detaillee
        mots_cles : Liste de mots-cles pour la recherche
        isbn : Code ISBN (optionnel)
        date_publication : Date de publication
        editeur : Nom de l'editeur
        disponible : Booleen indiquant la disponibilite
        nombre_exemplaires : Nombre de copies en stock
        localisation : Emplacement physique dans la bibliotheque
        embedding : Vecteur d'embedding pour la recherche semantique (JSON)
        date_creation : Date d'ajout en BD
        date_modification : Date de derniere mise a jour
    """
    __tablename__ = "livres"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False, index=True)
    auteur = Column(String(255), nullable=False, index=True)
    genre = Column(String(100), nullable=True, index=True)
    sous_genre = Column(String(100), nullable=True)
    resume = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    mots_cles = Column(JSON, nullable=True)  # Liste de mots-cles
    isbn = Column(String(20), nullable=True, unique=True)
    date_publication = Column(String(50), nullable=True)
    editeur = Column(String(255), nullable=True)
    disponible = Column(Boolean, default=True, index=True)
    nombre_exemplaires = Column(Integer, default=1)
    localisation = Column(String(255), nullable=True)
    embedding = Column(JSON, nullable=True)  # Vecteur d'embedding pour RAG
    date_creation = Column(DateTime, server_default=func.now())
    date_modification = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        """Convertit le modele en dictionnaire pour RAG."""
        return {
            "id": self.id,
            "titre": self.titre,
            "title": self.titre,  # Alias pour compatibilite
            "auteur": self.auteur,
            "author": self.auteur,  # Alias
            "genre": self.genre,
            "sous_genre": self.sous_genre,
            "resume": self.resume,
            "description": self.description,
            "mots_cles": self.mots_cles or [],
            "isbn": self.isbn,
            "date_publication": self.date_publication,
            "editeur": self.editeur,
            "disponible": self.disponible,
            "nombre_exemplaires": self.nombre_exemplaires,
            "localisation": self.localisation,
        }


class Club(Base):
    """
    Modele representant un club ou activite de la bibliotheque.
    """
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=True)  # Alias anglais
    description = Column(Text, nullable=True)
    responsable = Column(String(255), nullable=True)
    horaire = Column(String(500), nullable=True)
    localisation = Column(String(255), nullable=True)
    actif = Column(Boolean, default=True)
    date_creation = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nom": self.nom,
            "name": self.name or self.nom,
            "description": self.description,
            "responsable": self.responsable,
            "horaire": self.horaire,
            "localisation": self.localisation,
            "actif": self.actif,
        }


class Event(Base):
    """
    Modele representant un evenement de la bibliotheque.
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String(255), nullable=False)
    title = Column(String(255), nullable=True)  # Alias
    name = Column(String(255), nullable=True)   # Alias
    description = Column(Text, nullable=True)
    date_debut = Column(String(50), nullable=True)
    date_fin = Column(String(50), nullable=True)
    horaire = Column(String(255), nullable=True)
    localisation = Column(String(255), nullable=True)
    categorie = Column(String(100), nullable=True)
    date_creation = Column(DateTime, server_default=func.now())

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "titre": self.titre,
            "title": self.title or self.titre,
            "name": self.name or self.titre,
            "description": self.description,
            "date_debut": self.date_debut,
            "date_fin": self.date_fin,
            "horaire": self.horaire,
            "localisation": self.localisation,
            "categorie": self.categorie,
        }
