import logging
import datetime
from typing import List, Dict, Any, Optional
from fastapi_kossi.core.settings import MAX_CHAT_HISTORY

logger = logging.getLogger(__name__)

class MemoryService:
    """Service gérant la mémoire de session utilisateur et le profilage non sensible."""
    
    @staticmethod
    def build_chat_history_context(messages: List[Dict[str, Any]], limit: int = MAX_CHAT_HISTORY) -> str:
        """Construit un résumé de l'historique de discussion à fournir au modèle."""
        if not messages:
            return ""
            
        history_lines = []
        for message in messages[-limit:]:
            role = message.get("role", "unknown")
            content = message.get("content", "")
            history_lines.append(f"{role.capitalize()}: {content}")
            
        return "Historique de discussion :\n" + "\n".join(history_lines) + "\n"

    @staticmethod
    def compute_age(date_str: str) -> Optional[int]:
        """Calcule l'âge d'un utilisateur à partir de sa date de naissance au format ISO YYYY-MM-DD."""
        try:
            date_naissance = datetime.date.fromisoformat(date_str)
            date_actuelle = datetime.date.today()
            age = (
                date_actuelle.year - date_naissance.year - 
                ((date_actuelle.month, date_actuelle.day) < (date_naissance.month, date_naissance.day))
            )
            return age
        except Exception:
            return None

    @classmethod
    def format_user_summary(cls, user: Dict[str, Any]) -> str:
        """Formate les informations non-sensibles du profil utilisateur en texte lisible pour le prompt."""
        if not user:
            return ""

        parts = []
        
        prenom = user.get("prenom") or user.get("firstName") or user.get("first_name")
        nom = user.get("nom") or user.get("lastName") or user.get("last_name")
        if prenom or nom:
            parts.append(f"Utilisateur connecté : {prenom or ''} {nom or ''}".strip())

        niveau = user.get("niveau_etude") or user.get("educationLevel")
        if niveau:
            parts.append(f"Niveau d'études : {niveau}")

        dob = user.get("date_naissance")
        age = cls.compute_age(dob) if dob else None
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

    @staticmethod
    def has_recommendation_intent(text: str) -> bool:
        """Détermine si le message de l'utilisateur contient une intention de recommandation de livre."""
        if not text:
            return False
            
        keywords = [
            "recommande", "recommander", "recommandation", "suggestions", "suggestion", "suggere", "suggérer",
            "cherche", "chercher", "trouve", "trouver", "propose", "proposer", "conseil", "conseille",
            "conseiller", "quel livre", "quels livres", "lectures", "lecture", "lire", "ouvrage", "ouvrages",
            "écrivain", "ecrivain", "auteur", "roman", "romans", "manga", "bd", "conte", "contes", "poésie", "poeme"
        ]
        text_lower = text.lower()
        return any(kw in text_lower for kw in keywords)
