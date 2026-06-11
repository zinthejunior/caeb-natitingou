import logging
from fastapi_kossi.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class EventsAgent:
    """Agent spécialisé dans les clubs, événements culturels et activités de la bibliothèque CAEB."""

    async def execute(self, query: str, context: dict) -> str:
        logger.info("Exécution de EventsAgent...")

        clubs_summary = context.get("clubs_summary", "Aucun club listé pour le moment.")
        events_summary = context.get("events_summary", "Aucun événement programmé pour le moment.")

        system_prompt = (
            "Tu es l'Agent Événements & Clubs de la Bibliothèque CAEB de Natitingou.\n"
            "Ton rôle est de promouvoir les activités culturelles et associatives de la bibliothèque.\n\n"
            "Informations disponibles :\n"
            "- Clubs : Club de lecture, Club de débat, Atelier d'écriture, Club de cinéma, Club de jeux.\n"
            "- Activités régulières : Lectures publiques, expositions, conférences, ateliers.\n"
            "- Événements spéciaux : Semaine de la langue française, Journée du livre africain.\n\n"
            "Instructions :\n"
            "- Présente les clubs et événements avec enthousiasme.\n"
            "- Encourage la participation et l'inscription aux clubs.\n"
            "- Donne des informations pratiques sur comment rejoindre les activités.\n"
            "- Adapte ta réponse à l'intérêt manifesté par l'utilisateur.\n"
            "- Sois chaleureux et communautaire dans ton approche.\n"
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
            {"role": "system", "content": (
                f"--- DONNÉES ACTUELLES DE LA BIBLIOTHÈQUE ---\n"
                f"Clubs actifs : {clubs_summary}\n"
                f"Événements à venir : {events_summary}\n"
                f"--- FIN DONNÉES ---"
            )},
            {"role": "user", "content": query}
        ])

        return await LLMService.generate_response(messages, temperature=0.0, require_citations=False, use_cache=True)
