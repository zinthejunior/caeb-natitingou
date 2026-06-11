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
from typing import List
from dotenv import load_dotenv

# ══════════════════════════════════════════════════════════════════════════════
# CHARGEMENT DES VARIABLES D'ENVIRONNEMENT
# ══════════════════════════════════════════════════════════════════════════════
# Charge les variables depuis le fichier .env a la racine du projet
load_dotenv()


# ══════════════════════════════════════════════════════════════════════════════
# URLS DES SERVICES EXTERNES
# ══════════════════════════════════════════════════════════════════════════════
# NOTE : Kossi utilise maintenant une BD SQLite locale.
# Les donnees du catalogue sont accessibles via la BD, pas un backend externe.

# DATABASE_URL est configure dans core/database.py


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
# En production, restreignez aux domaines de votre frontend uniquement
_cors_raw: str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://localhost:8000"
)
CORS_ORIGINS: List[str] = [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES MODELES LLM (OpenRouter)
# ══════════════════════════════════════════════════════════════════════════════

# Liste des modeles gratuits OpenRouter avec leur ordre de fallback
# Le service essaiera chaque modele dans l'ordre jusqu'a obtenir une reponse
# Modeles gratuits disponibles sur : https://openrouter.ai/models?q=free
OPENROUTER_MODELS: List[str] = [
    # ── Tier 1 : Modèles de raisonnement avancé ──────────────────────────────
    "deepseek/deepseek-r1:free",                         # DeepSeek R1 - Raisonnement CoT de niveau o1, excellent en français
    "deepseek/deepseek-r1-distill-llama-70b:free",       # R1 distillé 70B - Rapide et puissant
    "qwen/qwen3-235b-a22b:free",                         # Qwen3 235B MoE - Meilleur modèle open-source actuel
    "google/gemma-4-31b-it:free",                        # Gemma 4 31B - Google, multilingue, très bon en français

    # ── Tier 2 : Modèles 70B+ haute performance ───────────────────────────────
    "meta-llama/llama-3.3-70b-instruct:free",            # Llama 3.3 70B - Référence Meta, excellent en français
    "deepseek/deepseek-chat-v3-0324:free",               # DeepSeek V3 - Très performant, 671B MoE
    "qwen/qwen3-30b-a3b:free",                           # Qwen3 30B MoE - Rapide et efficace
    "nousresearch/hermes-3-llama-3.1-405b:free",         # Hermes 3 405B - Très grand modèle, instruction fine-tuné
    "google/gemini-2.0-flash-exp:free",                  # Gemini 2.0 Flash Exp - Google, multimodal, très rapide

    # ── Tier 3 : Modèles mid-size fiables ────────────────────────────────────
    "mistralai/mistral-small-3.1-24b-instruct:free",     # Mistral Small 3.1 24B - Européen, multilingue natif
    "microsoft/phi-4:free",                              # Phi-4 14B - Microsoft, efficace & rapide
    "qwen/qwen3-8b:free",                                # Qwen3 8B - Léger mais performant

    # ── Tier 4 : Fallbacks rapides ────────────────────────────────────────────
    "meta-llama/llama-3.1-8b-instruct:free",             # Llama 3.1 8B - Modèle de référence compact
    "mistralai/mistral-7b-instruct:free",                # Mistral 7B - Classique robuste
    "meta-llama/llama-3.2-3b-instruct:free",             # Llama 3.2 3B - Ultra-rapide pour fallback final
]

# Temperature par defaut pour la generation de texte (0.0 = deterministe, 1.0 = creatif)
DEFAULT_LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))

# Timeout en secondes pour les appels LLM (les modeles gratuits peuvent etre lents)
LLM_TIMEOUT_SECONDS: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "90"))


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES EMBEDDINGS
# ══════════════════════════════════════════════════════════════════════════════

# Fournisseur d'embeddings : "huggingface" ou "fallback" (hash deterministe)
EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "huggingface")

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

# Activer/desactiver l'authentification API (True en production)
API_AUTH_ENABLED: bool = os.getenv("API_AUTH_ENABLED", "false").lower() == "true"

# Cle secrete pour signer les tokens JWT (IMPORTANT: changez en production!)
# Generez une cle avec : openssl rand -hex 32
API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "kossi-dev-secret-key-change-in-production")

# Algorithme de signature JWT
API_JWT_ALGORITHM: str = "HS256"

# Duree de validite des tokens en minutes
API_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("API_TOKEN_EXPIRE_MINUTES", "60"))

# Liste des cles API autorisees (separees par des virgules)
# Format : "key1,key2,key3"
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
