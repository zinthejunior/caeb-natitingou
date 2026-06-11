"""
core/cache.py — Module de cache pour le service Kossi AI

Ce module fournit un systeme de cache en memoire pour optimiser les performances :
- Cache des embeddings : Evite de recalculer les vecteurs pour les memes textes
- Cache des reponses LLM : Evite de rappeler le LLM pour les memes questions

Le cache utilise cachetools avec une strategie TTL (Time To Live) pour expirer
automatiquement les entrees apres un certain temps.

En production, il est recommande de remplacer ce cache en memoire par Redis
pour une meilleure scalabilite et persistance.
"""

import logging
import hashlib
from typing import Any, Optional, Callable, TypeVar, List
from functools import wraps

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS CONDITIONNELS
# ══════════════════════════════════════════════════════════════════════════════

try:
    from cachetools import TTLCache
    CACHETOOLS_AVAILABLE = True
except ImportError:
    CACHETOOLS_AVAILABLE = False
    TTLCache = None

from fastapi_kossi.core.settings import (
    CACHE_ENABLED,
    CACHE_EMBEDDING_TTL_SECONDS,
    CACHE_LLM_TTL_SECONDS,
    CACHE_MAX_SIZE,
)

logger = logging.getLogger(__name__)

# Type generique pour les decorateurs
T = TypeVar("T")


# ══════════════════════════════════════════════════════════════════════════════
# INITIALISATION DES CACHES
# ══════════════════════════════════════════════════════════════════════════════

# Cache pour les embeddings (cle: hash du texte, valeur: vecteur)
# TTL long car les embeddings sont deterministes pour un meme texte
_embedding_cache: Optional["TTLCache"] = None

# Cache pour les reponses LLM (cle: hash des messages, valeur: reponse)
# TTL court car les reponses peuvent varier selon le contexte
_llm_cache: Optional["TTLCache"] = None

# Cache backend generique (non utilise pour l'instant, reserve pour usage futur)
_backend_cache: Optional["TTLCache"] = None

if CACHETOOLS_AVAILABLE and CACHE_ENABLED:
    # Initialiser les caches avec les parametres de configuration
    _embedding_cache = TTLCache(
        maxsize=CACHE_MAX_SIZE,
        ttl=CACHE_EMBEDDING_TTL_SECONDS
    )
    _llm_cache = TTLCache(
        maxsize=CACHE_MAX_SIZE // 2,  # Moins d'entrees car reponses plus volumineuses
        ttl=CACHE_LLM_TTL_SECONDS
    )
    logger.info(
        f"Cache active : embeddings ({CACHE_EMBEDDING_TTL_SECONDS}s TTL), "
        f"LLM ({CACHE_LLM_TTL_SECONDS}s TTL)"
    )
else:
    if CACHE_ENABLED and not CACHETOOLS_AVAILABLE:
        logger.warning("cachetools non installe - cache desactive")
    else:
        logger.info("Cache desactive par configuration")


# ══════════════════════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ══════════════════════════════════════════════════════════════════════════════

def _compute_cache_key(data: Any) -> str:
    """
    Calcule une cle de cache unique pour n'importe quelle donnee.
    
    Utilise SHA256 pour generer un hash deterministe de la representation
    string de la donnee. Cela garantit que les memes donnees produisent
    toujours la meme cle.
    
    Args:
        data: N'importe quelle donnee serialisable en string
        
    Returns:
        str: Hash SHA256 de 16 caracteres (suffisant pour eviter les collisions)
    """
    # Convertir en string de maniere deterministe
    if isinstance(data, (list, tuple)):
        data_str = str(sorted(str(item) for item in data))
    elif isinstance(data, dict):
        data_str = str(sorted(data.items()))
    else:
        data_str = str(data)
    
    # Calculer le hash SHA256
    hash_obj = hashlib.sha256(data_str.encode("utf-8"))
    
    # Retourner les 16 premiers caracteres (64 bits d'entropie)
    return hash_obj.hexdigest()[:16]


# ══════════════════════════════════════════════════════════════════════════════
# CACHE DES EMBEDDINGS
# ══════════════════════════════════════════════════════════════════════════════

def get_cached_embedding(text: str) -> Optional[List[float]]:
    """
    Recupere un embedding depuis le cache s'il existe.
    
    Args:
        text: Le texte dont on cherche l'embedding
        
    Returns:
        Optional[List[float]]: Le vecteur d'embedding ou None si non trouve
    """
    if _embedding_cache is None:
        return None
    
    cache_key = _compute_cache_key(text)
    result = _embedding_cache.get(cache_key)
    
    if result is not None:
        logger.debug(f"Cache HIT pour embedding (key: {cache_key})")
    
    return result


def set_cached_embedding(text: str, embedding: List[float]) -> None:
    """
    Stocke un embedding dans le cache.
    
    Args:
        text: Le texte source de l'embedding
        embedding: Le vecteur d'embedding a stocker
    """
    if _embedding_cache is None:
        return
    
    cache_key = _compute_cache_key(text)
    _embedding_cache[cache_key] = embedding
    logger.debug(f"Cache SET pour embedding (key: {cache_key})")


# ══════════════════════════════════════════════════════════════════════════════
# CACHE DES REPONSES LLM
# ══════════════════════════════════════════════════════════════════════════════

def get_cached_llm_response(messages: List[dict]) -> Optional[str]:
    """
    Recupere une reponse LLM depuis le cache si elle existe.
    
    Le cache est indexe par le contenu des messages (systeme + utilisateur).
    Cela permet de reutiliser les reponses pour des questions identiques.
    
    Args:
        messages: Liste des messages de la conversation
        
    Returns:
        Optional[str]: La reponse en cache ou None si non trouvee
    """
    if _llm_cache is None:
        return None
    
    # Extraire uniquement le contenu pertinent pour la cle de cache
    # On ignore les messages "assistant" pour ne garder que la question
    relevant_content = [
        (m.get("role"), m.get("content", "")[:500])  # Limiter a 500 chars
        for m in messages
        if m.get("role") in ("system", "user")
    ]
    
    cache_key = _compute_cache_key(relevant_content)
    result = _llm_cache.get(cache_key)
    
    if result is not None:
        logger.info(f"Cache HIT pour reponse LLM (key: {cache_key})")
    
    return result


def set_cached_llm_response(messages: List[dict], response: str) -> None:
    """
    Stocke une reponse LLM dans le cache.
    
    Args:
        messages: Liste des messages de la conversation
        response: La reponse generee par le LLM
    """
    if _llm_cache is None:
        return
    
    relevant_content = [
        (m.get("role"), m.get("content", "")[:500])
        for m in messages
        if m.get("role") in ("system", "user")
    ]
    
    cache_key = _compute_cache_key(relevant_content)
    _llm_cache[cache_key] = response
    logger.debug(f"Cache SET pour reponse LLM (key: {cache_key})")



# ══════════════════════════════════════════════════════════════════════════════
# DECORATEURS DE CACHE
# ══════════════════════════════════════════════════════════════════════════════

def cached_embedding(func: Callable[..., T]) -> Callable[..., T]:
    """
    Decorateur pour cacher automatiquement les resultats d'une fonction d'embedding.
    
    Usage:
        @cached_embedding
        async def get_embedding(text: str) -> List[float]:
            ...
    """
    @wraps(func)
    async def wrapper(text: str, *args, **kwargs) -> T:
        # Verifier le cache
        cached = get_cached_embedding(text)
        if cached is not None:
            return cached
        
        # Appeler la fonction originale
        result = await func(text, *args, **kwargs)
        
        # Stocker dans le cache
        if result:
            set_cached_embedding(text, result)
        
        return result
    
    return wrapper


def cached_llm_response(func: Callable[..., T]) -> Callable[..., T]:
    """
    Decorateur pour cacher automatiquement les reponses LLM.
    
    Usage:
        @cached_llm_response
        async def generate_response(messages: List[dict]) -> str:
            ...
    """
    @wraps(func)
    async def wrapper(messages: List[dict], *args, **kwargs) -> T:
        # Verifier le cache
        cached = get_cached_llm_response(messages)
        if cached is not None:
            return cached
        
        # Appeler la fonction originale
        result = await func(messages, *args, **kwargs)
        
        # Stocker dans le cache (seulement les reponses non vides)
        if result and len(result) > 10:
            set_cached_llm_response(messages, result)
        
        return result
    
    return wrapper


# ══════════════════════════════════════════════════════════════════════════════
# STATISTIQUES DU CACHE
# ══════════════════════════════════════════════════════════════════════════════

def get_cache_stats() -> dict:
    """
    Retourne les statistiques d'utilisation des caches.
    
    Returns:
        dict: Statistiques incluant taille actuelle, taille max, TTL
    """
    stats = {
        "cache_enabled": CACHE_ENABLED and CACHETOOLS_AVAILABLE,
        "embedding_cache": None,
        "llm_cache": None,
        "backend_cache": None,
    }
    
    if _embedding_cache is not None:
        stats["embedding_cache"] = {
            "current_size": len(_embedding_cache),
            "max_size": _embedding_cache.maxsize,
            "ttl_seconds": _embedding_cache.ttl,
        }
    
    if _llm_cache is not None:
        stats["llm_cache"] = {
            "current_size": len(_llm_cache),
            "max_size": _llm_cache.maxsize,
            "ttl_seconds": _llm_cache.ttl,
        }
    
    if _backend_cache is not None:
        stats["backend_cache"] = {
            "current_size": len(_backend_cache),
            "max_size": _backend_cache.maxsize,
            "ttl_seconds": _backend_cache.ttl,
        }
    
    return stats


def clear_all_caches() -> None:
    """Vide tous les caches. Utile pour les tests ou en cas de probleme."""
    if _embedding_cache is not None:
        _embedding_cache.clear()
    if _llm_cache is not None:
        _llm_cache.clear()
    if _backend_cache is not None:
        _backend_cache.clear()
    
    logger.info("Tous les caches ont ete vides")
