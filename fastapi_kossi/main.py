import os
import re
import asyncio
import datetime
import json
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Configuration
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KossiAI")

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MAX_SUGGESTED_BOOKS = 5
MAX_CHAT_HISTORY = 15 # Réduit pour laisser de la place aux outils

# Chargement du Prompt Système
PROMPT_FILE_PATH = os.path.join(os.path.dirname(__file__), "Prompt_Systems.txt")
try:
    with open(PROMPT_FILE_PATH, "r", encoding="utf-8") as _pf:
        BASE_SYSTEM_PROMPT = _pf.read().strip()
except Exception:
    BASE_SYSTEM_PROMPT = "Tu es Kossi, bibliothécaire à la CAEB."

app = FastAPI(title="Kossi AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modèles Pydantic ---

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    response: str
    suggested_books: List[str] = []
    sources: List[Dict[str, str]] = []

# --- Outils de Recherche (Tools) ---

async def tool_search_catalog(query: str) -> str:
    """Recherche des livres et ressources dans le catalogue local de la CAEB."""
    async with httpx.AsyncClient() as client:
        try:
            # On cherche les livres qui correspondent au terme
            resp = await client.get(f"{BACKEND_API_URL}/livres/", params={"search": query}, timeout=10.0)
            if resp.status_code == 200:
                books = resp.json()[:10] # Top 10
                if not books: return "Aucun livre trouvé dans le catalogue pour cette recherche."
                return json.dumps([{
                    "titre": b.get("titre"), 
                    "auteur": b.get("auteur"), 
                    "resume": b.get("resume")[:200]
                } for b in books], ensure_ascii=False)
        except Exception as e:
            return f"Erreur catalogue: {str(e)}"
    return "Catalogue indisponible."

async def tool_web_search(query: str) -> List[Dict[str, str]]:
    """Recherche des informations littéraires ou générales sur Internet."""
    results = []
    serpapi_key = os.getenv("SERPAPI_API_KEY")
    try:
        async with httpx.AsyncClient() as client:
            if serpapi_key:
                resp = await client.get("https://serpapi.com/search.json", 
                                      params={"q": query, "api_key": serpapi_key, "num": 5})
                if resp.status_code == 200:
                    for item in resp.json().get("organic_results", []):
                        results.append({"title": item.get("title"), "url": item.get("link"), "snippet": item.get("snippet")})
            else:
                # Fallback DuckDuckGo
                resp = await client.get("https://api.duckduckgo.com/", params={"q": query, "format": "json"})
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get("AbstractText"):
                        results.append({"title": data.get("Heading"), "url": data.get("AbstractURL"), "snippet": data.get("AbstractText")})
    except Exception as e:
        logger.error(f"Search error: {e}")
    return results[:5]

async def tool_read_page(url: str) -> str:
    """Lit le contenu complet d'une page web (article, critique) pour analyse profonde."""
    try:
        async with httpx.AsyncClient() as client:
            # Utilisation de Jina Reader pour extraire le texte propre
            resp = await client.get(f"https://r.jina.ai/{url}", timeout=15.0)
            return resp.text[:3500] # Limite pour le contexte
    except Exception as e:
        return f"Erreur de lecture de la page: {str(e)}"

# --- Logique Backend ---

async def _fetch_resource(path: str, auth: Optional[str] = None) -> Any:
    headers = {"Authorization": auth} if auth else {}
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{BACKEND_API_URL}/{path.lstrip('/')}", headers=headers, timeout=10.0)
            return r.json() if r.status_code == 200 else None
        except: return None

def _compute_age(date_str: str) -> str:
    try:
        born = datetime.date.fromisoformat(date_str)
        today = datetime.date.today()
        return str(today.year - born.year - ((today.month, today.day) < (born.month, born.day))) + " ans"
    except: return "Inconnu"

# --- Agent Core ---

@app.post("/chat", response_model=ChatResponse)
async def chat_with_kossi(request: ChatRequest, authorization: Optional[str] = Header(None)):
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="API Key manquante")

    # 1. Récupération parallèle des données de base
    tasks = [
        _fetch_resource("utilisateurs/me/", authorization),
        _fetch_resource("actualites/"),
        _fetch_resource("evenements/"),
    ]
    user_prof, news, events = await asyncio.gather(*tasks)

    # 2. Construction du contexte initial
    user_context = ""
    if user_prof:
        age = _compute_age(user_prof.get("date_naissance", ""))
        user_context = (
            f"Utilisateur: {user_prof.get('prenom')} {user_prof.get('nom')}, {age}. "
            f"Niveau: {user_prof.get('niveau_etude')}. Bio: {user_prof.get('bio')}. "
            f"Préfère: {user_prof.get('genres_preferes')}."
        )

    # 3. Définition des fonctions pour l'IA (Function Calling)
    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_catalog",
                "description": "Chercher des livres précis dans le catalogue physique de la bibliothèque CAEB.",
                "parameters": {
                    "type": "object",
                    "properties": {"query": {"type": "string", "description": "Titre, auteur ou thème"}},
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_internet",
                "description": "Rechercher des critiques littéraires, biographies d'auteurs ou infos culturelles mondiales sur le web.",
                "parameters": {
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "read_web_article",
                "description": "Lire le contenu textuel d'une URL pour analyser une œuvre ou un auteur en profondeur.",
                "parameters": {
                    "type": "object",
                    "properties": {"url": {"type": "string"}},
                    "required": ["url"]
                }
            }
        }
    ]

     # 4. Préparation des messages pour OpenRouter
    system_instruction = (
        f"{BASE_SYSTEM_PROMPT}\n\n"
        f"CONTEXTE LOCAL :\n- {user_context}\n"
        f"- Actualités CAEB: {str([n.get('titre') for n in (news or [])[:3]])}\n"
        f"- Événements: {str([e.get('titre') for e in (events or [])[:3]])}\n\n"
        "DIRECTIVES EXPERT :\n"
        "- Tu es un érudit. Analyse le style et les thèmes des livres.\n"
        "- Utilise tes outils si la réponse n'est pas dans le contexte local.\n"
        "- JAMAIS d'URLs techniques (localhost, /api/). Uniquement des liens web réels.\n"
    )
    
    messages = [{"role": "system", "content": system_instruction}]
    for msg in request.messages[-MAX_CHAT_HISTORY:]:
        messages.append({"role": msg.role, "content": msg.content})

    # ==================== NOUVELLE LOGIQUE DE FALLBACK ====================
    
    # Liste des modèles à essayer, par ordre de préférence.
    models_to_try = [
        "google/gemini-flash-1.5-exp:free",
        "meta-llama/llama-3-8b-instruct:free",
        "mistralai/mistral-7b-instruct:free"
    ]

    final_response = ""
    suggested_books = []
    web_sources = []

    # On utilise un seul client pour toute la durée de la requête pour la performance.
    async with httpx.AsyncClient() as client:
        # Boucle d'interaction de l'Agent (2 tours max pour la réflexion)
        for _ in range(2): 
            api_response_data = None
            
            # Boucle de fallback sur les modèles
            for model_name in models_to_try:
                try:
                    logger.info(f"Essai avec le modèle : {model_name}")
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
                        json={
                            "model": model_name,
                            "messages": messages,
                            "tools": tools,
                            "tool_choice": "auto"
                        },
                        # Timeout court pour ne pas rester bloqué sur un modèle lent
                        timeout=25.0 
                    )

                    if response.status_code == 200:
                        logger.info(f"Succès avec {model_name} !")
                        api_response_data = response.json()
                        break  # On a une réponse, on sort de la boucle des modèles
                    else:
                        logger.warning(
                            f"Échec avec {model_name} (Status: {response.status_code}). "
                            f"Message: {response.text[:100]}"
                        )

                except httpx.ReadTimeout:
                    logger.warning(f"Le modèle {model_name} est trop lent (timeout). Essai du suivant.")
                except Exception as e:
                    logger.error(f"Erreur inattendue avec {model_name}: {e}")

            # Si après avoir essayé tous les modèles, aucun n'a fonctionné
            if not api_response_data:
                raise HTTPException(
                    status_code=503, # 503 Service Unavailable est le code le plus approprié
                    detail="Tous les services IA gratuits sont actuellement surchargés. Veuillez réessayer dans un instant."
                )

            # Traitement de la réponse de l'IA (comme avant)
            message = api_response_data["choices"][0]["message"]
            
            if message.get("tool_calls"):
                messages.append(message)
                for tool_call in message["tool_calls"]:
                    func_name = tool_call["function"]["name"]
                    args = json.loads(tool_call["function"]["arguments"])
                    
                    logger.info(f"Kossi utilise l'outil: {func_name} avec {args}")
                    
                    if func_name == "search_catalog": result = await tool_search_catalog(args["query"])
                    elif func_name == "search_internet": 
                        search_data = await tool_web_search(args["query"])
                        web_sources.extend(search_data)
                        result = json.dumps(search_data, ensure_ascii=False)
                    elif func_name == "read_web_article": result = await tool_read_page(args["url"])
                    else: result = "Outil inconnu."

                    messages.append({"role": "tool", "tool_call_id": tool_call["id"], "name": func_name, "content": result})
                continue
            else:
                final_response = message["content"]
                break
    
    # ==================== FIN DE LA LOGIQUE DE FALLBACK =====================

    if final_response:
        titles = re.findall(r'"([^"]+)"', final_response)
        suggested_books = list(set(titles))[:MAX_SUGGESTED_BOOKS]

    return ChatResponse(response=final_response, suggested_books=suggested_books, sources=web_sources)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)