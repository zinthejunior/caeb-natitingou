import logging
from fastapi_kossi.services.llm_service import LLMService
from fastapi_kossi.services.search_service import SearchService

logger = logging.getLogger(__name__)


class WebAgent:
    """Agent spécialisé dans les recherches sur internet pour répondre aux questions hors-catalogue.
    Utilisé comme agent de dernier recours pour les questions générales non couvertes par les autres agents.
    """

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de WebAgent (recherche internet)...")

        web_results = context.get("web_results", [])
        user_summary: str = context.get("user_summary", "")
        history_messages = context.get("history_messages") or []
        history_context: str = context.get("history_context", "")

        # Si les résultats web ne sont pas encore dans le contexte, les chercher maintenant
        if not web_results:
            logger.info(f"Lancement d'une recherche web pour : '{query}'")
            web_results = await SearchService.search_web(query, limit=5, fetch_page_content=True)

        if not web_results:
            # Si aucun résultat web, répondre de manière générique
            system_prompt = (
                "Tu es Kossi, l'assistant intelligent de la Bibliothèque CAEB de Natitingou.\n"
                "La recherche internet n'a retourné aucun résultat pour cette question.\n"
                "Réponds à la question avec tes connaissances générales de manière honnête,\n"
                "et propose à l'utilisateur de consulter notre catalogue pour des ressources physiques."
            )
            messages = [
                {"role": "system", "content": system_prompt},
            ]
            if user_summary:
                messages.append({"role": "system", "content": f"--- PROFIL UTILISATEUR ---\n{user_summary}\n---"})
            if history_messages:
                messages.extend(history_messages[-8:])
            elif history_context:
                messages.append({"role": "system", "content": history_context})
            response_text = await LLMService.generate_response(messages, temperature=0.0, require_citations=True, use_cache=False)
            return {
                "response": response_text,
                "sources": [],
                "agent": "web",
                "cached": False
            }

        # Construire le contexte avec les résultats web
        web_context_parts = ["Résultats trouvés sur internet :"]
        for i, result in enumerate(web_results[:5], 1):
            title = result.get("title") or result.get("page_title") or "Sans titre"
            url = result.get("url", "")
            snippet = result.get("page_excerpt") or result.get("snippet", "")
            entry = f"{i}. **{title}**"
            if url:
                entry += f"\n   URL : {url}"
            if snippet:
                entry += f"\n   Extrait : {snippet[:320]}"
            web_context_parts.append(entry)
        web_context = "\n".join(web_context_parts)

        system_prompt = (
            "Tu es l'Agent Web de la Bibliothèque CAEB de Natitingou.\n"
            "Tu as accès à des résultats de recherche internet et au contenu des pages web liées.\n\n"
            "Instructions :\n"
            "- Utilise uniquement les résultats web et le contenu de pages fournis pour formuler ta réponse.\n"
            "- Ne cite pas de sources qui ne figurent pas dans les résultats fournis.\n"
            "- Vérifie les informations en croisant les extraits des pages web lorsque c'est possible.\n"
            "- Pour chaque affirmation importante basée sur une source, indique le numéro de résultat entre crochets, par exemple [1] ou [2].\n"
            "- En fin de réponse, ajoute une section 'Sources consultées' qui liste les titres et URLs des sources utilisées.\n"
            "- Les URLs peuvent être mentionnées uniquement dans la section 'Sources consultées'.\n"
            "- Synthétise les informations de manière claire et accessible.\n"
            "- Relie toujours la réponse à la bibliothèque si c'est possible.\n"
            "- Ne présente jamais les résultats bruts, mais reformule-les de manière conversationnelle.\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
        ]
        if user_summary:
            messages.append({"role": "system", "content": f"--- PROFIL UTILISATEUR ---\n{user_summary}\n---"})
        if history_messages:
            messages.extend(history_messages[-8:])
        elif history_context:
            messages.append({"role": "system", "content": history_context})
        messages.extend([
            {"role": "system", "content": f"--- RÉSULTATS WEB ---\n{web_context}\n--- FIN RÉSULTATS ---"},
            {"role": "user", "content": query}
        ])

        response_text = await LLMService.generate_response(messages, temperature=0.0, require_citations=True, use_cache=False)
        return {
            "response": response_text,
            "sources": web_results,
            "agent": "web",
            "cached": False
        }
