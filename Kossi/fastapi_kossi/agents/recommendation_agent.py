import logging
from typing import List, Dict, Any
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService

logger = logging.getLogger(__name__)


class RecommendationAgent:
    """Agent spécialisé dans les recommandations personnalisées de livres.
    Utilise le profil utilisateur et les préférences pour proposer des lectures adaptées.
    """

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de RecommendationAgent...")

        books: List[Dict[str, Any]] = context.get("books", [])
        user_summary: str = context.get("user_summary", "")

        # Construire une requête enrichie avec les préférences utilisateur
        enriched_query = query
        if user_summary:
            enriched_query = f"{query} [Profil utilisateur : {user_summary}]"

        # Recherche hybride des livres les plus pertinents selon le profil + requête
        top_titles = await SearchService.hybrid_search_books(books, enriched_query, limit=6)

        # Construire le contexte RAG avec données complètes des livres
        rag_books = []
        title_set = set(top_titles)
        for book in books:
            titre = book.get("titre") or book.get("title") or ""
            if titre in title_set:
                rag_books.append(book)
            if len(rag_books) >= 6:
                break

        # Formater les livres pour le prompt
        web_context = ""
        if rag_books:
            rag_parts = ["Livres candidats pour la recommandation :"]
            for i, book in enumerate(rag_books, 1):
                titre = book.get("titre") or "Titre inconnu"
                auteur = book.get("auteur") or "Auteur inconnu"
                genre = book.get("genre") or ""
                sous_genre = book.get("sous_genre") or ""
                resume = book.get("resume") or book.get("description") or ""
                mots_cles = book.get("mots_cles") or []
                if isinstance(mots_cles, list):
                    mots_cles = ", ".join(mots_cles)
                disponible = "✅ Disponible" if book.get("disponible", True) else "❌ Indisponible"

                entry = f"{i}. **{titre}** — {auteur}"
                if genre or sous_genre:
                    entry += f" ({', '.join(filter(None, [genre, sous_genre]))})"
                if resume:
                    entry += f"\n   → {resume[:180]}{'...' if len(resume) > 180 else ''}"
                if mots_cles:
                    entry += f"\n   Thèmes : {mots_cles}"
                entry += f" | {disponible}"
                rag_parts.append(entry)
            rag_context = "\n".join(rag_parts)
        else:
            logger.info("[RecommendationAgent] Aucun livre pertinent trouvé en catalogue. Lancement de la recherche web.")
            web_results = await SearchService.search_web(query, limit=3, fetch_page_content=True)
            if web_results:
                web_parts = ["Aucun livre exact trouvé en catalogue. Voici des ressources en ligne complémentaires :"]
                for i, result in enumerate(web_results[:3], 1):
                    title = result.get("title") or result.get("page_title") or "Résultat inconnu"
                    snippet = result.get("snippet") or result.get("page_excerpt") or ""
                    url = result.get("url") or ""
                    web_parts.append(f"{i}. {title}\n   {snippet[:200]}...\n   Source: {url}")
                web_context = "\n".join(web_parts)
                rag_context = "Aucun livre exact trouvé dans notre catalogue, mais j'ai complété avec des sources en ligne." 
            else:
                titles_fallback = [b.get("titre") or b.get("title") for b in books[:5] if b]
                rag_context = "Quelques livres disponibles : " + ", ".join(str(t) for t in titles_fallback if t)

        system_prompt = (
            "Tu es l'Agent de Recommandation de la Bibliothèque CAEB de Natitingou.\n"
            "Ton rôle est de proposer des lectures personnalisées et pertinentes.\n\n"
            "Instructions :\n"
            "- Analyse le profil et les préférences de l'utilisateur.\n"
            "- Sélectionne les 3 à 5 livres les plus adaptés parmi ceux proposés dans le contexte.\n"
            "- Explique pourquoi chaque livre est adapté à l'utilisateur.\n"
            "- Mentionne clairement la disponibilité de chaque livre recommandé.\n"
            "- Utilise en priorité les livres du contexte RAG, et si aucun livre exact n'est trouvé, complète avec des sources web fiables.\n"
            "- Sois chaleureux, enthousiaste et motivant dans ton ton.\n"
        )

        history_messages = context.get("history_messages") or []
        history_context: str = context.get("history_context", "")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"--- PROFIL UTILISATEUR ---\n{user_summary or 'Non connecté'}\n--- FIN PROFIL ---"},
        ]
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})
        messages.append({"role": "system", "content": f"--- LIVRES DISPONIBLES (RAG) ---\n{rag_context}\n--- FIN LIVRES ---"})
        if web_context:
            messages.append({"role": "system", "content": f"--- RESSOURCES WEB COMPLÉMENTAIRES ---\n{web_context}\n--- FIN RESSOURCES WEB ---"})
        messages.append({"role": "user", "content": query})

        response_text = await LLMService.generate_response(messages, temperature=0.2, require_citations=True, use_cache=True)
        
        sources = []
        for book in rag_books:
            sources.append({
                "title": f"📚 {book.get('titre') or book.get('title')}",
                "url": f"https://bibliotheque-caeb.bj/catalogue?q={book.get('titre') or book.get('title')}",
                "snippet": f"Auteur : {book.get('auteur') or 'Inconnu'} | Genre : {book.get('genre') or 'Inconnu'} | Statut : {'Disponible' if book.get('disponible', True) else 'Emprunté'}"
            })
            
        if web_context and context.get("web_results"):
            sources.extend(context.get("web_results", []))
            
        return {
            "response": response_text,
            "sources": sources,
            "agent": "recommendation",
            "cached": False
        }
