import os
import re
import httpx
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Charger les variables d'environnement depuis un fichier .env
# Cela permet de stocker la clé API DeepSeek en dehors du code source.
load_dotenv()

# URL du backend Django + DRF pour accéder au catalogue et aux recommandations.
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")

# Nombre maximum de recommandations de livres à renvoyer.
MAX_SUGGESTED_BOOKS = 5

# Initialiser l'application FastAPI avec des métadonnées.
app = FastAPI(
    title="Kossi AI Service",
    description="Micro-service d'intelligence artificielle pour la bibliothèque CAEB",
    version="1.0.0"
)

# Configuration CORS pour autoriser l'accès depuis le frontend.
# En développement, on autorise toutes les origines par simplicité.
# En production, il faudra restreindre allow_origins aux domaines approuvés.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À restreindre en production (ex: http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Modèles de données (Pydantic) ─────────────────────────────────────────────
# Ces classes définissent la forme des requêtes et réponses attendues.

class ChatMessage(BaseModel):
    # Le rôle est 'user' ou 'assistant' et le contenu est le message textuel.
    role: str
    content: str

class ChatRequest(BaseModel):
    # Identifiant de l'utilisateur qui envoie le chat.
    user_id: str
    # Liste des messages échangés dans le dialogue.
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    # Réponse principale générée par Kossi.
    response: str
    # Suggestions de livres basées sur le contexte de la conversation.
    suggested_books: Optional[List[str]] = []

class VectorizeRequest(BaseModel):
    # Identifiant du livre à vectoriser.
    book_id: str
    # Contenu textuel du livre ou de la description à transformer en vecteur.
    text_content: str


def _normalize_text(text: str) -> str:
    """Nettoie et normalise un texte pour une recherche simple."""
    return re.sub(r"\s+", " ", text.lower()).strip()


def _extract_search_terms(messages: List[ChatMessage]) -> List[str]:
    """Extrait des mots-clés simples depuis le dernier message utilisateur."""
    stop_words = {
        'je', 'tu', 'il', 'elle', 'nous', 'vous', 'les', 'des', 'du', 'de',
        'la', 'le', 'un', 'une', 'pour', 'avec', 'sur', 'dans', 'chez', 'et',
        'ou', 'mais', 'a', 'au', 'aux', 'ce', 'ces', 'mon', 'ton', 'son',
        'leur', 'leurs', 'plus', 'moins', 'très', 'bien', 'aussi', 'peut',
        'pouvez', 'voulez', 'recommande', 'recommander', 'cherche', 'cherchez',
    }
    last_user_message = ""
    for msg in reversed(messages):
        if msg.role == "user" and msg.content.strip():
            last_user_message = msg.content
            break

    if not last_user_message:
        return []

    words = re.findall(r"\w+", last_user_message.lower())
    terms = [w for w in words if len(w) > 3 and w not in stop_words]
    return terms[:MAX_SUGGESTED_BOOKS]


async def _fetch_books_from_backend() -> List[dict]:
    """Récupère la liste des livres du backend pour faire un filtrage local simple."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BACKEND_API_URL}/livres/", timeout=30.0)
        if response.status_code == 200:
            return response.json()
    return []


def _match_books(books: List[dict], terms: List[str], limit: int = MAX_SUGGESTED_BOOKS) -> List[str]:
    """Sélectionne les livres dont le titre, l'auteur ou les mots-clés correspondent aux termes."""
    if not terms or not books:
        return []

    scored_books = []
    for book in books:
        text_parts = []
        for field in ["titre", "auteur", "genre", "sous_genre", "resume", "mots_cles", "description"]:
            value = book.get(field)
            if isinstance(value, list):
                value = " ".join(map(str, value))
            if value:
                text_parts.append(str(value).lower())

        combined = " ".join(text_parts)
        score = sum(1 for term in terms if term in combined)
        if score > 0:
            scored_books.append((score, book))

    scored_books.sort(key=lambda item: item[0], reverse=True)
    result = []
    for _, book in scored_books[:limit]:
        title = book.get("titre") or book.get("Titre") or book.get("title")
        if title:
            result.append(str(title))

    if not result:
        # fallback: retourner les premiers livres si aucun mot-clé ne match
        result = [str(book.get("titre") or book.get("Titre") or book.get("title")) for book in books[:limit] if book]

    return result[:limit]


async def _fetch_backend_recommendations(authorization: Optional[str]) -> List[str]:
    """Récupère des recommandations personnalisées depuis le backend si un token utilisateur est disponible."""
    if not authorization:
        return []

    headers = {"Authorization": authorization}
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BACKEND_API_URL}/recommandations/?n={MAX_SUGGESTED_BOOKS}",
            headers=headers,
            timeout=15.0,
        )
        if response.status_code == 200:
            payload = response.json()
            recommendations = payload.get("recommendations", [])
            normalized = []
            for item in recommendations:
                if isinstance(item, dict):
                    normalized.append(
                        str(item.get("Titre") or item.get("titre") or item.get("title") or item)
                    )
                else:
                    normalized.append(str(item))
            return [title for title in normalized if title][:MAX_SUGGESTED_BOOKS]

    return []

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    # Endpoint simple pour vérifier que le service est en ligne.
    return {"status": "ok", "message": "Service Kossi AI opérationnel"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_kossi(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Endpoint principal pour le chat avec Kossi.
    Kossi se comporte comme un bibliothécaire expert et répond aux questions des utilisateurs.
    """

    # Récupérer la clé API depuis les variables d'environnement.
    api_key = os.getenv("OPENROUTER_API_KEY")

    # Prompt système envoyé à l'API externe pour définir le comportement de Kossi.
    system_prompt = {
        "role": "system",
        "content": (
            "Tu es Kossi, l'assistant intelligent et bibliothécaire de la Bibliothèque CAEB de Natitingou. "
            "Tu dois aider les utilisateurs à trouver des livres, répondre à leurs questions sur la bibliothèque "
            "et formuler des recommandations."
        )
    }

    # Convertir les messages reçus en format attendu par l'API DeepSeek.
    messages = [system_prompt]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    if not api_key:
        # Si l'API n'est pas configurée, retourner une réponse de secours claire.
        return ChatResponse(
            response=(
                "Je suis Kossi, votre bibliothécaire. Je ne peux pas joindre le service IA externe en ce moment, "
                "mais je peux vous aider avec des recommandations générales et des conseils de bibliothèque."
            ),
            suggested_books=[]
        )

    try:
        async with httpx.AsyncClient() as client:
            # Appel de l'API externe de génération de texte.
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8001",
                    "X-Title": "Kossi AI"
                },
                json={
                    "model": "openrouter/free",
                    "messages": messages,
                    "temperature": 0.7
                },
                timeout=30.0
            )

            # Logs de debug pour inspecter la réponse de l'API externe.
            print("Status:", response.status_code)
            print("Réponse DeepSeek:", response.text)

            if response.status_code != 200:
                print(response.text)

                return ChatResponse(
                         response="Le service IA est indisponible ou le solde API est insuffisant.",
                        suggested_books=[]
                )

            data = response.json()

            # Extraire la réponse textuelle fournie par le modèle.
            bot_reply = data["choices"][0]["message"]["content"]

            # Tenter d'obtenir des recommandations du backend si l'utilisateur est authentifié.
            suggested_books = await _fetch_backend_recommendations(authorization)

            if not suggested_books:
                # Fallback : rechercher localement des livres pertinents dans le catalogue.
                terms = _extract_search_terms(request.messages)
                books = await _fetch_books_from_backend()
                suggested_books = _match_books(books, terms)

            return ChatResponse(response=bot_reply, suggested_books=suggested_books)

    except Exception as e:
        # En cas d'erreur, enregistrer le détail côté serveur et renvoyer une erreur HTTP.
        print(f"Erreur DeepSeek: {e}")
        raise HTTPException(status_code=500, detail="Erreur de communication avec l'API IA.")

@app.post("/vectorize")
def vectorize_book(request: VectorizeRequest):
    """
    Génère un vecteur d'embedding pour un livre donné.
    Cet endpoint est prévu pour indxer des livres en vue d'une recherche sémantique.
    """

    # Le code de vectorisation réel doit être implémenté ici, par exemple avec une librairie
    # de sentence-transformers ou une API externe qui renvoie un embedding.
    return {"status": "success", "book_id": request.book_id, "vector_size": 384}

if __name__ == "__main__":
    # Lancer l'application en mode développement si le fichier est exécuté directement.
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
