"""
services/intent_service.py — Détection d'intention via LLM (hybride)

Ce module fournit `detect_intent_llm()`, une fonction asynchrone qui classe
l'intention d'un message utilisateur en appelant un LLM gratuit via OpenRouter.

Stratégie d'utilisation dans l'orchestrateur :
  - 1er message d'une session (history vide) → appel LLM direct (précision max)
  - Messages suivants → regex d'abord, LLM en fallback si rien détecté

Avantages par rapport aux regex seuls :
  - Comprend le sens, pas uniquement les mots-clés
  - Gère les formulations ambiguës / inédites
  - Multilingue sans ajout de patterns

Notes :
  - Température = 0.0 pour une classification déterministe
  - Timeout court (8s) pour ne pas bloquer le streaming SSE
  - Utilise uniquement les modèles gratuits (:free) définis dans settings.py
  - Si la clé API est absente ou si le LLM échoue, retourne None → regex prend le relais
"""

import json
import logging
from typing import Optional

import httpx

from fastapi_kossi.core.settings import OPENROUTER_API_KEY, OPENROUTER_MODELS

logger = logging.getLogger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

OPENROUTER_BASE_HEADERS = {
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "Kossi AI - Bibliotheque CAEB",
}

# Intentions valides reconnues par l'orchestrateur
VALID_INTENTS = {
    "catalog",
    "recommendation",
    "education",
    "librarian",
    "events",
    "scholar",
    "web",
    "general",
}

# Timeout court : on ne veut pas bloquer l'utilisateur si le LLM est lent
INTENT_LLM_TIMEOUT_SECONDS = 8

# Utilise uniquement des modèles gratuits (avec suffixe :free)
_FREE_MODELS = [m for m in OPENROUTER_MODELS if m.endswith(":free")]
# Garde le routeur OpenRouter gratuit en dernier recours
if "openrouter/free" not in _FREE_MODELS:
    _FREE_MODELS.append("openrouter/free")

# ── Prompt few-shot ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Tu es un classificateur d'intention pour une bibliothèque africaine (CAEB, Natitingou, Bénin).
Analyse le message de l'utilisateur et réponds UNIQUEMENT avec un objet JSON, sans texte autour.

Intentions disponibles :
- catalog       : chercher / trouver / emprunter un livre, titre, auteur
- recommendation: demande de suggestion ou conseil de lecture
- education     : aide scolaire, devoir, exposé, examen
- librarian     : horaires, inscription, carte de bibliothèque, amende, prêt, adresse
- events        : clubs, événements, conférences, ateliers, agenda
- scholar       : question de culture générale, histoire, géographie, science, définition
- web           : recherche d'actualités ou d'informations récentes sur internet
- general       : salutation, remerciement, aide générale

Format de réponse strict :
{"intent": "<une_des_intentions_ci_dessus>"}

Exemples :
- "Bonjour, avez-vous le roman de Camara Laye ?" → {"intent": "catalog"}
- "Recommande-moi un livre sur le leadership" → {"intent": "recommendation"}
- "Je dois faire un exposé sur la révolution française" → {"intent": "education"}
- "Quels sont vos horaires d'ouverture ?" → {"intent": "librarian"}
- "Y a-t-il un club de lecture ce mois-ci ?" → {"intent": "events"}
- "Qui était Thomas Sankara ?" → {"intent": "scholar"}
- "Quelles sont les dernières actualités au Bénin ?" → {"intent": "web"}
- "Salut, comment tu t'appelles ?" → {"intent": "general"}
"""


# ── Fonction principale ───────────────────────────────────────────────────────

async def detect_intent_llm(query: str) -> Optional[str]:
    """Détecte l'intention principale d'un message via LLM (modèles gratuits).

    Essaie les modèles gratuits dans l'ordre défini dans OPENROUTER_MODELS.
    Retourne None si :
      - La clé API est absente
      - Tous les modèles échouent ou dépassent le timeout
      - La réponse JSON est invalide ou l'intention non reconnue

    Le code appelant (orchestrateur) doit gérer None en retombant sur les regex.

    Args:
        query: Le message de l'utilisateur à classifier.

    Returns:
        Une chaîne parmi VALID_INTENTS, ou None en cas d'échec.
    """
    if not OPENROUTER_API_KEY:
        logger.debug("[IntentService] Clé API absente — classification LLM ignorée")
        return None

    if not query or not query.strip():
        return "general"

    headers = {
        **OPENROUTER_BASE_HEADERS,
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    }

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": query.strip()},
    ]

    payload_base = {
        "messages": messages,
        "temperature": 0.0,        # Déterministe : même query → même intent
        "max_tokens": 32,          # On attend juste {"intent": "xxx"}, très court
    }

    async with httpx.AsyncClient(timeout=INTENT_LLM_TIMEOUT_SECONDS) as client:
        for model in _FREE_MODELS:
            try:
                payload = {**payload_base, "model": model}
                logger.debug(f"[IntentService] Tentative classification avec {model}")

                resp = await client.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload,
                )

                if resp.status_code != 200:
                    logger.warning(
                        f"[IntentService] {model} → HTTP {resp.status_code}"
                    )
                    continue

                data = resp.json()
                raw = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                    .strip()
                )

                intent = _parse_intent(raw)
                if intent:
                    logger.info(
                        f"[IntentService] '{query[:60]}' → intent='{intent}' "
                        f"(modèle: {model})"
                    )
                    return intent

                logger.warning(
                    f"[IntentService] {model} → réponse non parsable : {raw!r}"
                )

            except httpx.TimeoutException:
                logger.warning(f"[IntentService] Timeout sur {model}")
            except Exception as e:
                logger.warning(f"[IntentService] Erreur sur {model} : {e}")

    logger.warning("[IntentService] Tous les modèles ont échoué — fallback regex")
    return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_intent(raw: str) -> Optional[str]:
    """Extrait l'intention depuis la réponse brute du LLM.

    Tente d'abord un parsing JSON strict, puis cherche un mot-clé connu
    dans la chaîne si le JSON est malformé.
    """
    if not raw:
        return None

    # 1. Parsing JSON strict
    try:
        # Le LLM peut ajouter des backticks ou "json" autour : on nettoie
        clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        obj = json.loads(clean)
        intent = obj.get("intent", "").strip().lower()
        if intent in VALID_INTENTS:
            return intent
    except (json.JSONDecodeError, AttributeError):
        pass

    # 2. Fallback : cherche un mot-clé valide directement dans le texte
    lower = raw.lower()
    for intent in VALID_INTENTS:
        if intent in lower:
            return intent

    return None
