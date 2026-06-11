import logging
from typing import List, Dict, Any
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService

logger = logging.getLogger(__name__)


class CatalogAgent:
    """Agent spécialisé dans la recherche de livres via RAG hybride (sémantique + mots-clés).
    Il récupère les livres les plus pertinents et les injecte dans le contexte LLM.
    """

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de CatalogAgent (RAG hybride)...")

        books: List[Dict[str, Any]] = context.get("books", [])
        if not books:
            return (
                "Je n'ai pas pu accéder au catalogue de livres pour le moment. "
                "Veuillez réessayer ou contacter la bibliothèque directement."
            )

        # 1. Recherche hybride pour trouver les livres les plus pertinents
        top_titles = await SearchService.hybrid_search_books(books, query, limit=5)

        # 2. Construire le contexte RAG : extraire les données complètes des livres sélectionnés
        rag_books_data = []
        title_set = set(top_titles)
        for book in books:
            titre = book.get("titre") or book.get("title") or ""
            if titre in title_set:
                rag_books_data.append(book)
            if len(rag_books_data) >= 5:
                break

        # 3. Formater le contexte RAG pour l'injection dans le prompt
        web_context = ""
        if rag_books_data:
            rag_context_parts = ["Voici les livres les plus pertinents de notre catalogue :"]
            for i, book in enumerate(rag_books_data, 1):
                titre = book.get("titre") or "Titre inconnu"
                auteur = book.get("auteur") or "Auteur inconnu"
                genre = book.get("genre") or ""
                sous_genre = book.get("sous_genre") or ""
                resume = book.get("resume") or book.get("description") or ""
                disponible = "✅ Disponible" if book.get("disponible", True) else "❌ Non disponible"

                entry = f"{i}. **{titre}** par {auteur}"
                if genre:
                    entry += f" | Genre : {genre}"
                if sous_genre:
                    entry += f" / {sous_genre}"
                if resume:
                    entry += f"\n   Résumé : {resume[:200]}{'...' if len(resume) > 200 else ''}"
                entry += f"\n   Statut : {disponible}"
                rag_context_parts.append(entry)

            rag_context = "\n".join(rag_context_parts)
        else:
            # Recherche web automatique si aucun résultat exact en catalogue
            logger.info(f"[CatalogAgent] Aucun livre trouvé en catalogue. Lancement recherche web.")
            web_results = await SearchService.search_web(query, limit=3, fetch_page_content=True)
            if web_results:
                web_parts = ["Résultats de recherche en ligne sur les livres et publications :"]
                for i, result in enumerate(web_results[:3], 1):
                    title = result.get("title") or result.get("page_title") or "Résultat inconnu"
                    snippet = result.get("snippet") or result.get("page_excerpt") or ""
                    url = result.get("url") or ""
                    web_parts.append(f"{i}. {title}\n   {snippet[:200]}...\n   Source: {url}")
                web_context = "\n\nRésultats complémentaires en ligne :\n" + "\n".join(web_parts)
            rag_context = "Aucun livre exact trouvé dans notre catalogue, mais j'ai fait une recherche en ligne pour vous."

        system_prompt = (
            "Tu es l'Agent Catalogue de la Bibliothèque CAEB de Natitingou.\n"
            "Ton rôle est d'aider les utilisateurs à trouver des livres pertinents dans notre catalogue et, si nécessaire, à compléter l'information par des ressources en ligne fiables.\n\n"
            "Instructions :\n"
            "- Utilise d'abord les données du contexte RAG ci-dessous pour formuler ta réponse.\n"
            "- Si aucun livre exact n'est trouvé dans le catalogue, utilise les résultats de recherche en ligne fournis pour répondre.\n"
            "- Si un livre est mentionné, cite son titre, son auteur et son statut de disponibilité.\n"
            "- Si plusieurs livres correspondent, liste-les clairement.\n"
            "- Si aucun livre ne correspond exactement, indique que tu n'as pas trouvé de référence exacte en catalogue et propose des alternatives.\n"
            "- Cite les sources web uniquement si tu utilises ces informations.\n"
            "- Sois précis, utile et enthousiaste.\n"
            "- Ne mentionne jamais de détails techniques internes (URLs, ports, APIs) sauf pour citer les sources web quand c'est nécessaire.\n"
        )

        history_messages = context.get("history_messages") or []
        history_context: str = context.get("history_context", "")

        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})
        messages.extend([
            {"role": "system", "content": f"--- CONTEXTE RAG (livres trouvés) ---\n{rag_context}\n--- FIN CONTEXTE RAG ---"},
        ])
        if web_context:
            messages.append({"role": "system", "content": f"--- CONTEXTE WEB COMPLÉMENTAIRE ---\n{web_context}\n--- FIN CONTEXTE WEB ---"})
        messages.append({"role": "user", "content": query})

        response_text = await LLMService.generate_response(messages, temperature=0.2, require_citations=True, use_cache=True)
        
        sources = []
        for book in rag_books_data:
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
            "agent": "catalog",
            "cached": False
        }
