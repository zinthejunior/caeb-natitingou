import os
import django
import uuid
from datetime import datetime, date

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, Book, ReadingClub, Event, News

def seed_data():
    print("Démarrage du peuplement (seeding) de la base de données...")

    # --- LIVRES ---
    books_data = [
        {
            "id": "livre-001",
            "titre": "L'Enfant noir",
            "auteur": "Camara Laye",
            "couverture_url": "/book-6.jpg",
            "genre": "Classique",
            "annee": 1953,
            "nb_pages": 224,
            "categorie_age": "adulte",
            "resume": "Récit autobiographique de Camara Laye, qui narre son enfance en Guinée.",
            "note_moyenne": 4.8,
            "nb_notes": 312,
            "exemplaires": 3,
        },
        {
            "id": "livre-002",
            "titre": "Une si longue lettre",
            "auteur": "Mariama Bâ",
            "couverture_url": "/book-1.jpg",
            "genre": "Roman",
            "annee": 1980,
            "nb_pages": 168,
            "categorie_age": "adulte",
            "resume": "À travers une longue lettre adressée à son amie Aïssatou, Ramatoulaye revisite sa vie.",
            "note_moyenne": 4.7,
            "nb_notes": 278,
            "exemplaires": 2,
        },
        {
            "id": "livre-003",
            "titre": "Nexus 2084",
            "auteur": "A.R. Vasquez",
            "couverture_url": "/book-3.jpg",
            "genre": "Science-Fiction",
            "annee": 2022,
            "nb_pages": 412,
            "categorie_age": "adulte",
            "resume": "Dans un monde où l'intelligence artificielle gouverne les villes.",
            "note_moyenne": 4.6,
            "nb_notes": 198,
            "exemplaires": 5,
        },
    ]

    for b in books_data:
        Book.objects.get_or_create(
            id=b["id"],
            defaults={
                "titre": b["titre"],
                "auteur": b["auteur"],
                "couverture_url": b["couverture_url"],
                "genre": b["genre"],
                "annee": b["annee"],
                "nb_pages": b["nb_pages"],
                "categorie_age": b["categorie_age"],
                "resume": b["resume"],
                "note_moyenne": b["note_moyenne"],
                "nb_notes": b["nb_notes"],
                "exemplaires": b["exemplaires"],
            }
        )
    print(f"Livres: {Book.objects.count()} en base.")

    # --- CLUBS ---
    clubs_data = [
        {
            "id": "club-001",
            "name": "Les Classiques Revisités",
            "description": "Un club dédié à la redécouverte des grands textes.",
            "image": "/club-1.jpg",
            "target_audience": "adult",
        },
        {
            "id": "club-002",
            "name": "Club Anglais CAEB",
            "description": "Pratiquez votre anglais à travers la lecture.",
            "image": "/club-2.jpg",
            "target_audience": "teen",
        },
    ]
    for c in clubs_data:
        ReadingClub.objects.get_or_create(
            id=c["id"], 
            defaults={"name": c["name"], "description": c["description"], "image": c["image"], "target_audience": c["target_audience"]}
        )
    print(f"Clubs: {ReadingClub.objects.count()} en base.")

    # --- NEWS ---
    news_data = [
        {
            "id": "news-001",
            "title": "50 nouvelles acquisitions",
            "excerpt": "La CAEB enrichit son catalogue.",
            "content": "Contenu détaillé ici...",
            "image": "/news-1.jpg",
            "date": date.today(),
            "category": "announcement",
        },
    ]
    for n in news_data:
        News.objects.get_or_create(
            id=n["id"], 
            defaults={
                "title": n["title"], 
                "excerpt": n["excerpt"], 
                "content": n["content"], 
                "image": n["image"], 
                "date": n["date"], 
                "category": n["category"]
            }
        )
    print(f"News: {News.objects.count()} en base.")

    print("Peuplement terminé avec succès !")

if __name__ == "__main__":
    seed_data()
