"""
main.py — Point d'entree principal du service FastAPI Kossi AI (v2.1)

Ce fichier configure et lance le service FastAPI avec :
- CORS pour les requetes cross-origin
- Rate limiting pour proteger contre les abus
- Metriques Prometheus pour le monitoring
- Logging structure pour l'observabilite
- Routes de sante et de debug 

L'application expose les endpoints suivants :
- POST /chat          : Dialogue avec Kossi (assistant IA)
- POST /chat/stream   : Dialogue avec streaming SSE
- POST /vectorize     : Generation d'embeddings pour les livres
- GET /               : Verification de sante du service
- GET /health         : Sante detaillee avec metriques
- GET /metrics        : Metriques Prometheus (si active)
"""

import logging
import sys
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DU PATH
# Assure que le dossier parent est dans sys.path pour les imports relatifs
# ══════════════════════════════════════════════════════════════════════════════
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS INTERNES
# ══════════════════════════════════════════════════════════════════════════════
from fastapi_kossi.core.settings import (
    CORS_ORIGINS,
    ENVIRONMENT,
    DEBUG_MODE,
    LOG_LEVEL,
    METRICS_ENABLED,
    RATE_LIMIT_ENABLED,
)
from fastapi_kossi.core.security import limiter, SLOWAPI_AVAILABLE
from fastapi_kossi.core.cache import get_cache_stats
from fastapi_kossi.core.database import init_db
from fastapi_kossi.api.chat import router as chat_router

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS OPTIONNELS (Monitoring)
# ══════════════════════════════════════════════════════════════════════════════
PROMETHEUS_AVAILABLE = False
if METRICS_ENABLED:
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
        PROMETHEUS_AVAILABLE = True
    except ImportError:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DU LOGGING
# ══════════════════════════════════════════════════════════════════════════════
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# LIFECYCLE EVENTS
# Gestion des evenements de demarrage et d'arret du service
# ══════════════════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Gestionnaire de cycle de vie de l'application.
    
    Cette fonction est appelee au demarrage et a l'arret du service.
    Elle permet d'initialiser et de nettoyer les ressources.
    """
    # ── Demarrage ────────────────────────────────────────────────────────────
    logger.info("=" * 70)
    logger.info("KOSSI AI MULTI-AGENTS v2.1 — DEMARRAGE")
    logger.info("=" * 70)
    logger.info(f"Environnement     : {ENVIRONMENT}")
    logger.info(f"Mode debug        : {'Oui' if DEBUG_MODE else 'Non'}")
    logger.info(f"Rate limiting     : {'Actif' if RATE_LIMIT_ENABLED and SLOWAPI_AVAILABLE else 'Inactif'}")
    logger.info(f"Metriques         : {'Actives' if METRICS_ENABLED and PROMETHEUS_AVAILABLE else 'Inactives'}")
    logger.info(f"CORS origins      : {CORS_ORIGINS}")
    
    # Initialiser la BD SQLite
    try:
        init_db()
        logger.info("Base de donnees SQLite initialisee avec succes")
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation de la BD: {e}")
    
    logger.info("-" * 70)
    logger.info("Agents actifs :")
    logger.info("  - CatalogAgent      : Recherche de livres (RAG hybride)")
    logger.info("  - RecommendationAgent: Recommandations personnalisees")
    logger.info("  - EducationAgent    : Soutien scolaire")
    logger.info("  - ScholarAgent      : Culture generale et histoire")
    logger.info("  - EventsAgent       : Clubs et evenements")
    logger.info("  - LibrarianAgent    : Infos pratiques")
    logger.info("  - WebAgent          : Recherche internet")
    logger.info("-" * 70)
    logger.info("Pret a servir les usagers de la Bibliotheque CAEB de Natitingou!")
    logger.info("=" * 70)
    
    yield  # L'application s'execute ici
    
    # ── Arret ────────────────────────────────────────────────────────────────
    logger.info("=" * 70)
    logger.info("KOSSI AI — ARRET DU SERVICE")
    logger.info("=" * 70)


# ══════════════════════════════════════════════════════════════════════════════
# INITIALISATION DE FASTAPI
# ══════════════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="Kossi AI — Plateforme Multi-Agents",
    description=(
        "Service IA multi-agents pour la Bibliotheque CAEB de Natitingou (Benin). "
        "Kossi est un assistant intelligent orchestrant plusieurs agents specialises : "
        "catalogue RAG, recommandation personnalisee, soutien scolaire, culture generale, "
        "evenements & clubs, et recherche web. "
        "\n\n"
        "**Endpoints principaux :**\n"
        "- `POST /chat` : Envoyez un message et recevez une reponse de Kossi\n"
        "- `POST /chat/stream` : Streaming SSE pour les reponses en temps reel\n"
        "- `POST /vectorize` : Generez des embeddings pour les livres\n"
    ),
    version="2.1.0",
    docs_url="/docs" if DEBUG_MODE else None,      # Swagger UI (dev only)
    redoc_url="/redoc" if DEBUG_MODE else None,    # ReDoc (dev only)
    openapi_url="/openapi.json" if DEBUG_MODE else None,
    lifespan=lifespan,
)


# ══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE CORS
# Permet les requetes cross-origin depuis les frontends autorises
# ══════════════════════════════════════════════════════════════════════════════
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)


# ══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE RATE LIMITING
# Protege l'API contre les abus en limitant le nombre de requetes
# ══════════════════════════════════════════════════════════════════════════════
if RATE_LIMIT_ENABLED and SLOWAPI_AVAILABLE and limiter is not None:
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    
    # Attacher le limiteur a l'application
    app.state.limiter = limiter
    
    # Handler personnalise pour les erreurs de rate limit
    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
        """
        Gere les erreurs de depassement de limite de requetes.
        Retourne une reponse JSON avec un message explicatif.
        """
        logger.warning(f"Rate limit depasse pour {request.client.host if request.client else 'unknown'}")
        return JSONResponse(
            status_code=429,
            content={
                "error": "rate_limit_exceeded",
                "message": (
                    "Vous avez envoye trop de requetes. "
                    "Veuillez patienter quelques instants avant de reessayer."
                ),
                "retry_after": "60 seconds",
            },
            headers={"Retry-After": "60"},
        )
    
    logger.info("Rate limiting configure avec SlowAPI")


# ══════════════════════════════════════════════════════════════════════════════
# MIDDLEWARE PROMETHEUS
# Collecte les metriques pour le monitoring
# ══════════════════════════════════════════════════════════════════════════════
if METRICS_ENABLED and PROMETHEUS_AVAILABLE:
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health"],
        inprogress_name="kossi_inprogress_requests",
        inprogress_labels=True,
    )
    instrumentator.instrument(app).expose(app, endpoint="/metrics")
    logger.info("Metriques Prometheus exposees sur /metrics")


# ══════════════════════════════════════════════════════════════════════════════
# ENREGISTREMENT DES ROUTES
# ══════════════════════════════════════════════════════════════════════════════
app.include_router(chat_router, tags=["Kossi Chat"])

# Exposer également le module de routes sous le nom "api.chat" afin que
# les tests qui patchent "api.chat.orchestrator" agissent bien sur la
# même instance du module (alias vers fastapi_kossi.api.chat).
import importlib as _importlib
_api_chat_mod = _importlib.import_module("fastapi_kossi.api.chat")
import sys as _sys
_sys.modules["api.chat"] = _api_chat_mod


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES DE SANTE ET DEBUG
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    """
    Verification rapide que le service est operationnel.
    
    Cette route est utilisee par les load balancers et les outils de monitoring
    pour verifier que le service repond.
    """
    return {
        "status": "healthy",
        "service": "Kossi AI Multi-Agents",
        "version": "2.1.0",
        "message": "Bienvenue sur la plateforme IA de la Bibliotheque CAEB de Natitingou!",
        "endpoints": {
            "chat": "POST /chat",
            "stream": "POST /chat/stream",
            "vectorize": "POST /vectorize",
            "health": "GET /health",
            "docs": "GET /docs" if DEBUG_MODE else "Desactive en production",
        },
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Verification detaillee de la sante du service avec metriques.
    
    Cette route retourne des informations detaillees sur l'etat du service,
    incluant les statistiques de cache et la configuration active.
    """
    from fastapi_kossi.services.llm_service import LLMService
    
    return {
        "status": "healthy",
        "service": "Kossi AI Multi-Agents",
        "version": "2.1.0",
        "environment": ENVIRONMENT,
        "features": {
            "rate_limiting": RATE_LIMIT_ENABLED and SLOWAPI_AVAILABLE,
            "metrics": METRICS_ENABLED and PROMETHEUS_AVAILABLE,
            "debug_mode": DEBUG_MODE,
        },
        "cache": get_cache_stats(),
        "llm": LLMService.get_stats(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# GESTION DES ERREURS GLOBALES
# ══════════════════════════════════════════════════════════════════════════════

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Gestionnaire global pour les exceptions non gerees.
    
    Capture toutes les erreurs non prevues et retourne une reponse JSON
    propre au lieu d'une erreur 500 brute.
    """
    logger.error(f"Erreur non geree: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": (
                "Kossi rencontre un probleme technique inattendu. "
                "L'equipe a ete notifiee. Veuillez reessayer dans quelques instants."
            ),
        },
    )


# ══════════════════════════════════════════════════════════════════════════════
# POINT D'ENTREE POUR UVICORN
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        port=8001,
        reload=DEBUG_MODE,
        log_level=LOG_LEVEL.lower(),
    )
