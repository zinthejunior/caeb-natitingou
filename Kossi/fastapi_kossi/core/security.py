"""
core/security.py — Module de securite pour le service Kossi AI

Ce module fournit les fonctionnalites de securite essentielles :
- Rate limiting : Protection contre les abus et le spam
- Authentification API : Gestion des cles API et tokens JWT
- Validation des requetes : Verification des headers et signatures

Le rate limiting utilise SlowAPI pour limiter le nombre de requetes par IP/utilisateur.
L'authentification supporte deux modes : cles API simples ou tokens JWT.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS CONDITIONNELS
# Ces bibliotheques sont optionnelles - le service fonctionne sans elles
# ══════════════════════════════════════════════════════════════════════════════

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False
    Limiter = None

try:
    from jose import JWTError, jwt
    JOSE_AVAILABLE = True
except ImportError:
    JOSE_AVAILABLE = False
    jwt = None
    JWTError = Exception

from fastapi_kossi.core.settings import (
    RATE_LIMIT_ENABLED,
    RATE_LIMIT_CHAT_PER_MINUTE,
    RATE_LIMIT_VECTORIZE_PER_MINUTE,
    API_AUTH_ENABLED,
    API_SECRET_KEY,
    API_JWT_ALGORITHM,
    API_TOKEN_EXPIRE_MINUTES,
    AUTHORIZED_API_KEYS,
)

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# RATE LIMITING
# ══════════════════════════════════════════════════════════════════════════════

def get_client_identifier(request: Request) -> str:
    """
    Extrait un identifiant unique pour le client effectuant la requete.
    
    Utilise dans l'ordre de priorite :
    1. Le header X-Forwarded-For (si derriere un proxy/load balancer)
    2. Le header X-Real-IP
    3. L'adresse IP directe du client
    4. Une cle API si presente dans les headers
    
    Args:
        request: L'objet Request FastAPI
        
    Returns:
        str: Identifiant unique du client (IP ou cle API)
    """
    # Verifier si une cle API est presente (prioritaire pour le rate limiting)
    api_key = request.headers.get("X-API-Key")
    if api_key:
        # Utiliser un hash de la cle pour ne pas exposer la cle dans les logs
        return f"apikey:{hash(api_key) % 10000}"
    
    # Sinon, utiliser l'adresse IP
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        # Prendre la premiere IP de la liste (client original)
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback sur l'IP directe
    if request.client:
        return request.client.host
    
    return "unknown"


# Initialisation du limiteur de debit
# Le limiteur utilise l'identifiant client pour compter les requetes
if SLOWAPI_AVAILABLE and RATE_LIMIT_ENABLED:
    limiter = Limiter(
        key_func=get_client_identifier,
        default_limits=["100/minute"],  # Limite par defaut pour les endpoints non specifies
        storage_uri="memory://",         # Stockage en memoire (utiliser Redis en production)
        strategy="fixed-window",         # Strategie de fenetre fixe (reset chaque minute)
    )
    logger.info("Rate limiting active avec SlowAPI")
else:
    limiter = None
    if RATE_LIMIT_ENABLED and not SLOWAPI_AVAILABLE:
        logger.warning("SlowAPI non installe - rate limiting desactive")
    else:
        logger.info("Rate limiting desactive par configuration")


# Decorateurs de rate limiting pour les endpoints
def rate_limit_chat(func):
    """
    Decorateur pour limiter les appels a l'endpoint /chat.
    Applique une limite de RATE_LIMIT_CHAT_PER_MINUTE requetes par minute.
    """
    if limiter is not None:
        return limiter.limit(f"{RATE_LIMIT_CHAT_PER_MINUTE}/minute")(func)
    return func


def rate_limit_vectorize(func):
    """
    Decorateur pour limiter les appels a l'endpoint /vectorize.
    Applique une limite de RATE_LIMIT_VECTORIZE_PER_MINUTE requetes par minute.
    """
    if limiter is not None:
        return limiter.limit(f"{RATE_LIMIT_VECTORIZE_PER_MINUTE}/minute")(func)
    return func


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTIFICATION API
# ══════════════════════════════════════════════════════════════════════════════

# Schema de securite pour les cles API dans les headers
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# Schema de securite pour les tokens Bearer JWT
bearer_scheme = HTTPBearer(auto_error=False)


async def verify_api_key(api_key: Optional[str] = Depends(api_key_header)) -> Optional[str]:
    """
    Verifie qu'une cle API valide est presente dans les headers.
    
    Cette fonction est utilisee comme dependance FastAPI pour proteger les endpoints.
    Si l'authentification est desactivee, elle retourne toujours None (acces autorise).
    
    Args:
        api_key: La cle API extraite du header X-API-Key
        
    Returns:
        Optional[str]: La cle API validee ou None si auth desactivee
        
    Raises:
        HTTPException: Si la cle est manquante ou invalide
    """
    # Si l'authentification est desactivee, autoriser toutes les requetes
    if not API_AUTH_ENABLED:
        return None
    
    # Verifier que la cle est presente
    if not api_key:
        logger.warning("Requete sans cle API alors que l'authentification est activee")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cle API manquante. Ajoutez le header X-API-Key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Verifier que la cle est dans la liste autorisee
    if api_key not in AUTHORIZED_API_KEYS:
        logger.warning(f"Tentative d'acces avec une cle API invalide: {api_key[:8]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cle API invalide ou revoquee.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    logger.debug(f"Acces autorise avec la cle API: {api_key[:8]}...")
    return api_key


async def verify_jwt_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[dict]:
    """
    Verifie et decode un token JWT Bearer.
    
    Cette fonction est utilisee comme dependance FastAPI pour les endpoints
    necessitant une authentification par token.
    
    Args:
        credentials: Les credentials extraits du header Authorization
        
    Returns:
        Optional[dict]: Le payload decode du token ou None si auth desactivee
        
    Raises:
        HTTPException: Si le token est manquant, expire ou invalide
    """
    # Si l'authentification est desactivee, autoriser toutes les requetes
    if not API_AUTH_ENABLED:
        return None
    
    # Verifier que la bibliotheque jose est disponible
    if not JOSE_AVAILABLE:
        logger.error("python-jose non installe - authentification JWT indisponible")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentification JWT non configuree sur le serveur.",
        )
    
    # Verifier que le token est present
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Decoder et verifier le token
        payload = jwt.decode(
            credentials.credentials,
            API_SECRET_KEY,
            algorithms=[API_JWT_ALGORITHM],
        )
        
        # Verifier l'expiration (deja fait par jwt.decode, mais verification explicite)
        exp = payload.get("exp")
        if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expire. Veuillez vous reconnecter.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return payload
        
    except JWTError as e:
        logger.warning(f"Erreur de validation JWT: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou mal forme.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Cree un nouveau token JWT avec les donnees fournies.
    
    Cette fonction est utilisee pour generer des tokens lors de l'authentification.
    Le token inclut automatiquement une date d'expiration.
    
    Args:
        data: Dictionnaire des donnees a inclure dans le token (ex: {"sub": "user_id"})
        expires_delta: Duree de validite personnalisee (optionnel)
        
    Returns:
        str: Le token JWT encode
        
    Raises:
        RuntimeError: Si python-jose n'est pas installe
    """
    if not JOSE_AVAILABLE:
        raise RuntimeError("python-jose requis pour creer des tokens JWT")
    
    # Copier les donnees pour ne pas modifier l'original
    to_encode = data.copy()
    
    # Calculer la date d'expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=API_TOKEN_EXPIRE_MINUTES)
    
    # Ajouter les claims standards
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued At
    })
    
    # Encoder le token
    encoded_jwt = jwt.encode(to_encode, API_SECRET_KEY, algorithm=API_JWT_ALGORITHM)
    
    return encoded_jwt


# ══════════════════════════════════════════════════════════════════════════════
# DEPENDANCES COMBINEES
# ══════════════════════════════════════════════════════════════════════════════

async def get_current_auth(
    api_key: Optional[str] = Depends(verify_api_key),
    jwt_payload: Optional[dict] = Depends(verify_jwt_token),
) -> dict:
    """
    Dependance combinee pour l'authentification.
    
    Accepte soit une cle API, soit un token JWT Bearer.
    Si l'authentification est desactivee, retourne un dictionnaire vide.
    
    Args:
        api_key: Cle API validee (optionnel)
        jwt_payload: Payload JWT decode (optionnel)
        
    Returns:
        dict: Informations d'authentification
            - Si cle API: {"auth_type": "api_key", "api_key": "..."}
            - Si JWT: {"auth_type": "jwt", "user": {...}}
            - Si desactive: {}
    """
    if not API_AUTH_ENABLED:
        return {}
    
    if api_key:
        return {"auth_type": "api_key", "api_key": api_key}
    
    if jwt_payload:
        return {"auth_type": "jwt", "user": jwt_payload}
    
    # Ce cas ne devrait pas arriver si les dependances sont correctes
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentification requise.",
    )
