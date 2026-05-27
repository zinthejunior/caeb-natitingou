# ── Imports de la stdlib Python ───────────────────────────────────────────────
import os  # Accès aux variables d'environnement et chemins du système
import re  # Expressions régulières pour recherche et nettoyage de texte
import datetime  # Gestion des dates (parsing ISO, calcul d'âge)

# ── Imports de bibliothèques externes ──────────────────────────────────────────
import httpx  # Client HTTP asynchrone pour appels APIs (SerpAPI, Bing, DuckDuckGo, OpenRouter)

# ── Imports de FastAPI ─────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException, Header  # Framework web async, gestion erreurs HTTP, en-têtes
from fastapi.middleware.cors import CORSMiddleware  # Middleware CORS pour autoriser requêtes cross-origin

# ── Imports de Pydantic ────────────────────────────────────────────────────────
from pydantic import BaseModel  # Classe de base pour validation de schémas de données (requêtes/réponses)

# ── Imports de typing ──────────────────────────────────────────────────────────
from typing import Any, Dict, List, Optional  # Type hints pour annotation de types Python
# Any : type générique ; Dict : dictionnaire ; List : liste ; Optional : nullable (ou None)

# ── Imports de python-dotenv ──────────────────────────────────────────────────
from dotenv import load_dotenv  # Charger variables d'environnement depuis fichier .env (configuration locale)

# Charger les variables d'environnement depuis un fichier .env
# Cela permet de stocker la clé API DeepSeek en dehors du code source.
load_dotenv()

# URL du backend Django + DRF pour accéder au catalogue et aux recommandations.
# Toutes les données métier (livres, clubs, événements, actualités, utilisateur)
# sont récupérées depuis cette API backend, pas depuis le frontend.
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")

# Nombre maximum de recommandations de livres à renvoyer dans une réponse.
# Limite la taille du payload et améliore les performances.
MAX_SUGGESTED_BOOKS = 5

# Nombre maximum de messages de l'historique à inclure dans le prompt du modèle.
# Cela évite de surcharger le contexte du LLM avec trop d'historique ancien.
MAX_CHAT_HISTORY = 50

# Chemin vers le fichier contenant le prompt système principal (ne pas modifier ce fichier).
PROMPT_FILE_PATH = os.path.join(os.path.dirname(__file__), "Prompt_Systems.txt")

# Lire le prompt système depuis le fichier au démarrage. Le contenu du fichier
# constitue le prompt maître — on peut ajouter des instructions supplémentaires
# au moment d'appeler le modèle, mais on ne doit jamais retirer le texte
# original du fichier.
try:
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as _pf:
        FILE_SYSTEM_PROMPT = _pf.read().strip()
except Exception:
    FILE_SYSTEM_PROMPT = ""

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
    # Identifiant métier optionnel envoyé par le frontend.
    # Les données de profil utilisateur sont récupérées côté backend depuis la base de données.
    # Dans ce service, l'important est que Kossi lise les informations utilisateur
    # depuis la base via l'API Django, et non pas depuis un payload frontal.
    user_id: Optional[str] = None
    # Liste des messages échangés dans le dialogue.
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    # Réponse principale générée par Kossi.
    response: str
    # Suggestions de livres basées sur le contexte de la conversation.
    suggested_books: Optional[List[str]] = []
    # Sources externes (liste de dict {"title":..., "url": ..., "snippet":...})
    sources: Optional[List[Dict[str, str]]] = []

class VectorizeRequest(BaseModel):
    # Identifiant du livre à vectoriser.
    book_id: str
    # Contenu textuel du livre ou de la description à transformer en vecteur.
    text_content: str


def _normalize_text(text: str) -> str:
    """Nettoie et normalise un texte pour une recherche simple.
    
    Remplace les espaces multiples par un seul, convertit en minuscules
    et supprime les espaces de début/fin.
    """
    # re.sub(pattern, replacement, string) : remplace toutes les occurrences du pattern
    # r"\s+" : expression régulière pour un ou plusieurs espaces (\s = whitespace)
    return re.sub(r"\s+", " ", text.lower()).strip()


def _extract_search_terms(messages: List[ChatMessage]) -> List[str]:
    """Extrait des mots-clés simples depuis le dernier message utilisateur.
    
    Filtre les mots vides (articles, prépositions, etc.) et garde les termes
    pertinents pour la recherche locale (3+ caractères).
    Retourne une liste triée par pertinence pour le matching de livres.
    """
    # Ensemble (set) de mots vides ; les éléments d'un set sont vérifiés en O(1)
    stop_words = {
        'je', 'tu', 'il', 'elle', 'nous', 'vous', 'les', 'des', 'du', 'de',
        'la', 'le', 'un', 'une', 'pour', 'avec', 'sur', 'dans', 'chez', 'et',
        'ou', 'mais', 'a', 'au', 'aux', 'ce', 'ces', 'mon', 'ton', 'son',
        'leur', 'leurs', 'plus', 'moins', 'très', 'bien', 'aussi', 'peut',
        'pouvez', 'voulez', 'recommande', 'recommander', 'cherche', 'cherchez',
    }
    # Boucle inverse sur les messages pour trouver le dernier message utilisateur
    dernier_message_utilisateur = ""
    for msg in reversed(messages):
        if msg.role == "user" and msg.content.strip():
            dernier_message_utilisateur = msg.content
            break

    if not dernier_message_utilisateur:
        return []

    # re.findall(pattern, string) : retourne tous les mots (séquences de caractères alphanumériques)
    # \w+ : une ou plusieurs caractéristiques de mot (lettres, chiffres, _)
    words = re.findall(r"\w+", dernier_message_utilisateur.lower())
    # List comprehension : filtre les mots avec len > 3 et pas dans stop_words
    # Retourne jusqu'à MAX_SUGGESTED_BOOKS termes pour limiter la recherche
    termes = [w for w in words if len(w) > 3 and w not in stop_words]
    return termes[:MAX_SUGGESTED_BOOKS]


async def _fetch_backend_resource(path: str, authorization: Optional[str] = None, params: Optional[dict] = None) -> Any:
    """Récupère une ressource du backend DRF et retourne le JSON si disponible.

    Cette fonction regroupe tous les appels vers l'API backend de la base de données.
    Elle accepte un token Authorization pour récupérer les données utilisateur
    du profil connecté via /api/utilisateurs/me/.
    """
    # Dictionnaire pour stocker les en-têtes HTTP (vide si pas d'authentification)
    entetes = {}
    if authorization:
        entetes["Authorization"] = authorization

    async with httpx.AsyncClient() as client:
        # Appel HTTP GET asynchrone avec timeout ; f-string pour construire l'URL
        # lstrip('/') supprime les slashes en début de path (normalisation URL)
        response = await client.get(
            f"{BACKEND_API_URL}/{path.lstrip('/')}",
            headers=entetes,
            params=params,
            timeout=30.0,
        )
        # Vérifier le code HTTP 200 avant de parser le JSON
        if response.status_code == 200:
            return response.json()
    return None


async def _post_backend_resource(path: str, json_data: Dict[str, Any], authorization: Optional[str] = None) -> Any:
    """Envoie un POST vers le backend DRF et retourne la réponse JSON.
    
    Utilisé pour créer ou modifier des ressources (sessions, messages, etc.).
    """
    # Dictionnaire d'en-têtes ; on précise que le body est du JSON
    entetes = {"Content-Type": "application/json"}
    if authorization:
        entetes["Authorization"] = authorization

    async with httpx.AsyncClient() as client:
        # POST avec json_data encodé automatiquement en JSON par httpx
        response = await client.post(
            f"{BACKEND_API_URL}/{path.lstrip('/')}",
            headers=entetes,
            json=json_data,
            timeout=30.0,
        )
        # Accepter les codes 200 (mise à jour) et 201 (création)
        if response.status_code in (200, 201):
            return response.json()
    return None


async def _fetch_books_from_backend() -> List[dict]:
    # Récupère la liste complète des livres du catalogue depuis l'endpoint du backend.
    data = await _fetch_backend_resource("livres/")
    return data if isinstance(data, list) else []


async def _fetch_clubs_from_backend() -> List[dict]:
    # Récupère la liste complète des clubs de lecture depuis l'endpoint du backend.
    data = await _fetch_backend_resource("clubs/")
    return data if isinstance(data, list) else []


async def _fetch_events_from_backend() -> List[dict]:
    # Récupère la liste complète des événements et cours depuis l'endpoint du backend.
    data = await _fetch_backend_resource("evenements/")
    return data if isinstance(data, list) else []


async def _fetch_news_from_backend() -> List[dict]:
    # Récupère la liste complète des actualités depuis l'endpoint du backend.
    data = await _fetch_backend_resource("actualites/")
    return data if isinstance(data, list) else []


async def _fetch_user_profile(authorization: Optional[str]) -> dict:
    # Si aucun token Authorization n'est transmis, on ne peut pas récupérer
    # le profil utilisateur connecté. Cela évite de s'appuyer sur des données
    # utilisateur non vérifiées venant du frontend.
    if not authorization:
        return {}
    data = await _fetch_backend_resource("utilisateurs/me/", authorization=authorization)
    return data if isinstance(data, dict) else {}


async def _fetch_user_chat_sessions(authorization: Optional[str]) -> List[dict]:
    # Récupère les sessions de chat de l'utilisateur connecté.
    if not authorization:
        return []
    data = await _fetch_backend_resource("chat/", authorization=authorization)
    return data if isinstance(data, list) else []


async def _create_chat_session(authorization: Optional[str], title: str = "Session Kossi") -> Optional[dict]:
    # Crée une nouvelle session de chat pour l'utilisateur connecté.
    if not authorization:
        return None
    data = await _post_backend_resource("chat/", {"titre": title}, authorization=authorization)
    return data if isinstance(data, dict) else None


async def _append_chat_message(session_id: str, role: str, content: str, authorization: Optional[str]) -> Optional[dict]:
    # Ajoute un message à une session de chat existante en base.
    if not authorization:
        return None
    data = await _post_backend_resource(f"chat/{session_id}/messages/", {"role": role, "content": content}, authorization=authorization)
    return data if isinstance(data, dict) else None


def _build_chat_history_context(messages: List[dict], limit: int = MAX_CHAT_HISTORY) -> str:
    # Construit un résumé de l'historique de chat que le modèle pourra lire.
    if not messages:
        return ""
    history_lines = []
    for message in messages[-limit:]:
        role = message.get("role", "unknown")
        content = message.get("content", "")
        history_lines.append(f"{role.capitalize()}: {content}")
    return "Historique de discussion :\n" + "\n".join(history_lines) + "\n"


async def _search_web(query: str, limit: int = 5) -> List[Dict[str, str]]:
    """Recherche web simple avec fallback.

    Priorité : SerpAPI -> Bing Web Search -> DuckDuckGo Instant Answer
    Retourne une liste d'objets {title, url, snippet}.
    """
    if not query or not query.strip():
        return []

    results: List[Dict[str, str]] = []
    serpapi_key = os.getenv("SERPAPI_API_KEY")
    bing_key = os.getenv("BING_SEARCH_API_KEY")

    try:
        if serpapi_key:
            # SerpAPI search
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params={"q": query, "api_key": serpapi_key, "num": limit},
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("organic_results", [])[:limit]:
                        results.append({
                            "title": item.get("title") or "",
                            "url": item.get("link") or item.get("formatted_url") or "",
                            "snippet": item.get("snippet") or item.get("snippet_highlighted") or "",
                        })
                    if results:
                        return results

        if bing_key:
            # Bing Web Search
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.bing.microsoft.com/v7.0/search",
                    headers={"Ocp-Apim-Subscription-Key": bing_key},
                    params={"q": query, "count": limit},
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    web_pages = data.get("webPages", {}).get("value", [])
                    for item in web_pages[:limit]:
                        results.append({
                            "title": item.get("name") or "",
                            "url": item.get("url") or "",
                            "snippet": item.get("snippet") or "",
                        })
                    if results:
                        return results

        # Fallback: DuckDuckGo Instant Answer API (limité mais sans clé)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
                timeout=15.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                abstract = data.get("AbstractText")
                if abstract:
                    results.append({"title": data.get("Heading") or query, "url": data.get("AbstractURL") or "", "snippet": abstract})
                # Related topics may contain useful links
                for topic in data.get("RelatedTopics", [])[:limit]:
                    if isinstance(topic, dict):
                        text = topic.get("Text") or ""
                        first_url = ""
                        if topic.get("FirstURL"):
                            first_url = topic.get("FirstURL")
                        results.append({"title": topic.get("Text") or query, "url": first_url, "snippet": text})
                return results[:limit]
    except Exception:
        return []

    return results[:limit]


def _summarize_items(items: List[dict], key: str, limit: int = 5) -> str:
    # Extrait et retourne un résumé comma-séparé des titres/noms d'une liste d'items.
    # Essaie d'abord la clé en majuscule, puis en minuscule (flexibilité API).
    # Limité au nombre spécifié pour éviter des listes trop longues.
    if not items:
        return "aucun élément disponible"
    titres = []  # Liste pour accumuler les valeurs extraites
    for item in items[:limit]:
        # or : opérateur court-circuit ; essaie d'abord key, puis key.lower()
        valeur = item.get(key) or item.get(key.lower())
        if valeur:
            # str() : convertit n'importe quel type en chaîne (genre listes, nombres, etc.)
            titres.append(str(valeur))
    # ", ".join() : fusionner une liste de chaînes avec un séparateur
    return ", ".join(titres)


def _compute_age(date_str: str) -> Optional[int]:
    # Calcule l'âge approximatif en années à partir d'une date de naissance en ISO format.
    # Retourne None en cas d'erreur de parsing.
    # Utilisé pour enrichir le contexte utilisateur sans stocker la date brute.
    try:
        # datetime.date.fromisoformat : parse une chaîne ISO (YYYY-MM-DD) en objet date
        date_naissance = datetime.date.fromisoformat(date_str)
        date_actuelle = datetime.date.today()
        # Calcul : années écoulées moins 1 si anniversaire non atteint cette année
        # ((mois, jour) < (mois, jour)) retourne True/False (1 ou 0)
        age = date_actuelle.year - date_naissance.year - ((date_actuelle.month, date_actuelle.day) < (date_naissance.month, date_naissance.day))
        return age
    except Exception:
        # Si fromisoformat échoue (format invalide), retourner None sans lever d'erreur
        return None


def _format_user_summary(user: dict) -> str:
    # Formate les informations non-sensibles du profil utilisateur en texte lisible.
    # Inclut prénom, nom, niveau d'études, âge approximatif, préférences et bio.
    # Le texte est inséré dans le contexte système envoyé au modèle LLM.
    if not user:
        return ""

    parts = []
    # Essaie plusieurs variantes de champ (flexibilité vis-à-vis du backend).
    prenom = user.get("prenom") or user.get("firstName") or user.get("first_name")
    nom = user.get("nom") or user.get("lastName") or user.get("last_name")
    if prenom or nom:
        parts.append(f"Utilisateur connecté : {prenom or ''} {nom or ''}".strip())

    niveau = user.get("niveau_etude") or user.get("educationLevel")
    if niveau:
        parts.append(f"Niveau d'études : {niveau}")

    dob = user.get("date_naissance")
    age = _compute_age(dob) if dob else None
    if age is not None:
        parts.append(f"Âge approximatif : {age} ans")
    elif dob:
        parts.append(f"Date de naissance : {dob}")

    preferences = user.get("preferredGenres") or user.get("genres_preferes") or user.get("sous_genre_prefere")
    if preferences:
        if isinstance(preferences, list):
            prefs = ", ".join(map(str, preferences))
        else:
            prefs = str(preferences)
        parts.append(f"Préférences : {prefs}")

    bio = user.get("bio")
    if bio:
        parts.append(f"Courte biographie : {bio}")

    return " \n".join(parts)


def _build_backend_context(books: List[dict], clubs: List[dict], events: List[dict], news: List[dict], user_profile: dict) -> str:
    # Construire un contexte texte qui sera inséré dans le prompt système envoyé
    # à l'API du modèle. Ce contexte informe Kossi des données métiers actuelles
    # disponibles dans la base de données.
    context = ["Données disponibles pour Kossi :"]

    # N'affichez les compteurs que s'ils sont supérieurs à 0 afin de ne pas
    # révéler au modèle (et donc à l'utilisateur) l'absence explicite de données.
    if books and len(books) > 0:
        context.append(f"- Catalogue : {len(books)} livres disponibles.")
    else:
        context.append("- Catalogue : données locales disponibles (consultables).")

    if clubs and len(clubs) > 0:
        context.append(f"- Clubs : {len(clubs)} organisations de lecture.")
    else:
        context.append("- Clubs : informations disponibles ou recherche en ligne possible.")

    if events and len(events) > 0:
        context.append(f"- Événements et cours : {len(events)} éléments.")
    else:
        context.append("- Événements et cours : informations disponibles ou recherche en ligne possible.")

    if news and len(news) > 0:
        context.append(f"- Actualités : {len(news)} publications.")
    else:
        context.append("- Actualités : informations disponibles ou recherche en ligne possible.")

    if books:
        context.append(f"Exemples de livres : {_summarize_items(books, 'titre', limit=6)}")
    if clubs:
        context.append(f"Exemples de clubs : {_summarize_items(clubs, 'nom', limit=6)}")
    if events:
        context.append(f"Exemples d'événements/cours : {_summarize_items(events, 'titre', limit=6)}")
    if news:
        context.append(f"Exemples d'informations : {_summarize_items(news, 'titre', limit=6)}")

    user_summary = _format_user_summary(user_profile)
    if user_summary:
        context.append("Utilisateur actuel :")
        context.append(user_summary)
        context.append("N'utilise que les informations non sensibles pour personnaliser tes réponses.")

    context.append(
        "Si le sujet concerne l'un de ces éléments (livres, clubs, événements, cours, actualités), tu dois répondre en tenant compte de ces données.")
    return "\n".join(context)


def _match_books(books: List[dict], terms: List[str], limit: int = MAX_SUGGESTED_BOOKS) -> List[str]:
    """Sélectionne les livres dont le titre, l'auteur ou les mots-clés correspondent aux termes.
    
    Attribue un score à chaque livre en fonction du nombre de termes trouvés dans
    son contenu (titre, auteur, genre, résumé, mots-clés). Retourne les livres
    les mieux notés jusqu'à la limite spécifiée.
    """
    if not terms or not books:
        return []

    livres_scores = []  # Liste des tuples (score, livre)
    for livre in books:
        parties_texte = []  # Accumuler tous les champs pertinents du livre
        # Chercher dans ces champs : titre, auteur, genre, résumé, mots-clés, description
        for champ in ["titre", "auteur", "genre", "sous_genre", "resume", "mots_cles", "description"]:
            valeur = livre.get(champ)
            # Si la valeur est une liste, la joindre avec des espaces
            if isinstance(valeur, list):
                valeur = " ".join(map(str, valeur))
            if valeur:
                parties_texte.append(str(valeur).lower())

        # Fusionner tous les champs en un seul texte pour chercher les termes
        texte_combine = " ".join(parties_texte)
        # Compter combien de termes apparaissent dans le texte
        score = sum(1 for terme in terms if terme in texte_combine)
        if score > 0:
            # Stocker le tuple (score, livre) pour tri ultérieur
            livres_scores.append((score, livre))

    # Tri décroissant par score (livres avec plus de correspondances d'abord)
    livres_scores.sort(key=lambda item: item[0], reverse=True)
    # Extraire les titres des livres les mieux notés
    resultat = []
    for _, livre in livres_scores[:limit]:
        titre = livre.get("titre") or livre.get("Titre") or livre.get("title")
        if titre:
            resultat.append(str(titre))

    if not resultat:
        # Fallback : retourner les premiers livres du catalogue si aucun mot-clé ne match
        resultat = [str(livre.get("titre") or livre.get("Titre") or livre.get("title")) for livre in books[:limit] if livre]

    return resultat[:limit]


async def _fetch_backend_recommendations(authorization: Optional[str]) -> List[str]:
    """Récupère des recommandations personnalisées depuis le backend si un token utilisateur est disponible.
    
    Appelle l'endpoint /recommandations/ avec le token d'authentification.
    Normalise les résultats (dictionnaires ou chaînes) et les retourne sous forme
    de titres de livres.
    """
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
    # Retourne un message de statut pour les health checks.
    return {"status": "ok", "message": "Service Kossi AI opérationnel"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_kossi(request: ChatRequest, authorization: Optional[str] = Header(None)):
    """
    Endpoint principal pour le chat avec Kossi.
    Kossi se comporte comme un bibliothécaire expert et répond aux questions des utilisateurs.
    """

    # Récupérer la clé API depuis les variables d'environnement.
    api_key = os.getenv("OPENROUTER_API_KEY")

    # Prompt système chargé depuis le fichier `Prompt_Systems.txt`.
    # Ce fichier contient le prompt maître (instructions système) que Kossi
    # doit toujours respecter. Ne pas remplacer ni supprimer ce contenu —
    # on peut uniquement ajouter des instructions complémentaires ci‑dessous.
    system_prompt_text = FILE_SYSTEM_PROMPT

    # Instructions additionnelles pour guider Kossi sur les données métier disponibles et les bonnes pratiques.:
    extra_instructions = (
        "\n\nInformations techniques :\n"
        "- Les données métier (catalogue, clubs, événements, actualités, profil utilisateur) proviennent de l'API backend.\n"
        "- N'utilise que les informations non sensibles du profil pour personnaliser les réponses.\n"
        "- L'historique de discussion de l'utilisateur (sessions) est disponible et peut être utilisé pour contextualiser les réponses.\n"
        "- Ne divulgue jamais les détails techniques internes, les clés ou l'architecture."
    )

    system_prompt = {"role": "system", "content": system_prompt_text + extra_instructions}

    # Charger les données du backend pour donner à Kossi un contexte métier riche.
    # IMPORTANT : toutes les informations métier proviennent de l'API Django/DRF
    # (BACKEND_API_URL). On ne lit pas le contenu envoyé par le frontend pour
    # ces données afin d'éviter les données non vérifiées ou manipulées.
    books = await _fetch_books_from_backend()
    clubs = await _fetch_clubs_from_backend()
    events = await _fetch_events_from_backend()
    news_items = await _fetch_news_from_backend()

    # Récupération du profil utilisateur connecté via le token Authorization.
    # Si aucun token n'est fourni, `user_profile` restera vide — ceci protège
    # l'accès aux données sensibles et évite de se fier à des payloads frontaux.
    user_profile = await _fetch_user_profile(authorization)

    backend_context = _build_backend_context(books, clubs, events, news_items, user_profile)

    # Charger ou créer la session de chat utilisateur pour stocker l'historique.
    chat_session = None
    chat_history = ""
    if authorization:
        sessions = await _fetch_user_chat_sessions(authorization)
        if sessions:
            sessions.sort(key=lambda s: s.get("updated_at") or s.get("created_at") or "", reverse=True)
            chat_session = sessions[0]
        if not chat_session:
            chat_session = await _create_chat_session(authorization)
        if chat_session:
            chat_history = _build_chat_history_context(chat_session.get("messages", []), limit=MAX_CHAT_HISTORY)

    # Recherche web automatique : interroger la toile pour la dernière question
    # de l'utilisateur afin de compléter les données internes si besoin.
    # NOTE : les résultats web ne remplacent pas les données locales. Ils sont
    # collectés comme sources externes et enregistrés pour traçabilité.
    sources: List[Dict[str, str]] = []
    last_user_text = None
    if request.messages:
        for m in reversed(request.messages):
            if m.role == "user" and m.content.strip():
                last_user_text = m.content.strip()
                break

    if last_user_text:
        # Effectuer une recherche web (SerpAPI -> Bing -> DuckDuckGo) pour
        # compléter l'information disponible localement. Les résultats sont
        # stockés dans `sources` et peuvent être utilisés en secours.
        web_sources = await _search_web(last_user_text, limit=5)
        if web_sources:
            sources = web_sources
            # Enregistrer les sources comme messages de type 'system' dans la
            # session pour assurer la traçabilité et permettre une revue
            # ultérieure (ex: marquer comme à vérifier si nécessaire).
            if authorization and chat_session:
                for src in sources:
                    content = f"Source: {src.get('title','')} - {src.get('url','')}\n{src.get('snippet','')[:400]}"
                    await _append_chat_message(str(chat_session.get("id")), "system", content, authorization)
        else:
            # Si la recherche web ne retourne rien, construire des sources à
            # partir des données locales (livres, clubs, événements, actualités)
            # afin d'éviter une liste de sources vide. Les URLs backend ne
            # doivent JAMAIS être exposées ; on laisse l'url vide.
            local_sources: List[Dict[str, str]] = []
            try:
                for book in (books or [])[:5]:
                    title = book.get("titre") or book.get("Titre") or book.get("title") or "Livre du catalogue"
                    snippet = (book.get("resume") or book.get("description") or "")[:400]
                    local_sources.append({"title": title, "url": "", "snippet": snippet})

                for club in (clubs or [])[:3]:
                    title = club.get("nom") or club.get("name") or "Club de lecture"
                    snippet = (club.get("description") or club.get("resume") or "")[:300]
                    local_sources.append({"title": title, "url": "", "snippet": snippet})

                for ev in (events or [])[:3]:
                    title = ev.get("titre") or ev.get("title") or "Événement"
                    snippet = (ev.get("description") or ev.get("resume") or "")[:300]
                    local_sources.append({"title": title, "url": "", "snippet": snippet})

                for n in (news_items or [])[:2]:
                    title = n.get("titre") or n.get("title") or "Actualité"
                    snippet = (n.get("contenu") or n.get("excerpt") or n.get("resume") or "")[:300]
                    local_sources.append({"title": title, "url": "", "snippet": snippet})
            except Exception:
                local_sources = []

            if local_sources:
                sources = local_sources[:5]
                if authorization and chat_session:
                    for src in sources:
                        content = f"Source locale: {src.get('title','')}\n{src.get('snippet','')[:400]}"
                        await _append_chat_message(str(chat_session.get("id")), "system", content, authorization)
            else:
                # Dernier recours : inclure une source générique sans exposer
                # l'URL backend, afin que `sources` ne soit jamais vide.
                summary = f"Données locales disponibles"
                sources = [{"title": "Catalogue de la bibliothèque", "url": "", "snippet": summary}]

    # Convertir les messages reçus en format attendu par l'API OpenRouter.
    # On envoie ici :
    # - le prompt système lu depuis `Prompt_Systems.txt` (autorité primaire),
    # - le contexte métier construit depuis le backend (sans exposer de champs
    #   sensibles),
    # - l'historique de la session (si disponible),
    # - puis la conversation utilisateur.
    # Ces couches garantissent que Kossi utilise prioritairement les données
    # backend et que les sources web ne servent que de complément.
    messages = [system_prompt]
    if backend_context:
        messages.append({"role": "system", "content": backend_context})
    if chat_history:
        messages.append({"role": "system", "content": chat_history})
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    # Si l'utilisateur est authentifié et qu'on a une session, on sauvegarde
    # le dernier message utilisateur côté backend pour conserver l'historique.
    if authorization and chat_session and request.messages:
        last_user_message = next(
            (msg for msg in reversed(request.messages) if msg.role == "user" and msg.content.strip()),
            None
        )
        if last_user_message:
            await _append_chat_message(str(chat_session.get("id")), "user", last_user_message.content, authorization)

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
            # Nous envoyons le prompt système + le contexte backend + la conversation.
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8001",
                    "X-Title": "Kossi AI"
                },
                json={
                    "model": "openai/gpt-oss-120b:free",
                    "messages": messages,
                    "temperature": 0.7
                },
                timeout=30.0
            )

            # Logs de debug pour inspecter la réponse de l'API externe.
            # Ces logs aident au dépannage en cas d'erreur ou de réponse inattendue.
            print("Status:", response.status_code)
            try:
                print("Réponse OpenRouter:", repr(response.text[:1000]) + "...")
            except Exception:
                pass

            if response.status_code != 200:
                # L'API a retourné une erreur HTTP (ex: clé invalide, solde insuffisant).
                try:
                    print(repr(response.text[:1000]) + "...")
                except Exception:
                    pass

                return ChatResponse(
                    response="Le service IA est indisponible ou le solde API est insuffisant.",
                    suggested_books=[]
                )

            data = response.json()

            # Extraire la réponse textuelle fournie par le modèle.
            # La structure de réponse OpenRouter est choices[0].message.content
            choices = data.get("choices", [])

            if not choices:
                # Le modèle n'a pas retourné de choix (erreur critique).
                return ChatResponse(
                    response="Aucune réponse du modèle IA.",
                    suggested_books=[]
                )

            message = choices[0].get("message", {})
            bot_reply = message.get("content", "Réponse vide.")

            # Persister la réponse d'assistant dans la session utilisateur (si authentifié).
            # Cela enregistre l'ensemble de l'historique du chat côté backend.
            if authorization and chat_session:
                await _append_chat_message(str(chat_session.get("id")), "assistant", bot_reply, authorization)

            # Essayer d'abord de récupérer des recommandations personnalisées
            # depuis le backend. Si le backend ne renvoie rien, on utilise un
            # fallback local basé sur le catalogue et les mots-clés du message.
            suggested_books = await _fetch_backend_recommendations(authorization)
            if not suggested_books:
                terms = _extract_search_terms(request.messages)
                suggested_books = _match_books(books, terms)

            # Si toujours aucune recommandation locale, convertir les titres
            # extraits des sources web en suggestions (respecter la limite).
            # Remarque : ces suggestions proviennent de pages web et doivent
            # idéalement être vérifiées avant d'être présentées comme
            # recommandations officielles si la qualité est critique.
            if (not suggested_books or len(suggested_books) == 0) and sources:
                suggested_books = [s.get("title") for s in sources if s.get("title")][:MAX_SUGGESTED_BOOKS]

            return ChatResponse(response=bot_reply, suggested_books=suggested_books, sources=sources)

    except Exception as e:
        # En cas d'erreur réseau, timeout ou autre problème d'exécution,
        # enregistrer le détail côté serveur et retourner une erreur HTTP 500.
        # Cela évite de divulguer les détails techniques au client.
        try:
            print(f"Erreur OpenRouter: {repr(str(e))}")
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Erreur de communication avec l'API IA.")

@app.post("/vectorize")
def vectorize_book(request: VectorizeRequest):
    """Génère un vecteur d'embedding pour un livre donné.
    Cet endpoint est prévu pour indexer des livres en vue d'une recherche sémantique.
    
    Note : l'implémentation réelle doit utiliser sentence-transformers ou une API
    d'embedding (ex: OpenAI, Hugging Face) pour générer un vecteur dense.
    """

    # Le code de vectorisation réel doit être implémenté ici, par exemple avec une librairie
    # de sentence-transformers ou une API externe qui renvoie un embedding.
    return {"status": "success", "book_id": request.book_id, "vector_size": 384}

if __name__ == "__main__":
    # Lancer l'application en mode développement si le fichier est exécuté directement.
    # En production, utiliser un serveur ASGI externe (gunicorn, uvicorn en système)
    # configuré avec les bons paramètres de port, worker, etc.
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
