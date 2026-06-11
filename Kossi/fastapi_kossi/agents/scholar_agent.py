import logging
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService

logger = logging.getLogger(__name__)


class ScholarAgent:
    """Agent spécialisé dans le soutien en connaissances et en matières scolaires.
    Capable de répondre aux questions de culture générale, d'histoire, de sciences et de toutes les matières enseignées
    du primaire au secondaire, du lycée au supérieur.
    """

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de ScholarAgent (culture & connaissance)...")

        books = context.get("books", [])
        web_results = context.get("web_results", [])

        # Chercher si des livres du catalogue sont pertinents
        top_titles = await SearchService.hybrid_search_books(books, query, limit=3)
        rag_books = []
        title_set = set(top_titles)
        for book in books:
            titre = book.get("titre") or book.get("title") or ""
            if titre in title_set:
                rag_books.append(book)

        # Contexte des livres du catalogue
        catalogue_context = ""
        if rag_books:
            parts = ["Livres de notre catalogue sur ce sujet :"]
            for book in rag_books:
                titre = book.get("titre") or "Titre inconnu"
                auteur = book.get("auteur") or ""
                resume = book.get("resume") or book.get("description") or ""
                disponible = "✅" if book.get("disponible", True) else "❌"
                parts.append(f"- **{titre}** ({auteur}) {disponible} : {resume[:120]}")
            catalogue_context = "\n".join(parts)

        # Contexte des résultats web si disponibles
        web_context = ""
        if web_results:
            web_parts = ["Informations complémentaires issues du web :"]
            for result in web_results[:3]:
                title = result.get("title", "")
                snippet = result.get("snippet", "")
                if snippet:
                    web_parts.append(f"- {title} : {snippet[:200]}")
            web_context = "\n".join(web_parts)
        elif not rag_books:
            logger.info("[ScholarAgent] Aucun livre pertinent trouvé en catalogue. Lancement de la recherche web.")
            web_results = await SearchService.search_web(query, limit=3, fetch_page_content=True)
            if web_results:
                web_parts = ["Informations complémentaires issues du web :"]
                for result in web_results[:3]:
                    title = result.get("title") or result.get("page_title") or ""
                    snippet = result.get("snippet") or result.get("page_excerpt") or ""
                    if snippet:
                        web_parts.append(f"- {title} : {snippet[:200]}")
                web_context = "\n".join(web_parts)

        system_prompt = (
            "Tu es l'Agent Érudit de la Bibliothèque CAEB de Natitingou, spécialisé en culture générale et en matières scolaires.\n"
            "Ton rôle est de répondre aux questions culturelles, historiques, scientifiques, mathématiques, littéraires, linguistiques, géographiques, \n"
            "philosophiques, artistiques et encyclopédiques, du primaire au supérieur.\n\n"
            "Instructions :\n"
            "- Réponds de manière précise, factuelle et enrichissante.\n"
            "- Si des livres du catalogue sont pertinents, recommande-les.\n"
            "- Si des sources web sont disponibles, cite les informations utiles.\n"
            "- Donne une réponse complète mais concise.\n"
            "- Adopte un ton éducatif et curieux qui donne envie d'en savoir plus.\n"
            "- Propose toujours d'approfondir le sujet avec des ressources de la bibliothèque.\n"
            "- Traite toutes les matières scolaires dès le primaire jusqu'à l'enseignement supérieur.\n"
        )

        context_block = ""
        if catalogue_context:
            context_block += f"\n{catalogue_context}\n"
        if web_context:
            context_block += f"\n{web_context}\n"

        history_messages = context.get("history_messages") or []
        history_context: str = context.get("history_context", "")

        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})
        if context_block:
            messages.append({"role": "system", "content": f"--- CONTEXTE DISPONIBLE ---{context_block}--- FIN CONTEXTE ---"})
        messages.append({"role": "user", "content": query})

        response_text = await LLMService.generate_response(messages, temperature=0.2, require_citations=True, use_cache=True)
        
        sources = []
        for book in rag_books:
            sources.append({
                "title": f"📚 {book.get('titre') or book.get('title')}",
                "url": f"https://bibliotheque-caeb.bj/catalogue?q={book.get('titre') or book.get('title')}",
                "snippet": f"Auteur : {book.get('auteur') or 'Inconnu'} | Genre : {book.get('genre') or 'Inconnu'} | Statut : {'Disponible' if book.get('disponible', True) else 'Emprunté'}"
            })
            
        if web_results:
            sources.extend(web_results)
            
        return {
            "response": response_text,
            "sources": sources,
            "agent": "scholar",
            "cached": False
        }
