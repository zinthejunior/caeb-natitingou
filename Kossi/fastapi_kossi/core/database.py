"""
core/database.py — Configuration et gestion de la base de donnees SQLite

Ce module configure la connexion SQLite et fournit les sessions
pour acceder aux donnees de maniere securisee et efficace.

Architecture :
- Engine SQLAlchemy : Connexion a la BD
- SessionLocal : Factory pour creer des sessions
- Base : Classe de base pour tous les modeles
"""

import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DE LA BASE DE DONNEES
# ══════════════════════════════════════════════════════════════════════════════

# Chemin vers la BD SQLite (au niveau du dossier fastapi_kossi)
DATABASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(DATABASE_DIR, "kossi.db")

# URL SQLite
DATABASE_URL = f"sqlite:///{DATABASE_PATH.replace(chr(92), '/')}"  # Echapper les backslashes Windows

# ══════════════════════════════════════════════════════════════════════════════
# INITIALISATION SQLALCHEMY
# ══════════════════════════════════════════════════════════════════════════════

# Creer l'engine SQLite avec options d'optimisation
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specifique
    echo=False,  # Set to True pour debug SQL queries
    pool_pre_ping=True,  # Verifie les connexions avant usage
)

# SessionLocal : Factory pour creer des sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base : Classe de base pour tous les modeles SQLAlchemy
Base = declarative_base()


# ══════════════════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ══════════════════════════════════════════════════════════════════════════════

def get_db() -> Generator[Session, None, None]:
    """
    Dependency FastAPI pour obtenir une session de BD.
    
    Usage:
        @app.get("/endpoint")
        async def endpoint(db: Session = Depends(get_db)):
            # utiliser db
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════════════
# INITIALISATION DE LA BASE DE DONNEES
# ══════════════════════════════════════════════════════════════════════════════

def init_db():
    """
    Initialise la base de donnees en creant toutes les tables.
    
    Cette fonction doit etre appelee au demarrage de l'application.
    """
    logger.info(f"Initialisation de la BD SQLite: {DATABASE_PATH}")
    Base.metadata.create_all(bind=engine)
    logger.info("Schema BD cree avec succes")


def get_session() -> Session:
    """
    Cree et retourne une nouvelle session.
    
    Usage:
        db = get_session()
        try:
            # utiliser db
        finally:
            db.close()
    """
    return SessionLocal()
