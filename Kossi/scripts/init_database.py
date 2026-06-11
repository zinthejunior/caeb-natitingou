"""
scripts/init_database.py — Script pour initialiser la BD SQLite avec des donnees de test

Ce script peuple la BD SQLite avec des exemples de livres, clubs et evenements
pour permettre au systeme Kossi de fonctionner sans backend Django externe.

Usage:
    python scripts/init_database.py
"""

import sys
import os

# Ajouter le dossier parent au path pour importer les modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi_kossi.core.database import get_session, init_db
from fastapi_kossi.models.book import Book, Club, Event

def populate_database():
    """Peuple la BD avec des donnees d'exemple."""
    
    # Initialiser le schema
    init_db()
    
    db = get_session()
    
    # Verifier si les donnees existent deja
    existing_books = db.query(Book).count()
    if existing_books > 0:
        print(f"[INFO] La BD contient deja {existing_books} livres. Abandon.")
        db.close()
        return
    
    # Ajouter des livres d'exemple
    books_data = [
        {
            "titre": "L'Enfant du fleuve",
            "auteur": "Amadou Hampate Ba",
            "genre": "Roman",
            "sous_genre": "Fiction africaine",
            "resume": "Un conte fabuleux qui raconte la vie d'un enfant elevé par les eaux du fleuve Niger.",
            "description": "Recit magique et poétique sur la spiritualité africaine et la connexion entre l'homme et la nature.",
            "mots_cles": ["Afrique", "fleuve", "spiritualité", "enfance", "Niger"],
            "isbn": "978-2-07-036589-0",
            "date_publication": "1994",
            "editeur": "Presence Africaine",
            "disponible": True,
            "nombre_exemplaires": 2,
            "localisation": "Rayon Littérature Africaine - Etagère A3"
        },
        {
            "titre": "Choses effondrées",
            "auteur": "Chinua Achebe",
            "genre": "Roman",
            "sous_genre": "Litterature coloniale",
            "resume": "Un chef-d'oeuvre qui explore l'impact de la colonisation sur la société igbo du Nigeria.",
            "description": "Récit captivant de la rencontre entre la culture traditionnelle africaine et le colonialisme européen.",
            "mots_cles": ["Nigeria", "colonialisme", "culture africaine", "conflit", "tradition"],
            "isbn": "978-0-385-33312-0",
            "date_publication": "1958",
            "editeur": "Heinemann",
            "disponible": True,
            "nombre_exemplaires": 3,
            "localisation": "Rayon Littérature Africaine - Etagère A2"
        },
        {
            "titre": "Une si longue lettre",
            "auteur": "Mariama Ba",
            "genre": "Roman",
            "sous_genre": "Fiction feminine",
            "resume": "Une lettre poignante d'une femme sénégalaise qui raconte sa vie de prise de conscience.",
            "description": "Exploration emotionnelle des droits des femmes en Afrique et de la dignité face aux trahisons.",
            "mots_cles": ["Senegal", "feminisme", "mariage", "femme", "identité"],
            "isbn": "978-2-07-034946-3",
            "date_publication": "1979",
            "editeur": "Les Editions Nouvelles Africaines",
            "disponible": True,
            "nombre_exemplaires": 2,
            "localisation": "Rayon Littérature Africaine - Etagère B1"
        },
        {
            "titre": "Monsieur Ibrahim et les fleurs du Coran",
            "auteur": "Eric-Emmanuel Schmitt",
            "genre": "Roman",
            "sous_genre": "Amitié",
            "resume": "L'histoire touchante d'une amitié entre un garcon et un marchand de tabac musulman à Paris.",
            "description": "Un récit émouvant qui célèbre la tolérance et la compréhension entre cultures.",
            "mots_cles": ["amitié", "spiritualité", "Paris", "tolerance", "humanité"],
            "isbn": "978-2-84740-024-3",
            "date_publication": "2001",
            "editeur": "Albin Michel",
            "disponible": True,
            "nombre_exemplaires": 1,
            "localisation": "Rayon Littérature Générale - Etagère C2"
        },
        {
            "titre": "L'Histoire du Bénin",
            "auteur": "Laure Merat",
            "genre": "Essai",
            "sous_genre": "Histoire",
            "resume": "Une vue d'ensemble complète de l'histoire du Bénin depuis les royaumes anciens jusqu'à nos jours.",
            "description": "Découvrez les dynasties royales, le commerce, la colonisation et la formation de la nation béninoise.",
            "mots_cles": ["Bénin", "histoire", "royaume", "Abomey", "Dahomey"],
            "isbn": "978-2-406-08521-7",
            "date_publication": "2020",
            "editeur": "Perrin",
            "disponible": True,
            "nombre_exemplaires": 2,
            "localisation": "Rayon Histoire & Géographie - Etagère D1"
        },
        {
            "titre": "Le Monde de Sophie",
            "auteur": "Jostein Gaarder",
            "genre": "Roman",
            "sous_genre": "Philosophie",
            "resume": "Un roman d'aventure et de philosophie où une adolescente découvre l'histoire de la pensée humaine.",
            "description": "Une introduction fascinante à la philosophie à travers une lettre énigmatique et une quête spirituelle.",
            "mots_cles": ["philosophie", "adolescence", "énigme", "réflexion", "éducation"],
            "isbn": "978-2-226-06652-8",
            "date_publication": "1991",
            "editeur": "Editions du Seuil",
            "disponible": True,
            "nombre_exemplaires": 2,
            "localisation": "Rayon Jeunesse & Philosophie - Etagère E2"
        },
    ]
    
    for book_data in books_data:
        book = Book(**book_data)
        db.add(book)
    
    db.commit()
    print(f"[INFO] {len(books_data)} livres ajoutés à la BD")
    
    # Ajouter des clubs
    clubs_data = [
        {
            "nom": "Club de lecture",
            "description": "Réunion mensuelle pour discuter de livres et d'écrivains.",
            "responsable": "Mme Josée",
            "horaire": "Tous les premiers samedis du mois à 10h",
            "localisation": "Salle d'étude 1",
            "actif": True
        },
        {
            "nom": "Club de débat",
            "description": "Débats thématiques sur des sujets d'actualité et de culture.",
            "responsable": "M. Jean",
            "horaire": "Mercredi 18h-20h",
            "localisation": "Salle d'étude 2",
            "actif": True
        },
        {
            "nom": "Atelier d'écriture",
            "description": "Ateliers créatifs pour développer vos compétences en écriture.",
            "responsable": "Mme Corinne",
            "horaire": "Mardi 17h-19h",
            "localisation": "Bureau des animations",
            "actif": True
        },
        {
            "nom": "Club de cinéma",
            "description": "Projection et discussion de films africains et mondiaux.",
            "responsable": "M. Pierre",
            "horaire": "Jeudi 19h-21h",
            "localisation": "Cyberespace",
            "actif": True
        },
    ]
    
    for club_data in clubs_data:
        club = Club(**club_data)
        db.add(club)
    
    db.commit()
    print(f"[INFO] {len(clubs_data)} clubs ajoutés à la BD")
    
    # Ajouter des evenements
    events_data = [
        {
            "titre": "Semaine de la langue française",
            "description": "Célébration de la francophonie avec lectures, ateliers et débats.",
            "date_debut": "2026-03-17",
            "date_fin": "2026-03-23",
            "horaire": "Tous les jours 10h-18h",
            "localisation": "Tout le bâtiment",
            "categorie": "Culturel"
        },
        {
            "titre": "Journée du livre africain",
            "description": "Hommage aux écrivains africains avec une exposition et des dédicaces.",
            "date_debut": "2026-06-07",
            "date_fin": "2026-06-07",
            "horaire": "10h-17h",
            "localisation": "Salle principale",
            "categorie": "Littéraire"
        },
        {
            "titre": "Conférence: L'avenir de la lecture numérique",
            "description": "Conférence sur l'évolution des pratiques de lecture à l'ère numérique.",
            "date_debut": "2026-07-15",
            "date_fin": "2026-07-15",
            "horaire": "14h-16h",
            "localisation": "Cyberespace",
            "categorie": "Éducatif"
        },
    ]
    
    for event_data in events_data:
        event = Event(**event_data)
        db.add(event)
    
    db.commit()
    print(f"[INFO] {len(events_data)} événements ajoutés à la BD")
    
    db.close()
    print("[SUCCESS] Base de donnees initialisée avec succes!")


if __name__ == "__main__":
    try:
        populate_database()
    except Exception as e:
        print(f"[ERROR] Erreur lors de l'initialisation: {e}")
        sys.exit(1)
