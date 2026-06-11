"""
orchestrator.py — Agent Orchestrateur Central de Kossi

Ce module est le cerveau du système multi-agents. Il :
1. Analyse l'intention de l'utilisateur (intent detection)
2. Récupère le contexte complet (catalogue, profil utilisateur, historique)
3. Route la requête vers le(s) agent(s) spécialisé(s) approprié(s)
4. Fusionne les réponses si nécessaire
5. Renvoie une réponse unifiée sous le nom de "Kossi"
"""

import logging
import re
from typing import List, Dict, Any, Optional, Tuple

import httpx

from fastapi_kossi.core.settings import FILE_SYSTEM_PROMPT
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.memory_service import MemoryService
from fastapi_kossi.services.search_service import SearchService
from fastapi_kossi.services.database_service import DatabaseService

# Import des agents spécialisés
from fastapi_kossi.agents.catalog_agent import CatalogAgent
from fastapi_kossi.agents.recommendation_agent import RecommendationAgent
from fastapi_kossi.agents.education_agent import EducationAgent
from fastapi_kossi.agents.scholar_agent import ScholarAgent
from fastapi_kossi.agents.events_agent import EventsAgent
from fastapi_kossi.agents.web_agent import WebAgent
from fastapi_kossi.agents.librarian_agent import LibrarianAgent

logger = logging.getLogger(__name__)


# ── Règles de détection d'intention ──────────────────────────────────────────

INTENT_PATTERNS: Dict[str, List[str]] = {
    "catalog": [
        r"\blivres?\b", r"\blivre[s]?\b", r"\broman[s]?\b", r"\bcatalogue\b",
        r"\bdisponible[s]?\b", r"\bemprunt[s]?\b", r"\bcherche[rs]?\b", r"\bcherch(er|ez|e|es)?\b", r"\btrouv(er|ez)?\b",
        r"\bavez[- ]?vous\b", r"\bvous avez\b", r"\bposs[ée]d?ez\b",
        r"\btitre[s]?\b", r"\bauteur[s]?\b", r"\bécrit par\b", r"\bécrivain\b",
        r"\bbibliographie\b", r"\bpublication[s]?\b", r"\bédition(s)?\b",
    ],
    "recommendation": [
        r"\brecommand(?:er|ez|e|ons|es)?\b", r"\brecommandat(?:ion|ions)?\b", r"\bsuggestion[s]?\b", r"\bconseil[s]?\b", r"\bconseiller\b",
        r"\bque lire\b", r"\bquel livre\b", r"\bpropos(e|ez|er)?\b", r"\bj'?aime[r]?\b",
        r"\bje ne sais pas quoi lire\b", r"\benvie de lire\b", r"\brecommande[- ]?moi\b",
    ],
    "education": [
        r"\bdevoirs?\b", r"\bresoud(?:re|s|u|t)?\b", r"\bresoudre\b", r"\br[eé]solve?r?\b", r"\bexplique(?:z|-moi)?\b", r"\bbac\b",
        r"\bressources?\b", r"\bexpos[ée]?\b", r"\bscolaire\b", r"\b[ée]tude[s]?\b", r"\bcours\b",
        r"\bapprentissage\b", r"\b[ée]cole\b", r"\bcol[eè]ge\b", r"\bly[cç]ee\b", r"\buniversit[ée]\b", r"\bexamen[s]?\b",
    ],
    "librarian": [
        r"\bhoraire[s]?\b", r"\binscrip(tion|re)?\b", r"\bemprunt[s]?\b", r"\bpr[eê]t[s]?\b", r"\breserv(ation|er)?\b",
        r"\bbiblioth[eè]que\b", r"\bad[h]?h[eé]sion\b", r"\bcarte\b", r"\bpenalit[eé]\b", r"\bamende\b",
        r"\bdur[eé][e]?\b", r"\bcombien de livres\b", r"\bou etes[- ]?vous\b", r"\badresse\b",
        r"\bservice[s]?\b", r"\bfermeture\b", r"\bouvrir\b", r"\bfermer\b",
    ],
    "events": [
        r"\bclub[s]?\b", r"\b[eé]v[eé]nement[s]?\b", r"\bactivit[eé][s]?\b", r"\banimation[s]?\b",
        r"\bexposition[s]?\b", r"\bconf[eé]rence[s]?\b", r"\bfestival[s]?\b", r"\bprogramme[s]?\b",
        r"\bagenda\b", r"\brencontre[s]?\b", r"\bateliers?\b",
    ],
    "scholar": [
        r"\bhistoire\b", r"\bculture[l]?\b", r"\bqu[eè]st\b", r"\bqui est\b",
        r"\bexplique(?:z|-moi)?\b", r"\bd[eé]fini(?:r)?\b", r"\bsignifie\b", r"\bscience[s]?\b",
        r"\bphilosophie\b", r"\bg[eé]ographie\b", r"\bpolitique\b", r"\bartiste\b",
        r"\bafrique\b", r"\bb[eé]nin\b", r"\bpays\b", r"\bvilles\b",
    ],
    "web": [
        r"\binternet\b", r"\bweb\b", r"\bactu(?:alité|alites)?\b", r"\bnouvelle[s]?\b",
        r"\brecherche sur\b", r"\bqu'[eè]st[- ]ce qui se passe\b", r"\binfo[s]?\b",
    ],
}

CASUAL_PATTERNS = [
    r"\bbonjour\b",
    r"\bsalut\b",
    r"\bbonsoir\b",
    r"\bmerci\b",
    r"\bau revoir\b",
    r"\bcomment allez(-| )?vous\b",
    r"\bcomment (ca|ça) va\b",
    r"\baide\b",
    r"\bhelp\b",
    r"\bok\b",
    r"\bd'accord\b",
    r"\bcompris\b",
]


def _detect_intents(query: str) -> List[str]:
    """Détecte les intentions possibles de la requête.

    Priorise explicitement certaines intentions pour correspondre
    aux attentes des tests (recommendation avant scholar, etc.).
    """
    q = (query or "").lower().strip()

    # Détecter si le message est une salutation ou phrase courante,
    # mais ne pas retourner immédiatement car il peut contenir
    # des mots-clés plus spécifiques (ex: "aide" + "devoirs").
    casual_matched = False
    for pattern in CASUAL_PATTERNS:
        if re.search(pattern, q):
            casual_matched = True
            break

    # Priority order to match tests
    priority = [
        "recommendation",
        "librarian",
        "catalog",
        "education",
        "events",
        "scholar",
        "web",
    ]

    detected: List[str] = []
    for intent in priority:
        patterns = INTENT_PATTERNS.get(intent, [])
        for p in patterns:
            if re.search(p, q):
                detected.append(intent)
                break

    if not detected:
        if casual_matched:
            return ["general"]
        # Default to scholar for knowledge questions
        return ["scholar"]

    return detected


def _select_primary_intent(intents: List[str]) -> str:
    """Sélectionne l'intention principale à partir de plusieurs intentions possibles."""
    if not intents:
        return "scholar"
    return intents[0]


def _detect_intent(query: str) -> str:
    """Retourne l'intention principale à partir de la requête.

    Cette fonction conserve la compatibilité avec les importations existantes.
    """
    return _select_primary_intent(_detect_intents(query))


async def _fetch_backend_data(endpoint: str) -> List[Dict[str, Any]]:
    """Récupère des données depuis la BD SQLite locale."""
    try:
        if endpoint == "clubs":
            data = DatabaseService.get_all_clubs()
        elif endpoint == "events":
            data = DatabaseService.get_all_events()
        else:
            logger.warning(f"Endpoint inconnu: {endpoint}")
            return []
        return data
    except Exception as e:
        logger.warning(f"Impossible de récupérer '{endpoint}' depuis la BD: {e}")
    return []


async def _fetch_all_books() -> List[Dict[str, Any]]:
    """Récupère l'intégralité du catalogue de livres depuis SQLite."""
    try:
        all_books = DatabaseService.get_all_books()
        logger.info(f"Catalogue chargé : {len(all_books)} livres.")
        return all_books
    except Exception as e:
        logger.warning(f"Erreur lors de la récupération du catalogue : {e}")
        return []


class KossiOrchestrator:
    """Orchestrateur central qui gère le flux complet de conversation de Kossi.
    
    Il est le seul point d'entrée visible par l'API. Il :
    - Récupère le contexte global (livres, user, historique)
    - Détecte l'intention de la requête
    - Délègue aux agents spécialisés
    - Retourne une réponse unifiée
    """

    # Instances partagées des agents (singleton-like, créées une seule fois)
    _catalog_agent = CatalogAgent()
    _recommendation_agent = RecommendationAgent()
    _education_agent = EducationAgent()
    _scholar_agent = ScholarAgent()
    _events_agent = EventsAgent()
    _web_agent = WebAgent()
    _librarian_agent = LibrarianAgent()

    def __init__(self):
        # Exposer des proxies d'agent avec une méthode `process` attendue par les tests
        class AgentProxy:
            def __init__(self, agent):
                self._agent = agent

            async def process(self, *args, **kwargs):
                # Normaliser l'appel vers `execute(query, context)` si nécessaire
                if "message" in kwargs:
                    query = kwargs.get("message")
                elif args:
                    query = args[0]
                else:
                    query = ""
                context = kwargs.get("context") or kwargs.get("shared_context") or {}
                return await self._agent.execute(query, context)

        # Créer les proxies d'instances pointant sur les agents partagés
        self.catalog_agent = AgentProxy(self._catalog_agent)
        self.recommendation_agent = AgentProxy(self._recommendation_agent)
        self.education_agent = AgentProxy(self._education_agent)
        self.scholar_agent = AgentProxy(self._scholar_agent)
        self.events_agent = AgentProxy(self._events_agent)
        self.web_agent = AgentProxy(self._web_agent)
        self.librarian_agent = AgentProxy(self._librarian_agent)

    async def process(
        self,
        message: str = "",
        user_profile: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        function_name: Optional[str] = None,
        query: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Point d'entrée principal. Traite une requête utilisateur de bout en bout.
        
        Args:
            query: Le message de l'utilisateur
            history: L'historique de la conversation (liste de {role, content})
            user: Le profil de l'utilisateur connecté (optionnel)
            
        Returns:
            La réponse textuelle de Kossi.
        """
        # Accept either `message` or `query` keyword (compat with api.chat)
        query = (query or message) or ""
        history = history or []
        logger.info(f"[Orchestrateur] Traitement de la requête : '{query[:80]}...'")

        # ── 1. Détection d'intention ──────────────────────────────────────────
        candidate_intents = _detect_intents(query)

        # Si l'historique contient des indices de recherche de livres,
        # prioriser le routage vers l'agent `catalog`.
        if history:
            for entry in history:
                content = (entry.get("content") if isinstance(entry, dict) else str(entry)).lower()
                if re.search(r"\blivres?\b|\blivre\b|\bcherche[r]?\b|\bemprunt\b|\broman\b", content):
                    if "catalog" not in candidate_intents:
                        candidate_intents.insert(0, "catalog")
                    break

        intent = _select_primary_intent(candidate_intents)
        logger.info(f"[Orchestrateur] Intentions candidates : {candidate_intents}")
        logger.info(f"[Orchestrateur] Intention principale : {intent}")

        # ── 2. Construction du contexte partagé ──────────────────────────────
        # Récupération parallèle des données du backend (catalogue + données annexes)
        books: List[Dict[str, Any]] = []
        clubs_summary = ""
        events_summary = ""
        web_results: List[Dict[str, str]] = []

        # Charger le catalogue seulement si pertinent
        if any(i in ("catalog", "recommendation", "education", "scholar") for i in candidate_intents):
            books = await _fetch_all_books()

        # Charger clubs et événements si pertinent
        if any(i in ("events", "librarian", "general") for i in candidate_intents):
            clubs_data = await _fetch_backend_data("clubs")
            events_data = await _fetch_backend_data("events")
            clubs_summary = ", ".join(
                c.get("nom") or c.get("name") or "" for c in clubs_data if c
            ) or "Club de lecture, Club de débat, Atelier d'écriture"
            events_summary = ", ".join(
                e.get("titre") or e.get("name") or "" for e in events_data if e
            ) or "Aucun événement programmé actuellement."

        # Recherche web quand cela est pertinent ou pour enrichir les réponses générales/érudites
        if "web" in candidate_intents or intent in ("scholar", "general"):
            web_results = await SearchService.search_web(query, limit=5, fetch_page_content=True)

        # ── 3. Résumé du profil utilisateur ──────────────────────────────────
        user = user_profile
        user_summary = MemoryService.format_user_summary(user) if user else ""

        # ── 4. Historique formaté ─────────────────────────────────────────────
        history_context = MemoryService.build_chat_history_context(history, limit=8)

        # ── 5. Construction du contexte partagé pour les agents ──────────────
        shared_context: Dict[str, Any] = {
            "books": books,
            "user_summary": user_summary,
            "history_context": history_context,
            "history_messages": history,
            "clubs_summary": clubs_summary,
            "events_summary": events_summary,
            "web_results": web_results,
            "intent": intent,
            "candidate_intents": candidate_intents,
            "function_name": function_name,
        }

        # ── 6. Routing vers l'agent approprié ────────────────────────────────
        agent_result = await self._route_to_agent(intent, query, shared_context)

        # Normaliser le résultat sous forme de dict attendu par les tests
        if isinstance(agent_result, dict):
            result = agent_result
        else:
            result = {"response": str(agent_result), "agent": intent, "cached": False}

        # Ajouter éventuellement les sources web
        if shared_context.get("web_results"):
            result.setdefault("sources", shared_context.get("web_results"))

        return result

    async def _route_to_agent(
        self,
        intent: str,
        query: str,
        context: Dict[str, Any],
    ) -> Any:
        """Route la requête vers l'agent spécialisé et gère les fallbacks."""

        try:
            if intent == "catalog":
                return await self.catalog_agent.process(message=query, context=context)

            elif intent == "recommendation":
                return await self.recommendation_agent.process(message=query, context=context)

            elif intent == "education":
                return await self.education_agent.process(message=query, context=context)

            elif intent == "scholar":
                return await self.scholar_agent.process(message=query, context=context)

            elif intent == "events":
                return await self.events_agent.process(message=query, context=context)

            elif intent == "librarian":
                return await self.librarian_agent.process(message=query, context=context)

            elif intent == "web":
                return await self.web_agent.process(message=query, context=context)

            else:
                # Réponse générale avec le prompt maître de Kossi
                return await self._general_response(query, context)

        except Exception as e:
            logger.error(f"[Orchestrateur] Erreur dans l'agent '{intent}' : {e}")
            # Fallback de sécurité : réponse explicite en cas d'erreur d'agent
            return {
                "response": (
                    "Désolé, une erreur est survenue lors du traitement de votre requête. "
                    "Veuillez réessayer plus tard."
                ),
                "agent": intent,
                "cached": False,
            }

    async def _general_response(self, query: str, context: Dict[str, Any]) -> str:
        """Génère une réponse générale via le prompt maître de Kossi."""
        history_context = context.get("history_context", "")
        user_summary = context.get("user_summary", "")

        messages = [
            {"role": "system", "content": FILE_SYSTEM_PROMPT},
        ]
        if user_summary:
            messages.append({"role": "system", "content": f"Profil utilisateur :\n{user_summary}"})

        history_messages = context.get("history_messages") or []
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})

        if context.get("function_name"):
            messages.append({"role": "system", "content": f"Function parameter: {context.get('function_name')}"})
        messages.append({"role": "user", "content": query})

        return await LLMService.generate_response(messages, temperature=0.2, require_citations=False, use_cache=True)

    # Méthodes utilitaires attendues par les tests
    def detect_intent(self, query: str) -> str:
        return _detect_intent(query)

    def detect_intents(self, query: str) -> List[str]:
        return _detect_intents(query)

    async def process_stream(self, *args, **kwargs):
        """Placeholder streaming API for tests to patch. By default delegate
        to the LLMService streaming interface if needed."""
        messages = kwargs.get("messages")
        if messages is None:
            query = kwargs.get("message") or kwargs.get("query") or ""
            history = kwargs.get("history") or []
            user_profile = kwargs.get("user_profile")
            function_name = kwargs.get("function_name")
            history_context = kwargs.get("history_context")

            messages = [{"role": "system", "content": FILE_SYSTEM_PROMPT}]
            if user_profile:
                user_summary = MemoryService.format_user_summary(user_profile)
                if user_summary:
                    messages.append({"role": "system", "content": f"Profil utilisateur :\n{user_summary}"})

            if history:
                messages.extend(history[-8:])
            elif history_context:
                messages.append({"role": "system", "content": history_context})

            if function_name:
                messages.append({"role": "system", "content": f"Function parameter: {function_name}"})

            messages.append({"role": "user", "content": query})

        logger.debug(
            f"Streaming with {len(messages)} messages; message preview: {messages[-1].get('content')[:80] if messages else '<none>'}"
        )

        async for chunk in LLMService.generate_stream(messages, temperature=kwargs.get("temperature", 0.2)):
            yield chunk


# Compatibilité d'import historique pour les tests
Orchestrator = KossiOrchestrator


# Alias compatible avec l'API de test
Orchestrator = KossiOrchestrator
