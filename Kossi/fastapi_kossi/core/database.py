"""
core/database.py — Configuration et gestion de la base de donnees PostgreSQL

Ce module configure la connexion PostgreSQL et fournit les sessions
pour acceder aux donnees de maniere securisee et efficace.

Architecture :
- Engine SQLAlchemy : Connexion a la BD
- SessionLocal : Factory pour creer des sessions
- Base : Classe de base pour tous les modeles
"""

import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator
from dotenv import load_dotenv

# Charger les variables d'environnement au cas où database.py est importé en premier
# (settings.py est également importé pour exécuter sa logique de chargement multi-niveaux)
try:
    import fastapi_kossi.core.settings
except ImportError:
    load_dotenv()

logger = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DE LA BASE DE DONNEES
# ══════════════════════════════════════════════════════════════════════════════

# Chemin vers la BD locale SQLite (fallback)
DATABASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(DATABASE_DIR, "kossi.db")

def check_postgres_available(host, port):
    import socket
    try:
        target_host = '127.0.0.1' if host in ('localhost', '127.0.0.1') else host
        s = socket.create_connection((target_host, int(port)), timeout=0.2)
        s.close()
        return True
    except Exception:
        return False

# Utiliser la même base de données que l'application mère si PostgreSQL est disponible
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    db_name = os.environ.get("DB_NAME", "caeb_db")
    db_user = os.environ.get("DB_USER", "postgres")
    db_password = os.environ.get("DB_PASSWORD", "root")
    db_host = os.environ.get("DB_HOST", "localhost")
    db_port = os.environ.get("DB_PORT", "5432")
    if check_postgres_available(db_host, db_port):
        if db_password:
            DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
        else:
            DATABASE_URL = f"postgresql+psycopg2://{db_user}@{db_host}:{db_port}/{db_name}"
    else:
        DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# ══════════════════════════════════════════════════════════════════════════════
# INITIALISATION SQLALCHEMY
# ══════════════════════════════════════════════════════════════════════════════

# Creer l'engine PostgreSQL avec les options d'optimisation
engine = create_engine(
    DATABASE_URL,
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
    logger.info("Initialisation du schéma de la BD PostgreSQL")
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
