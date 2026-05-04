# kossi_ai.py — Moteur de recommandation & Chatbot IA pour CAEB Natitingou
# Version 2.0 — Agent intelligent (Kossi)
# Multilingue (FR, EN, ES) — Ton chaleureux, concis et orienté action.

from __future__ import annotations
import json
import re
import datetime
from typing import TypedDict, List, Optional, Any
from django.db.models import Q
from api.models import Book, User, Review, Club, Event

def _get_sklearn():
    """Import paresseux sklearn."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np
        return TfidfVectorizer, cosine_similarity, np
    except ImportError:
        return None, None, None

class BookRec(TypedDict):
    id_livre: str
    titre: str
    auteur: str
    genre: str
    sous_genre: str
    categorie_age: str
    nombre_pages: int
    note_moyenne: float
    raison: str

class RecommendationOutput(TypedDict):
    intent: str
    message: str
    humeur_detectee: str
    livres: List[BookRec]
    decouverte: Optional[BookRec]
    question_suivi: Optional[str]

class ChatOutput(TypedDict):
    intent: str
    message: str

class KossiAI:
    def __init__(self):
        self.vectorizer = None
        self.tfidf_matrix = None
        self.book_ids: list[int] = []
        self.is_trained = False

    def _ensure_sklearn(self):
        TfidfVectorizer, cosine_similarity, np = _get_sklearn()
        if TfidfVectorizer is None:
            return False
        if self.vectorizer is None:
            self.vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=5000,
                ngram_range=(1, 2),
            )
        return True

    def train_recommendation_model(self) -> bool:
        """Entraîne le modèle TF-IDF sur l'ensemble du catalogue."""
        if not self._ensure_sklearn():
            return False
        _, _, np = _get_sklearn()
        
        books = list(Book.objects.filter(is_available=True))
        if not books:
            return False

        corpus: list[str] = []
        self.book_ids = []

        for book in books:
            text = f"{book.genre} {book.author} {book.synopsis}"
            corpus.append(text.strip())
            self.book_ids.append(book.id)

        try:
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
            self.is_trained = True
            return True
        except Exception:
            self.is_trained = False
            return False

    def _get_age_bracket(self, birth_date) -> str:
        if not birth_date:
            return "adulte"
        today = datetime.date.today()
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        if age < 12: return "enfant"
        if age < 18: return "ado"
        return "adulte"

    def _detect_mood_and_constraints(self, message: str) -> tuple[str, Optional[str]]:
        msg = message.lower()
        humeur = "neutre"
        if any(w in msg for w in ["détendre", "léger", "facile", "rire", "amusant"]): humeur = "léger"
        elif any(w in msg for w in ["intense", "profond", "sérieux", "réflexion", "complexe"]): humeur = "intense"
        elif any(w in msg for w in ["évasion", "voyage", "ailleurs", "rêver", "aventure"]): humeur = "évasion"
        
        contrainte = None
        if any(w in msg for w in ["court", "petit", "rapide", "peu de temps"]): contrainte = "court"
        elif any(w in msg for w in ["long", "gros", "pavé", "développer"]): contrainte = "long"
        elif any(w in msg for w in ["illustré", "image", "bd", "dessin"]): contrainte = "illustré"
        elif any(w in msg for w in ["récent", "nouveau", "nouveauté", "sorti"]): contrainte = "récent"
        
        return humeur, contrainte

    def get_structured_response(self, message: str, user_id: int | None = None, history: List[str] = None) -> dict:
        msg = message.lower()
        humeur, contrainte = self._detect_mood_and_constraints(msg)
        
        # Détection d'intention : Recommandation
        if re.search(r'recommand|conseil|quel livre|livre|lire|suggér', msg):
            return self.generate_recommendation(user_id, humeur, contrainte, history)
        
        # Détection d'intention : Chat / Questions
        return self.generate_chat_response(message, user_id)

    def generate_recommendation(self, user_id: int | None, humeur: str, contrainte: Optional[str], history: List[str] = None) -> dict:
        if not user_id:
            # Traitement Anonyme -> Top 20 populaires, filtré par age (défaut adulte)
            books = Book.objects.filter(is_available=True).order_by('-rating')[:20]
            # Pour l'anonyme, on reste simple
            livres = books[:5]
            return self._format_recommendation("Voici les ouvrages les plus appréciés de notre bibliothèque.", humeur, livres)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {"intent": "chat", "message": "Désolé, je ne trouve pas votre profil."}

        tranche_age = self._get_age_bracket(user.birth_date)
        
        # 3.1 FILTRES ABSOLUS
        # Age filtre
        age_map = {
            "enfant": ["children", "all"],
            "ado": ["children", "teen", "all"],
            "adulte": ["adult", "children", "teen", "all"]
        }
        eligible_books = Book.objects.filter(is_available=True, target_audience__in=age_map[tranche_age])
        
        # Filtre répétition (simplifié : on exclut ce qui est dans l'historique de session passé en paramètre si ids de livres)
        if history:
            eligible_books = eligible_books.exclude(id__in=history)

        # 3.3 POIDS HYBRIDES (C)
        C = user.confidence_score
        # δ=POP, β=CB, α=CF, γ=IB
        if C < 0.3: weights = {'δ': 0.70, 'β': 0.30, 'α': 0.00, 'γ': 0.00}
        elif C < 0.6: weights = {'δ': 0.30, 'β': 0.40, 'α': 0.30, 'γ': 0.00}
        else: weights = {'δ': 0.10, 'β': 0.30, 'α': 0.35, 'γ': 0.25}

        # Signaux boostent β(CB)
        if humeur != "neutre" or contrainte:
            weights['β'] += 0.1
            total = sum(weights.values())
            for k in weights: weights[k] /= total

        # RÈGLE PAR TYPE DE COMPTE
        if not user.is_member:
            # non_membre -> Perso sans emprunts
            pass # On utilise les préférences déclarées

        # Scoring simple (Base Content-Based + POP)
        scored_books = []
        if self._ensure_trained():
            _, cosine_similarity, np = _get_sklearn()
            # Création du vecteur profil
            genres = " ".join(user.preferred_genres + user.sub_genres_preferred)
            goals = " ".join(user.reading_goals)
            study = f"{user.education_level} {user.study_class}"
            profile_text = f"{genres} {goals} {study} {humeur} {contrainte or ''}"
            
            profile_vec = self.vectorizer.transform([profile_text])
            sims = cosine_similarity(profile_vec, self.tfidf_matrix)[0]
            
            for i, book_id in enumerate(self.book_ids):
                book = Book.objects.get(id=book_id)
                if book in eligible_books:
                    # Score final = poid_CB * sim + poid_POP * (rating/5)
                    score = weights['β'] * sims[i] + weights['δ'] * (book.rating / 5.0)
                    
                    # 3.4 AJUSTEMENT PAR NIVEAU/FILIÈRE
                    if user.study_class in book.synopsis or user.education_level in book.synopsis:
                        score *= 1.2
                    
                    # 3.5 AJUSTEMENT PAR OBJECTIF
                    for goal in user.reading_goals:
                        if goal.lower() in book.synopsis.lower() or goal.lower() in book.genre.lower():
                            score *= 1.1

                    scored_books.append((book, score))

        scored_books.sort(key=lambda x: x[1], reverse=True)
        
        # 3.7 DIVERSIFICATION
        final_list = []
        authors = set()
        genres = set()
        for b, s in scored_books:
            if len(final_list) >= 5: break
            if list(authors).count(b.author) >= 2: continue
            # On essaye de varier les genres mais on ne bloque pas si on n'a pas assez
            final_list.append(b)
            authors.add(b.author)
            genres.add(b.genre)

        discovery = None
        if C > 0 and len(scored_books) > 10:
            # On prend un livre avec un bon score mais hors des genres habituels (simple mock)
            discovery = scored_books[min(len(scored_books)-1, 10)][0]

        msg_accroche = f"Salut {user.first_name}, j'ai déniché quelques pépites qui correspondent exactement à tes envies de lecture !"
        if tranche_age == "adulte": msg_accroche = f"Bonjour {user.first_name}. Voici une sélection d'ouvrages adaptée à votre profil et à vos objectifs."

        return self._format_recommendation(msg_accroche, humeur, final_list, discovery)

    def _format_recommendation(self, message: str, humeur: str, books: List[Book], discovery: Book = None) -> dict:
        livres = []
        for b in books:
            livres.append({
                "id_livre": str(b.id),
                "titre": b.title,
                "auteur": b.author,
                "genre": b.genre,
                "sous_genre": "", # Non présent en BD pour l'instant
                "categorie_age": b.target_audience,
                "nombre_pages": b.pages,
                "note_moyenne": b.rating,
                "raison": f"Ce livre correspond à ton intérêt pour le genre {b.genre}."
            })
        
        disco = None
        if discovery:
            disco = {
                "id_livre": str(discovery.id),
                "titre": discovery.title,
                "raison": f"Une suggestion pour sortir de tes sentiers battus — découvre {discovery.genre} !"
            }

        return {
            "intent": "recommendation",
            "message": message,
            "humeur_detectee": humeur,
            "livres": livres,
            "decouverte": disco,
            "question_suivi": "Est-ce que l'un de ces livres te tente ?"
        }

    def generate_chat_response(self, message: str, user_id: int | None) -> dict:
        msg = message.lower()
        res = "Je suis Kossi, votre bibliothécaire numérique. Comment puis-je vous aider ?"
        
        if re.search(r'horaire|ouvert|ferm', msg):
            res = "La bibliothèque CAEB Natitingou est ouverte du Lundi au Samedi, de 8h00 à 18h30."
        elif re.search(r'club|anglais|conteur', msg):
            res = "Nous avons plusieurs clubs : lecture, anglais et conteurs. Ils se réunissent chaque semaine pour partager notre passion."
        elif re.search(r'ia|labo|numérique', msg):
            res = "Notre Labo IA est un espace de création numérique où vous pouvez apprendre la programmation et la robotique."
        elif re.search(r'inscri|carte|membre', msg):
            res = "Pour devenir membre, présentez-vous à l'accueil avec une pièce d'identité. L'inscription vous donne accès à tous nos services !"

        return {
            "intent": "chat",
            "message": res
        }

# Instance globale
kossi_instance = KossiAI()
