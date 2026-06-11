"""
api/chat.py — Routes FastAPI pour le service de chat Kossi

Ce module expose les endpoints publics pour interagir avec Kossi :
- POST /chat         : Envoie un message et recoit une reponse complete
- POST /chat/stream  : Envoie un message et recoit une reponse en streaming SSE
- POST /vectorize    : Genere et sauvegarde les embeddings d'un livre

Le streaming SSE (Server-Sent Events) permet d'afficher la reponse au fur et
a mesure qu'elle est generee, offrant une meilleure experience utilisateur.
"""

import logging
import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS INTERNES
# ══════════════════════════════════════════════════════════════════════════════
from fastapi_kossi.agents.orchestrator import KossiOrchestrator, _detect_intent
from fastapi_kossi.services.embedding_service import EmbeddingService
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService
from fastapi_kossi.services.database_service import DatabaseService

# ══════════════════════════════════════════════════════════════════════════════
# IMPORTS OPTIONNELS (Rate Limiting)
# ══════════════════════════════════════════════════════════════════════════════
try:
    from fastapi_kossi.core.security import limiter, rate_limit_chat, rate_limit_vectorize, SLOWAPI_AVAILABLE
except ImportError:
    SLOWAPI_AVAILABLE = False
    limiter = None
    def rate_limit_chat(func): return func
    def rate_limit_vectorize(func): return func

logger = logging.getLogger(__name__)

# Expose an orchestrator instance so tests and patching can replace or mock it
orchestrator = KossiOrchestrator()

# Initialisation du routeur FastAPI
router = APIRouter()


def _ensure_session_id(session_id: Optional[str]) -> str:
    """Retourne un ID de session non vide."""
    if session_id:
        return session_id
    return f"session-{uuid.uuid4().hex[:12]}"


def _normalize_user_profile(request_data: Any) -> Optional[Dict[str, Any]]:
    """Retourne le profil utilisateur valide en priorisant user puis user_profile."""
    if not request_data:
        return None
    if isinstance(request_data, dict):
        return request_data
    return None


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS PYDANTIC
# Definition des modeles de requete et reponse pour la validation automatique
# ══════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    """
    Schema d'un message dans l'historique de conversation.
    
    Attributes:
        role: Le role de l'auteur du message ('user' ou 'assistant')
        content: Le contenu textuel du message
    """
    role: str = Field(
        ..., 
        description="Role de l'auteur: 'user' pour l'utilisateur, 'assistant' pour Kossi",
        examples=["user", "assistant"]
    )
    content: str = Field(
        ..., 
        description="Contenu textuel du message",
        examples=["Bonjour, je cherche un livre sur l'histoire du Benin"]
    )


class ChatRequest(BaseModel):
    """
    Schema de la requete POST /chat.
    
    Attributes:
        message: Le message de l'utilisateur (1-4000 caracteres)
        history: L'historique des messages precedents (optionnel)
        user: Le profil de l'utilisateur connecte (optionnel)
        session_id: L'ID de session de la conversation
        user_profile: Donnees de profil supplementaires
        function_name: Nom de la fonction attendue par le modele
    """
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=10000, 
        description="Message de l'utilisateur a envoyer a Kossi",
        examples=["Je cherche un roman d'aventure pour un enfant de 10 ans"]
    )
    history: List[ChatMessage] = Field(
        default_factory=list, 
        description="Historique des messages precedents pour le contexte"
    )
    user: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="Profil de l'utilisateur connecte (niveau etude, preferences, etc.)"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Identifiant de session de la conversation"
    )
    user_profile: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Profil de l'utilisateur supplementaire"
    )
    function_name: Optional[str] = Field(
        default=None,
        description="Nom de la fonction attendue par le modele"
    )
    stream: Optional[bool] = Field(
        default=False,
        description="Indique si le stream de reponse est active"
    )


class ChatResponse(BaseModel):
    """
    Schema de la reponse POST /chat.
    
    Attributes:
        response: La reponse textuelle de Kossi
        intent: L'intention detectee (pour debug, optionnel)
        sources: Les sources consultees pour les recherches web
    """
    response: str = Field(
        ..., 
        description="Reponse de Kossi a la question de l'utilisateur"
    )
    intent: Optional[str] = Field(
        default=None, 
        description="Intention detectee par l'orchestrateur (debug)"
    )
    sources: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Sources consultées pour construire la réponse"
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Identifiant de session de conversation"
    )


class ConversationSummary(BaseModel):
    session_id: str = Field(..., description="ID de la session de conversation")
    title: Optional[str] = Field(None, description="Titre de la conversation")
    created_at: Optional[datetime] = Field(None, description="Date de creation")
    updated_at: Optional[datetime] = Field(None, description="Date de derniere mise a jour")


class ChatMessageRecord(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None


class ConversationDetail(BaseModel):
    session_id: str
    title: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[ChatMessageRecord] = Field(default_factory=list)


class VectorizeRequest(BaseModel):
    """
    Schema de la requete POST /vectorize.
    
    Attributes:
        id: L'identifiant unique du livre
        title: Titre du livre
        author: Auteur du livre
        summary: Resume du livre
        text: Texte a vectoriser, optionnel si title/author/summary sont presentes
    """
    book_id: Optional[int] = Field(
        None,
        alias="book_id",
        description="ID du livre dans la base de donnees",
        examples=[42]
    )
    id: Optional[int] = Field(
        None,
        alias="id",
        description="ID du livre (alias pour book_id)",
        examples=[42]
    )
    title: Optional[str] = Field(
        default=None,
        description="Titre du livre",
        examples=["Le Petit Prince"]
    )
    author: Optional[str] = Field(
        default=None,
        description="Auteur du livre",
        examples=["Antoine de Saint-Exupery"]
    )
    summary: Optional[str] = Field(
        default=None,
        description="Resume du livre",
        examples=["Un pilote rencontre un petit garcon venu d'une autre planete."]
    )
    text: Optional[str] = Field(
        default=None,
        description="Texte a vectoriser si fourni directement",
        examples=["L'enfant noir - Camara Laye - Un jeune garcon grandit en Guinee..."]
    )

    model_config = ConfigDict(populate_by_name=True)


class VectorizeResponse(BaseModel):
    """
    Schema de la reponse POST /vectorize.
    
    Attributes:
        book_id: L'ID du livre vectorise
        embedding_size: La dimension du vecteur genere (384 pour MiniLM)
        status: Le statut de l'operation ('success' ou 'error')
    """
    book_id: int
    embedding_size: int
    status: str


class FeedbackRequest(BaseModel):
    """
    Schema de la requete POST /feedback.
    """
    session_id: str = Field(..., description="ID de la session de chat")
    message_id: str = Field(..., description="ID du message evalue")
    is_helpful: bool = Field(..., description="True si le message est utile, False sinon")


class FeedbackResponse(BaseModel):
    """
    Schema de la reponse POST /feedback.
    """
    status: str = Field(..., description="Statut de l'operation")



# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT PRINCIPAL : CHAT
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/chat", 
    response_model=ChatResponse, 
    summary="Dialoguer avec Kossi",
    description=(
        "Envoie un message a Kossi et recoit une reponse complete. "
        "L'orchestrateur analyse l'intention, recupere le contexte du catalogue, "
        "delegue aux agents specialises et retourne une reponse unifiee."
    ),
    responses={
        200: {"description": "Reponse de Kossi"},
        429: {"description": "Trop de requetes (rate limit)"},
        500: {"description": "Erreur interne du serveur"},
    }
)
async def chat_with_kossi(request: ChatRequest, req: Request):
    """
    Endpoint principal pour dialoguer avec Kossi.
    
    Cette route est le point d'entree pour toutes les conversations avec l'assistant.
    Elle effectue les etapes suivantes :
    
    1. Valide et normalise la requete
    2. Passe le message a l'orchestrateur multi-agents
    3. L'orchestrateur detecte l'intention et route vers l'agent approprie
    4. L'agent genere une reponse contextuelle
    5. Retourne la reponse au format JSON
    
    Args:
        request: Le corps de la requete (message, historique, profil)
        req: L'objet Request FastAPI (pour le rate limiting)
        
    Returns:
        ChatResponse: La reponse de Kossi avec l'intention detectee
        
    Raises:
        HTTPException: En cas d'erreur de traitement
    """
    try:
        # Log de la requete entrante (tronque pour eviter les logs trop longs)
        message_preview = request.message[:60] + "..." if len(request.message) > 60 else request.message
        logger.info(f"[/chat] Requete recue: '{message_preview}'")

        session_id = _ensure_session_id(request.session_id)
        user_data = _normalize_user_profile(request.user) or _normalize_user_profile(request.user_profile)

        # Conversion de l'historique Pydantic en liste de dicts simples
        # (requis par l'orchestrateur qui attend des dicts standard)
        history_dicts = [
            {"role": m.role, "content": m.content}
            for m in request.history
        ]

        # Detection d'intention pour enrichir eventuellement les metadata sources
        intent = _detect_intent(request.message)
        web_results: List[Dict[str, str]] = []
        if intent == "web":
            web_results = await SearchService.search_web(request.message, limit=5, fetch_page_content=True)

        # Traitement par l'orchestrateur central via l'instance exposée
        reply = await orchestrator.process(
            message=request.message,
            history=history_dicts,
            user_profile=user_data,
            function_name=request.function_name,
            session_id=session_id,
        )

        # Normaliser : si l'orchestrateur renvoie un dict, extraire le texte
        if isinstance(reply, dict):
            reply_text = reply.get("response") or str(reply)
            # Si l'orchestrateur a indiqué l'agent, le prioriser
            intent = reply.get("agent", intent)
            sources = reply.get("sources", web_results or None)
        else:
            reply_text = str(reply)
            sources = web_results or None

        logger.info(f"[/chat] Reponse generee ({len(reply_text)} caracteres)")

        # Sauvegarder l'historique dans la base de donnees
        DatabaseService.get_or_create_conversation(session_id, title=request.message[:120])
        DatabaseService.add_chat_message(session_id, role="user", content=request.message)
        DatabaseService.add_chat_message(
            session_id,
            role="assistant",
            content=reply_text,
            metadata={
                "intent": intent,
                "sources": sources or None,
            },
        )

        return ChatResponse(
            response=reply_text,
            intent=intent,
            sources=sources or None,
            session_id=session_id,
        )
    except Exception as e:
        # Log detaille de l'erreur pour le debug
        logger.error(f"[/chat] Erreur critique: {e}", exc_info=True)
        
        # Retourner une erreur HTTP propre sans exposer les details internes
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Kossi rencontre un probleme technique. "
                "Veuillez reessayer dans quelques instants."
            )
        )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT STREAMING SSE
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/chat/stream",
    summary="Dialoguer avec Kossi en streaming",
    description=(
        "Envoie un message a Kossi et recoit la reponse en streaming SSE. "
        "La reponse est envoyee par fragments au fur et a mesure de la generation, "
        "permettant une meilleure experience utilisateur pour les longues reponses."
    ),
    responses={
        200: {
            "description": "Stream de la reponse",
            "content": {"text/event-stream": {}},
        },
        429: {"description": "Trop de requetes (rate limit)"},
        500: {"description": "Erreur interne du serveur"},
    }
)
async def chat_stream(request: ChatRequest, req: Request):
    """
    Endpoint de streaming pour dialoguer avec Kossi.
    
    Cette route utilise Server-Sent Events (SSE) pour envoyer la reponse
    par fragments au fur et a mesure qu'elle est generee par le LLM.
    
    Le format des evenements SSE est :
    - `data: {"chunk": "texte"}` pour chaque fragment de texte
    - `data: {"done": true}` pour signaler la fin du stream
    - `data: {"error": "message"}` en cas d'erreur
    
    Args:
        request: Le corps de la requete (message, historique, profil)
        req: L'objet Request FastAPI
        
    Returns:
        StreamingResponse: Un flux SSE de fragments de texte
    """
    
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le champ 'message' doit contenir du texte non vide."
        )

    async def generate_sse():
        """
        Generateur asynchrone pour le streaming SSE.
        
        Yields:
            str: Evenements SSE au format "data: {...}\\n\\n"
        """
        try:
            # Log de la requete
            message_preview = request.message[:60] + "..." if len(request.message) > 60 else request.message
            logger.info(f"[/chat/stream] Debut du streaming pour: '{message_preview}'")
            
            session_id = _ensure_session_id(request.session_id)
            user_data = _normalize_user_profile(request.user) or _normalize_user_profile(request.user_profile)

            # Conversion de l'historique
            history_dicts = [
                {"role": m.role, "content": m.content}
                for m in request.history
            ]
            
            # Construction du contexte et des messages pour le LLM
            # Note: Pour le streaming, on utilise directement le LLM sans passer
            # par l'orchestrateur complet (qui ne supporte pas encore le streaming)
            from fastapi_kossi.services.memory_service import MemoryService
            from fastapi_kossi.core.settings import FILE_SYSTEM_PROMPT
            
            # Construire le contexte utilisateur
            user_summary = MemoryService.format_user_summary(user_data) if user_data else ""
            history_context = MemoryService.build_chat_history_context(history_dicts, limit=8)
            # Détecter l'intention pour charger le contexte pertinent
            intent = _detect_intent(request.message)
            is_web_query = intent == "web"
            is_catalog_query = intent in ("catalog", "recommendation")
            
            sources = []
            web_results = []
            matched_books = []
            
            if is_web_query:
                web_results = await SearchService.search_web(request.message, limit=5, fetch_page_content=True)
                sources = web_results
            elif is_catalog_query:
                try:
                    books = DatabaseService.get_all_books()
                    if books:
                        top_titles = await SearchService.hybrid_search_books(books, request.message, limit=5)
                        title_set = set(top_titles)
                        for book in books:
                            titre = book.get("titre") or book.get("title") or ""
                            if titre in title_set:
                                matched_books.append(book)
                            if len(matched_books) >= 5:
                                break
                    
                    for book in matched_books:
                        sources.append({
                            "title": f"📚 {book.get('titre') or book.get('title')}",
                            "url": f"https://bibliotheque-caeb.bj/catalogue?q={book.get('titre') or book.get('title')}",
                            "snippet": f"Auteur : {book.get('auteur') or 'Inconnu'} | Genre : {book.get('genre') or 'Inconnu'} | Statut : {'Disponible' if book.get('disponible', True) else 'Emprunté'}"
                        })
                except Exception as e:
                    logger.warning(f"Erreur lors de la récupération des livres en streaming : {e}")

            # Construire les messages pour le LLM
            messages = [
                {"role": "system", "content": FILE_SYSTEM_PROMPT},
            ]
            if user_summary:
                messages.append({"role": "system", "content": f"Profil utilisateur:\n{user_summary}"})
            if history_dicts:
                # Inclure l'historique réel des messages pour conserver le contexte de la conversation
                messages.extend(history_dicts[-8:])
            elif history_context:
                # En cas d'historique absent, utiliser le résumé du contexte
                messages.append({"role": "system", "content": history_context})
            if request.function_name:
                messages.append({"role": "system", "content": f"Function parameter: {request.function_name}"})

            # Injection du contexte dans le prompt système
            if is_web_query and web_results:
                web_context_lines = [
                    "Résultats de recherche web disponibles :",
                ]
                for idx, result in enumerate(web_results, start=1):
                    title = result.get("title") or result.get("page_title") or "Sans titre"
                    url = result.get("url") or ""
                    snippet = result.get("page_excerpt") or result.get("snippet") or ""
                    entry = f"[{idx}] {title}"
                    if url:
                        entry += f" - {url}"
                    if snippet:
                        entry += f"\n{snippet.strip()}"
                    web_context_lines.append(entry)
                web_context_lines.append("\nÀ la fin de ta réponse, ajoute une section 'Sources consultées' listant les résultats utilisés.")
                messages.append({"role": "system", "content": "\n".join(web_context_lines)})
                messages.append({
                    "role": "system",
                    "content": (
                        "Tu dois utiliser uniquement les résultats web fournis ci-dessus pour répondre. "
                        "Ne pas inventer d'informations. "
                        "Indique, si tu fais référence à un résultat web, le numéro de source entre crochets comme [1], [2], etc."
                    ),
                })
            elif is_web_query:
                messages.append({
                    "role": "system",
                    "content": (
                        "Aucune source web n'a pu être récupérée. Réponds honnêtement sans inventer de faits, "
                        "et propose des informations utiles sur la bibliothèque si possible."
                    ),
                })
            elif is_catalog_query and matched_books:
                rag_parts = ["Voici les livres les plus pertinents de notre catalogue :"]
                for idx, book in enumerate(matched_books, start=1):
                    titre = book.get("titre") or "Titre inconnu"
                    auteur = book.get("auteur") or "Auteur inconnu"
                    genre = book.get("genre") or ""
                    resume = book.get("resume") or book.get("description") or ""
                    disponible = "✅ Disponible" if book.get("disponible", True) else "❌ Non disponible"
                    entry = f"{idx}. **{titre}** par {auteur}"
                    if genre:
                        entry += f" | Genre : {genre}"
                    if resume:
                        entry += f"\n   Résumé : {resume[:150]}..."
                    entry += f"\n   Statut : {disponible}"
                    rag_parts.append(entry)
                
                messages.append({
                    "role": "system",
                    "content": f"--- CONTEXTE CATALOGUE (LIVRES) ---\n" + "\n".join(rag_parts) + "\n--- FIN CONTEXTE CATALOGUE ---"
                })
                messages.append({
                    "role": "system",
                    "content": (
                        "Tu es l'Agent Catalogue de la Bibliothèque CAEB de Natitingou. Utilise les livres du catalogue "
                        "ci-dessus pour formuler ta réponse. Présente-les de manière claire et cite leur statut de disponibilité."
                    ),
                })

            messages.append({"role": "user", "content": request.message})
            
            # Streamer la reponse via l'orchestrateur (permet aux tests de patcher process_stream)
            full_response = ""
            async for chunk in orchestrator.process_stream(
                messages=messages,
                message=request.message,
                history=history_dicts,
                user_profile=user_data,
                function_name=request.function_name,
                session_id=session_id,
            ):
                full_response += chunk
                # Envoyer le fragment au format SSE
                event_data = json.dumps({"chunk": chunk}, ensure_ascii=False)
                yield f"data: {event_data}\n\n"
            
            # Signaler la fin du stream avec metadata
            metadata = {
                "done": True,
                "total_length": len(full_response),
                "agent": "kossi-stream",
                "cached": False,
            }
            if sources:
                metadata["sources"] = sources

            # Enregistrer la conversation et le message de streaming en base de données
            DatabaseService.get_or_create_conversation(session_id, title=request.message[:120])
            DatabaseService.add_chat_message(session_id, role="user", content=request.message)
            DatabaseService.add_chat_message(
                session_id,
                role="assistant",
                content=full_response,
                metadata={
                    "intent": intent,
                    "sources": sources or None,
                },
            )

            yield f"data: {json.dumps(metadata, ensure_ascii=False)}\n\n"
            
            logger.info(f"[/chat/stream] Streaming termine ({len(full_response)} caracteres)")
            
        except Exception as e:
            logger.error(f"[/chat/stream] Erreur: {e}", exc_info=True)
            error_data = json.dumps({
                "error": "Kossi rencontre un probleme technique.",
                "done": True
            }, ensure_ascii=False)
            yield f"data: {error_data}\n\n"
    
    # Retourner une StreamingResponse avec le bon content-type pour SSE
    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Desactive le buffering nginx
        }
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS D'HISTORIQUE DE CONVERSATION
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/conversations",
    response_model=List[ConversationSummary],
    summary="Liste des conversations enregistrées",
)
async def list_conversations():
    """Retourne les conversations les plus récentes sauvegardées en base."""
    return DatabaseService.get_recent_conversations()


@router.get(
    "/conversations/{session_id}",
    response_model=ConversationDetail,
    summary="Récupère une conversation par session_id",
)
async def get_conversation(session_id: str):
    """Retourne une conversation et ses messages par identifiant de session."""
    conversation = DatabaseService.get_conversation(session_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation introuvable",
        )
    return conversation


@router.delete(
    "/conversations/{session_id}",
    summary="Supprime une conversation et son historique",
)
async def delete_conversation(session_id: str):
    """Supprime une conversation ainsi que tous ses messages."""
    deleted = DatabaseService.delete_conversation(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation introuvable",
        )
    return {"status": "success"}


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT VECTORIZE
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/vectorize", 
    response_model=VectorizeResponse, 
    summary="Generer l'embedding d'un livre",
    description=(
        "Genere un vecteur d'embedding pour un livre et le sauvegarde dans Django. "
        "Utilise pour la recherche semantique (RAG) dans le catalogue."
    ),
    responses={
        200: {"description": "Embedding genere avec succes"},
        429: {"description": "Trop de requetes (rate limit)"},
        500: {"description": "Erreur de generation"},
    }
)
async def vectorize_book(request: VectorizeRequest, req: Request):
    """
    Genere et sauvegarde l'embedding d'un livre.
    
    Cette route est utilisee pour :
    - Populer les embeddings lors de l'import initial du catalogue
    - Mettre a jour l'embedding quand un livre est modifie
    - Generer l'embedding pour les nouveaux livres ajoutes
    
    L'embedding est un vecteur de 384 dimensions (pour MiniLM) qui capture
    la semantique du texte. Il permet ensuite de faire des recherches par
    similarite (RAG) dans le catalogue.
    
    Args:
        request: Le corps de la requete (book_id, text)
        req: L'objet Request FastAPI
        
    Returns:
        VectorizeResponse: Confirmation avec la taille du vecteur
        
    Raises:
        HTTPException: Si la generation ou la sauvegarde echoue
    """
    import httpx

    try:
        logger.info(f"[/vectorize] Generation d'embedding pour livre ID={request.book_id}")

        # Selection de l'ID du livre et préparation du texte à vectoriser
        book_id = request.book_id if request.book_id is not None else request.id
        if book_id is None:
            raise ValueError("L'identifiant du livre est requis")

        text = request.text
        if not text:
            text_parts = [part for part in [request.title, request.author, request.summary] if part]
            text = " \n".join(text_parts)

        if not text:
            raise ValueError("Le texte a vectoriser est requis")

        # Generation de l'embedding via le service d'embeddings
        book_id = request.book_id if request.book_id is not None else request.id
        embedding = await EmbeddingService.generate_embedding(text)

        # Verification que l'embedding est valide
        if not embedding:
            raise ValueError("L'embedding genere est vide")
        
        if len(embedding) != 384:
            logger.warning(
                f"[/vectorize] Dimension inattendue: {len(embedding)} au lieu de 384"
            )

        # Sauvegarde dans la BD SQLite locale
        # Utilise le DatabaseService pour mettre a jour le livre
        updated_book = DatabaseService.update_book(
            book_id, 
            {"embedding": embedding}
        )
        
        if not updated_book:
            logger.warning(
                f"[/vectorize] Livre {request.book_id} non trouve en BD"
            )

        logger.info(
            f"[/vectorize] Embedding genere avec succes: "
            f"livre={book_id}, dimension={len(embedding)}"
        )
        
        return VectorizeResponse(
            book_id=book_id,
            embedding_size=len(embedding),
            status="success"
        )

    except ValueError as e:
        logger.debug(f"[/vectorize] Donnees invalides: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[/vectorize] Erreur: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la vectorisation: {str(e)}"
        )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT FEEDBACK
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Envoyer un feedback",
    description="Permet a l'utilisateur de donner un feedback (positif/negatif) sur une reponse."
)
async def submit_feedback(request: FeedbackRequest):
    """
    Enregistre le feedback utilisateur pour une reponse donnee.
    
    Utile pour l'amelioration continue du modele et des prompts.
    """
    logger.info(f"[/feedback] Session {request.session_id}, Message {request.message_id}, Utile: {request.is_helpful}")
    
    # Ici, on pourrait sauvegarder le feedback en base de donnees
    # ou l'envoyer a un service de monitoring.
    
    return FeedbackResponse(status="success")


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT DEBUG (optionnel)
# ══════════════════════════════════════════════════════════════════════════════

@router.get(
    "/chat/debug",
    summary="Informations de debug",
    description="Retourne des informations de debug sur le service de chat.",
    include_in_schema=False,  # Cache de la documentation
)
async def chat_debug():
    """
    Retourne des informations de debug sur le service.
    
    Cet endpoint est cache de la documentation Swagger et ne devrait etre
    accessible qu'en mode developpement.
    """
    from fastapi_kossi.core.settings import DEBUG_MODE
    
    if not DEBUG_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endpoint non disponible"
        )
    
    return {
        "status": "debug",
        "llm_stats": LLMService.get_stats(),
        "rate_limiting": SLOWAPI_AVAILABLE and limiter is not None,
    }
