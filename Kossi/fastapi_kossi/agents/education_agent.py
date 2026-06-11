import logging
from typing import List, Dict, Any
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService

logger = logging.getLogger(__name__)


class EducationAgent:
    """Agent spécialisé dans le soutien scolaire et académique.
    Aide les élèves et étudiants à trouver des ressources adaptées à leur niveau d'études.
    """

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de EducationAgent...")

        books: List[Dict[str, Any]] = context.get("books", [])
        user_summary: str = context.get("user_summary", "")

        # Enrichir la recherche avec des termes académiques
        academic_query = f"{query} scolaire académique étude apprentissage éducation"

        # Recherche RAG sur les livres éducatifs
        top_titles = await SearchService.hybrid_search_books(books, academic_query, limit=5)

        # Récupérer les données complètes des livres trouvés
        rag_books = []
        title_set = set(top_titles)
        for book in books:
            titre = book.get("titre") or book.get("title") or ""
            if titre in title_set:
                rag_books.append(book)
            if len(rag_books) >= 5:
                break

        # Construire le contexte RAG
        web_context = ""
        rag_context = ""
        if rag_books:
            parts = ["Ressources éducatives disponibles :"]
            for i, book in enumerate(rag_books, 1):
                titre = book.get("titre") or "Titre inconnu"
                auteur = book.get("auteur") or "Auteur inconnu"
                genre = book.get("genre") or ""
                resume = book.get("resume") or book.get("description") or ""
                disponible = "✅ Disponible" if book.get("disponible", True) else "❌ Indisponible"
                parts.append(f"{i}. **{titre}** — {auteur} ({genre})\n   {resume[:150]} | {disponible}")
            rag_context = "\n".join(parts)
        else:
            logger.info("[EducationAgent] Aucun livre éducatif trouvé en catalogue. Lancement de la recherche web.")
            web_results = await SearchService.search_web(query, limit=3, fetch_page_content=True)
            if web_results:
                parts = ["Aucune ressource éducative trouvée dans le catalogue. Voici des ressources en ligne utiles :"]
                for i, result in enumerate(web_results[:3], 1):
                    title = result.get("title") or result.get("page_title") or "Résultat inconnu"
                    snippet = result.get("snippet") or result.get("page_excerpt") or ""
                    url = result.get("url") or ""
                    parts.append(f"{i}. {title}\n   {snippet[:200]}...\n   Source: {url}")
                web_context = "\n".join(parts)
                rag_context = "Aucune ressource éducative spécifique trouvée dans le catalogue actuel, mais j'ai complété avec des sources en ligne."
            else:
                rag_context = "Aucune ressource éducative spécifique trouvée dans le catalogue actuel."

        system_prompt = (
            "Tu es l'Agent Éducatif de la Bibliothèque CAEB de Natitingou.\n"
            "Ton rôle est d'aider les élèves, étudiants et apprenants à trouver des ressources adaptées.\n"
            "Tu es aussi un expert du programme scolaire béninois, capable de guider sur les contenus officiels du primaire, du collège, du lycée et de l'enseignement supérieur.\n"
            "Tu incarnes le meilleur enseignant du monde : empathique, patient, chaleureux et rassurant.\n\n"
            "Instructions :\n"
            "- Adapte tes réponses au niveau d'études de l'utilisateur (primaire, collège, lycée, université).\n"
            "- Propose des livres éducatifs pertinents du catalogue en priorité.\n"
            "- Donne des conseils méthodologiques sur comment utiliser les ressources.\n"
            "- Encourage et motive les apprenants avec un ton bienveillant, humain et engageant.\n"
            "- Mets l'apprenant à l'aise en exprimant de la compréhension et de la confiance.\n"
            "- Mentionne les services d'étude disponibles (salles, cyberespace, etc.).\n"
            "- Utilise en priorité les livres présents dans le contexte RAG et, si nécessaire, complète avec des sources web pertinentes.\n"
            "- Fais toujours le lien avec le programme scolaire béninois officiel lorsque la question porte sur une matière ou un thème du cursus national.\n"
        )

        history_messages = context.get("history_messages") or []
        history_context: str = context.get("history_context", "")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"--- PROFIL APPRENANT ---\n{user_summary or 'Niveau non renseigné'}\n---"},
        ]
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})
        messages.append({"role": "system", "content": f"--- RESSOURCES ÉDUCATIVES (RAG) ---\n{rag_context}\n---"})
        if web_context:
            messages.append({"role": "system", "content": f"--- RESSOURCES WEB COMPLÉMENTAIRES ---\n{web_context}\n---"})
        messages.append({"role": "user", "content": query})

        response_text = await LLMService.generate_response(messages, temperature=0.2, require_citations=True, use_cache=True)
        
        sources = []
        for book in rag_books:
            sources.append({
                "title": f"📚 {book.get('titre') or book.get('title')}",
                "url": f"https://bibliotheque-caeb.bj/catalogue?q={book.get('titre') or book.get('title')}",
                "snippet": f"Auteur : {book.get('auteur') or 'Inconnu'} | Genre : {book.get('genre') or 'Inconnu'} | Statut : {'Disponible' if book.get('disponible', True) else 'Emprunté'}"
            })
            
        # Get web results from locals if search was executed
        local_web_results = locals().get("web_results")
        if local_web_results:
            sources.extend(local_web_results)
        elif not rag_books and context.get("web_results"):
            sources.extend(context.get("web_results", []))
            
        return {
            "response": response_text,
            "sources": sources,
            "agent": "education",
            "cached": False
        }
