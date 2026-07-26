"""
core/settings.py — Configuration centralisee du service Kossi AI

Ce module charge toutes les variables d'environnement et parametres de configuration
necessaires au fonctionnement du service multi-agents. Il inclut :
- URLs et cles API externes (OpenRouter, HuggingFace, Bing, SerpAPI)
- Configuration CORS pour les origines autorisees
- Liste des modeles LLM avec ordre de fallback
- Parametres de cache, rate limiting et securite
- Limites metier (nombre de livres suggeres, taille historique, etc.)
"""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# ══════════════════════════════════════════════════════════════════════════════
# CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
# ══════════════════════════════════════════════════════════════════════════════
# Charge les variables depuis les fichiers .env locaux et le fichier backend/.env de l'application mère.
BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = BASE_DIR.parent
ENV_FILES = [
    BASE_DIR / ".env",
    WORKSPACE_ROOT / "backend" / ".env",
    WORKSPACE_ROOT / ".env",
]
for env_path in ENV_FILES:
    if env_path.is_file():
        load_dotenv(env_path, override=False)
# Fallback par défaut si le fichier .env est trouvé dans le dossier de travail courant.
load_dotenv(override=False)


# ══════════════════════════════════════════════════════════════════════════════
# URLS DES SERVICES EXTERNES
# ══════════════════════════════════════════════════════════════════════════════
# NOTE : Kossi utilise la base de données PostgreSQL configurée.
# Les donnees du catalogue sont accessibles via la BD.

# DATABASE_URL est configure dans core/database.py

BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:8080/api")


# ══════════════════════════════════════════════════════════════════════════════
# CLES API EXTERNES
# ══════════════════════════════════════════════════════════════════════════════

# Cle API OpenRouter pour acceder aux modeles LLM gratuits et payants
# Obtenez une cle sur : https://openrouter.ai/keys
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

# Cle API HuggingFace pour les embeddings semantiques
# Obtenez une cle sur : https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")

# Cle API SerpAPI pour la recherche Google (optionnel)
# Obtenez une cle sur : https://serpapi.com/
SERPAPI_API_KEY: str = os.getenv("SERPAPI_API_KEY", "")

# Cle API Bing Search pour la recherche web (optionnel)
# Obtenez une cle sur : https://portal.azure.com/
BING_SEARCH_API_KEY: str = os.getenv("BING_SEARCH_API_KEY", "")


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION CORS (Cross-Origin Resource Sharing)
# ══════════════════════════════════════════════════════════════════════════════

# Liste des origines autorisees a appeler l'API (separees par des virgules)
# En production, restreignez aux domaines de votre frontend uniquement.
# Si aucune origine n'est definie, on ne permet que l'localhost local pour eviter
# d'exposer l'API de maniere non controlee.
_cors_raw: str = os.getenv("CORS_ORIGINS", "")
if _cors_raw.strip():
    CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]
else:
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES MODELES LLM (OpenRouter)
# ══════════════════════════════════════════════════════════════════════════════

# Liste des modeles gratuits OpenRouter avec leur ordre de fallback
# Le service essaiera chaque modele dans l'ordre jusqu'a obtenir une reponse
# Modeles gratuits EXCELLENTS disponibles sur : https://openrouter.ai/models?q=free
OPENROUTER_MODELS: List[str] = [
    # ── Tier 1 : Routeurs automatiques (fiables et rapides) ──────────────────
    "openrouter/auto",                                   # Auto-sélection du meilleur modèle gratuit disponible
    "openrouter/free",                                   # Fallback: routeur vers modèles gratuits disponibles
]

# Temperature par defaut pour la generation de texte (0.0 = deterministe, 1.0 = creatif)
DEFAULT_LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))

# Timeout en secondes pour les appels LLM (les modeles gratuits peuvent etre lents)
LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "90"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES EMBEDDINGS
# ══════════════════════════════════════════════════════════════════════════════

# Fournisseur d'embeddings : "huggingface" ou "fallback" (hash deterministe)
# En local/dev, utilisez "fallback" pour éviter les appels externes à HuggingFace
EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "fallback")

# Modele d'embeddings HuggingFace
# paraphrase-multilingual-MiniLM-L12-v2 : 384 dimensions, bon support multilingue
EMBEDDING_MODEL: str = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

# Dimension des vecteurs d'embedding (doit correspondre au modele)
EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))


# ══════════════════════════════════════════════════════════════════════════════
# LIMITES METIER
# ══════════════════════════════════════════════════════════════════════════════

# Nombre maximum de livres a suggerer dans les recommandations
MAX_SUGGESTED_BOOKS: int = int(os.getenv("MAX_SUGGESTED_BOOKS", "5"))

# Nombre maximum de messages dans l'historique de conversation
MAX_CHAT_HISTORY: int = int(os.getenv("MAX_CHAT_HISTORY", "50"))

# Nombre maximum de resultats de recherche web
MAX_WEB_RESULTS: int = int(os.getenv("MAX_WEB_RESULTS", "5"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION RATE LIMITING (Protection contre les abus)
# ══════════════════════════════════════════════════════════════════════════════

# Activer/desactiver le rate limiting (True en production)
RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"

# Limite de requetes par minute pour l'endpoint /chat
RATE_LIMIT_CHAT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_CHAT_PER_MINUTE", "30"))

# Limite de requetes par minute pour l'endpoint /vectorize
RATE_LIMIT_VECTORIZE_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_VECTORIZE_PER_MINUTE", "60"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION AUTHENTIFICATION API
# ══════════════════════════════════════════════════════════════════════════════

# Activer/desactiver l'authentification API.
# Par defaut, l'authentification est activee pour eviter d'exposer l'API sans protection.
API_AUTH_ENABLED_VALUE = os.getenv("API_AUTH_ENABLED", "true")
API_AUTH_ENABLED: bool = API_AUTH_ENABLED_VALUE.lower() == "true"

# Cle secrete pour signer les tokens JWT.
# Si aucune valeur n'est fournie, l'API refuse l'authentification au lieu de
# fonctionner avec un secret codé en dur.
API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "").strip()

# Algorithme de signature JWT
API_JWT_ALGORITHM: str = "HS256"

# Duree de validite des tokens en minutes
API_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("API_TOKEN_EXPIRE_MINUTES", "60"))

# Liste des cles API autorisees (separees par des virgules)
# Format : "key1,key2,key3"
# Si aucune cle n'est definie et que l'authentification est activee, l'API ne
# sera accessible qu'avec des tokens JWT ou une configuration explicite.
_api_keys_raw: str = os.getenv("API_KEYS", "")
AUTHORIZED_API_KEYS: List[str] = [key.strip() for key in _api_keys_raw.split(",") if key.strip()]


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION CACHE
# ══════════════════════════════════════════════════════════════════════════════

# Activer/desactiver le cache des embeddings et reponses
CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").lower() == "true"

# Duree de vie du cache des embeddings en secondes (1 heure par defaut)
CACHE_EMBEDDING_TTL_SECONDS: int = int(os.getenv("CACHE_EMBEDDING_TTL", "3600"))

# Duree de vie du cache des reponses LLM en secondes (5 minutes par defaut)
CACHE_LLM_TTL_SECONDS: int = int(os.getenv("CACHE_LLM_TTL", "300"))

# Taille maximale du cache (nombre d'entrees)
CACHE_MAX_SIZE: int = int(os.getenv("CACHE_MAX_SIZE", "1000"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION MONITORING
# ══════════════════════════════════════════════════════════════════════════════

# Activer/desactiver les metriques Prometheus
METRICS_ENABLED: bool = os.getenv("METRICS_ENABLED", "true").lower() == "true"

# Activer/desactiver le logging structure JSON
STRUCTURED_LOGGING: bool = os.getenv("STRUCTURED_LOGGING", "false").lower() == "true"

# Niveau de log (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


# ══════════════════════════════════════════════════════════════════════════════
# PROMPT SYSTEME MAITRE
# ══════════════════════════════════════════════════════════════════════════════

# Chemin vers le fichier contenant le prompt systeme de Kossi
PROMPT_FILE_PATH: str = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Prompt_Systems.txt"
)

# Chargement du prompt systeme depuis le fichier
try:
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as f:
        FILE_SYSTEM_PROMPT: str = f.read().strip()
except FileNotFoundError:
    # Prompt de secours si le fichier n'est pas trouve
    FILE_SYSTEM_PROMPT: str = (
        "Tu es Kossi, l'assistant intelligent officiel et bibliothecaire virtuel "
        "de la Bibliotheque CAEB de Natitingou, au Benin. Tu aides les utilisateurs "
        "a trouver des livres, decouvrir des auteurs et obtenir des recommandations "
        "personnalisees. Ton ton est amical, professionnel et pedagogique."
    )
except Exception as e:
    # En cas d'erreur de lecture, utiliser le prompt de secours
    FILE_SYSTEM_PROMPT: str = (
        "Tu es Kossi, l'assistant intelligent officiel et bibliothecaire virtuel "
        "de la Bibliotheque CAEB de Natitingou, au Benin."
    )


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION ENVIRONNEMENT
# ══════════════════════════════════════════════════════════════════════════════

# Environnement d'execution : "development", "staging", "production"
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

# Mode debug (active les logs detailles et la documentation interactive)
DEBUG_MODE: bool = ENVIRONMENT == "development" or os.getenv("DEBUG", "false").lower() == "true"
