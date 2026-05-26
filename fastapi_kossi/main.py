import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

app = FastAPI(
    title="Kossi AI Service",
    description="Micro-service d'intelligence artificielle pour la bibliothèque CAEB",
    version="1.0.0"
)

# Configuration CORS pour permettre au frontend (Vite React) de s'y connecter
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # À restreindre en production (ex: http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Modèles de données (Pydantic) ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: str
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    response: str
    suggested_books: Optional[List[str]] = []

class VectorizeRequest(BaseModel):
    book_id: str
    text_content: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Service Kossi AI opérationnel"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_kossi(request: ChatRequest):
    """
    Endpoint principal pour le chat avec Kossi via DeepSeek API.
    """
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="DEEPSEEK_API_KEY non configurée.")

    # Préparer le contexte système
    system_prompt = {
        "role": "system",
        "content": "Tu es Kossi, l'assistant intelligent et bibliothécaire de la Bibliothèque CAEB de Natitingou. Tu dois aider les utilisateurs à trouver des livres, répondre à leurs questions sur la bibliothèque et formuler des recommandations."
    }

    # Formater les messages pour l'API DeepSeek
    messages = [system_prompt]
    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            bot_reply = data["choices"][0]["message"]["content"]
            
            # TODO: Intégrer la logique de recherche sémantique locale pour extraire des suggested_books
            # Pour l'instant, on retourne la réponse de l'IA avec une liste vide
            return ChatResponse(response=bot_reply, suggested_books=[])
            
    except Exception as e:
        print(f"Erreur DeepSeek: {e}")
        raise HTTPException(status_code=500, detail="Erreur de communication avec l'API IA.")

@app.post("/vectorize")
def vectorize_book(request: VectorizeRequest):
    """
    Génère un embedding vectoriel pour un livre donné.
    (Sera utilisé pour la recherche sémantique)
    """
    # Logique de vectorisation à implémenter (ex: avec sentence-transformers ou API)
    return {"status": "success", "book_id": request.book_id, "vector_size": 384}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
