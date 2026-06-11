import logging
from fastapi_kossi.services.llm_service import LLMService

logger = logging.getLogger(__name__)

class LibrarianAgent:
    """Agent spécialisé dans les services, horaires, inscriptions et règles de la bibliothèque CAEB."""
    
    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de LibrarianAgent...")
        
        system_prompt = (
            "Tu es l'Agent Bibliothécaire de la Bibliothèque CAEB de Natitingou.\n"
            "Ton rôle est de répondre aux questions sur le fonctionnement pratique de la bibliothèque :\n"
            "- Horaires d'ouverture (ex: ouverts le samedi).\n"
            "- Modalités d'inscription et d'adhésion physique (nécessite validation par le bibliothécaire sur place).\n"
            "- Règles d'emprunt de livres (prêt de 14 jours, renouvellement possible).\n"
            "- Services disponibles (cyberespace, salles d'étude, consultation sur place).\n\n"
            "Règles strictes :\n"
            "- Sois accueillant, clair et professionnel.\n"
            "- Reste fidèle aux données fournies.\n"
            "- Ne divulgue jamais d'URLs ou de ports techniques de développement (localhost, etc.)."
        )
        
        # Construction des messages pour le LLM
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
            {"role": "system", "content": f"Données contextuelles disponibles :\n- Clubs: {context.get('clubs_summary')}\n- Événements: {context.get('events_summary')}"},
            {"role": "user", "content": query}
        ])
        
        return await LLMService.generate_response(messages, temperature=0.0, require_citations=True, use_cache=True)
