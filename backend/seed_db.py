import os
import django
from datetime import datetime

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, Book, Club, Event, News, Genre, EducationLevel

def seed_data():
    print("Démarrage du peuplement (seeding) de la base de données...")

    # --- GENRES ---
    genres_list = [
        'Roman', 'Policier', 'Thriller', 'Romance', 'Science-Fiction', 'Fantastique',
        'Historique', 'Biographie', 'Développement personnel', 'Horreur', 'Aventure',
        'Philosophie', 'Poésie', 'Jeunesse', 'Cuisine', 'Voyage', 'Classique', 'Humour', 'Essai',
    ]
    for g_name in genres_list:
        Genre.objects.get_or_create(name=g_name)
    print(f"Genres: {Genre.objects.count()} en base.")

    # --- NIVEAUX D'ÉTUDE ---
    levels_data = [
        {'name': 'école', 'has_classes': True},
        {'name': 'lycée', 'has_classes': True},
        {'name': 'étudiant', 'has_classes': True},
        {'name': 'professionnel', 'has_classes': True},
        {'name': 'autre', 'has_classes': False},
    ]
    for l in levels_data:
        EducationLevel.objects.get_or_create(name=l['name'], defaults={'has_classes': l['has_classes']})
    print(f"Niveaux d'étude: {EducationLevel.objects.count()} en base.")

    # --- LIVRES ---
    books_data = [
        {
            "id": "livre-001",
            "title": "L'Enfant noir",
            "author": "Camara Laye",
            "cover": "/book-6.jpg",
            "genre": "Classique",
            "year": 1953,
            "pages": 224,
            "target_audience": "adult",
            "synopsis": "Récit autobiographique de Camara Laye, qui narre son enfance en Guinée, la chaleur de sa famille et l'apprentissage des traditions de son peuple.",
            "rating": 4.8,
            "review_count": 312,
            "is_available": True,
            "is_new": False,
            "is_popular": True,
        },
        {
            "id": "livre-002",
            "title": "Une si longue lettre",
            "author": "Mariama Bâ",
            "cover": "/book-1.jpg",
            "genre": "Roman",
            "year": 1980,
            "pages": 168,
            "target_audience": "adult",
            "synopsis": "À travers une longue lettre adressée à son amie Aïssatou, Ramatoulaye revisite sa vie de femme africaine confrontée à la polygamie.",
            "rating": 4.7,
            "review_count": 278,
            "is_available": True,
            "is_new": False,
            "is_popular": True,
        },
        {
            "id": "livre-003",
            "title": "Nexus 2084",
            "author": "A.R. Vasquez",
            "cover": "/book-3.jpg",
            "genre": "Science-Fiction",
            "year": 2022,
            "pages": 412,
            "target_audience": "adult",
            "synopsis": "Dans un world où l'intelligence artificielle gouverne les villes, un ingénieur découvre une faille dans le système.",
            "rating": 4.6,
            "review_count": 198,
            "is_available": True,
            "is_new": True,
            "is_popular": True,
        },
        {
            "id": "livre-004",
            "title": "L'Écho du Silence",
            "author": "Céline Dubois",
            "cover": "/book-2.jpg",
            "genre": "Roman",
            "year": 2021,
            "pages": 320,
            "target_audience": "adult",
            "synopsis": "Un roman bouleversant sur le deuil et la reconstruction.",
            "rating": 4.5,
            "review_count": 156,
            "is_available": False,
            "is_new": False,
            "is_popular": True,
        },
    ]

    for b in books_data:
        Book.objects.get_or_create(
            title=b["title"],
            defaults={
                "author": b["author"],
                "cover": b["cover"],
                "genre": b["genre"],
                "year": b["year"],
                "pages": b["pages"],
                "target_audience": b["target_audience"],
                "synopsis": b["synopsis"],
                "rating": b["rating"],
                "review_count": b["review_count"],
                "is_available": b["is_available"],
                "is_new": b["is_new"],
                "is_popular": b["is_popular"],
            }
        )
    print(f"Livres: {Book.objects.count()} en base.")

    # --- CLUBS ---
    clubs_data = [
        {
            "name": "Les Classiques Revisités",
            "description": "Un club dédié à la redécouverte des grands textes de la littérature africaine et mondiale.",
            "cover": "/club-1.jpg",
        },
        {
            "name": "Club Anglais CAEB",
            "description": "Pratiquez et améliorez votre anglais à travers la lecture de romans.",
            "cover": "/club-2.jpg",
        },
    ]
    for c in clubs_data:
        Club.objects.get_or_create(name=c["name"], defaults={"description": c["description"], "cover": c["cover"]})
    print(f"Clubs: {Club.objects.count()} en base.")

    # --- NEWS ---
    news_data = [
        {
            "title": "50 nouvelles acquisitions au catalogue",
            "content": "La CAEB enrichit son catalogue avec 50 nouveaux titres.",
            "cover": "/news-1.jpg",
        },
        {
            "title": "Le labo IA ouvre ses portes aux lycéens",
            "content": "Dès avril 2026, les lycéens de Natitingou accèdent au laboratoire IA.",
            "cover": "/news-2.jpg",
        },
    ]
    for n in news_data:
        News.objects.get_or_create(title=n["title"], defaults={"content": n["content"], "cover": n["cover"]})
    print(f"News: {News.objects.count()} en base.")

    print("Peuplement terminé avec succès !")

if __name__ == "__main__":
    seed_data()
