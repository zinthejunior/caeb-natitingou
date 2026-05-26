import os
import sys
import django
import random
from datetime import datetime, timedelta

# Setup Django
sys.path.append(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import (
    User, Book, Borrow, Interaction, Review, ReadingClub, 
    Event, ParticipationEvent, News, LabStation
)
from django.utils import timezone

def clean_and_keep_10_users():
    print("Nettoyage des utilisateurs...")
    # Get all regular members (not staff)
    regular_users = list(User.objects.filter(is_staff=False, type_compte='membre'))
    
    # Shuffle and pick 10 to keep
    random.shuffle(regular_users)
    users_to_keep = regular_users[:10]
    users_to_keep_ids = [u.id for u in users_to_keep]
    
    # Delete the rest
    users_to_delete = User.objects.filter(is_staff=False).exclude(id__in=users_to_keep_ids)
    deleted_count, _ = users_to_delete.delete()
    print(f"{deleted_count} utilisateurs supprimés. 10 utilisateurs conservés.")
    return users_to_keep

def generate_clubs_and_events(users):
    print("Création des clubs de lecture et événements...")
    ReadingClub.objects.all().delete()
    Event.objects.all().delete()
    
    clubs_data = [
        {"id": "club_1", "name": "Cercle Littéraire Africain", "desc": "Découverte et analyse des auteurs africains contemporains et classiques.", "aud": "adult"},
        {"id": "club_2", "name": "Mangas & Pop Culture", "desc": "Pour les passionnés de BDs, Mangas et cultures de l'imaginaire.", "aud": "teen"},
        {"id": "club_3", "name": "Les Petits Lecteurs", "desc": "Initiation à la lecture et contes pour les plus jeunes.", "aud": "children"}
    ]
    
    clubs = []
    for cd in clubs_data:
        club = ReadingClub.objects.create(
            id=cd["id"],
            name=cd["name"],
            description=cd["desc"],
            target_audience=cd["aud"],
            manager_name="Aminata Diallo",
            manager_role="Bibliothécaire en chef",
            member_count=random.randint(5, 10)
        )
        # Add random users
        members = random.sample(users, k=random.randint(2, 5))
        club.members.add(*members)
        clubs.append(club)
        
    # Events
    events_data = [
        {"id": "evt_1", "title": "Soirée Contes et Légendes", "type": "club", "club": clubs[0]},
        {"id": "evt_2", "title": "Atelier d'écriture créative", "type": "workshop", "club": clubs[1]},
        {"id": "evt_3", "title": "Rencontre avec un auteur local", "type": "conference", "club": None},
    ]
    
    for ed in events_data:
        event = Event.objects.create(
            id=ed["id"],
            title=ed["title"],
            description=f"Participez à notre {ed['title'].lower()} ce mois-ci. Ouvert à tous !",
            type_event=ed["type"],
            date=timezone.now().date() + timedelta(days=random.randint(2, 15)),
            time="15:00",
            location="Salle polyvalente, CAEB",
            club=ed["club"],
            participant_count=random.randint(10, 30)
        )
        # Inscription
        participants = random.sample(users, k=random.randint(1, 4))
        for p in participants:
            ParticipationEvent.objects.create(
                user=p, event=event,
                nom_complet=f"{p.first_name} {p.last_name}",
                email=f"{p.username}@example.com",
                telephone="00000000"
            )

def generate_news():
    print("Création des actualités...")
    News.objects.all().delete()
    news_data = [
        {"id": "news_1", "title": "Arrivage de nouveaux romans", "cat": "announcement", "feat": True, "desc": "Venez découvrir notre nouvelle sélection de plus de 200 romans d'auteurs africains !"},
        {"id": "news_2", "title": "Fermeture exceptionnelle ce vendredi", "cat": "closure", "feat": False, "desc": "La bibliothèque sera fermée pour inventaire. Merci de votre compréhension."},
        {"id": "news_3", "title": "Nouveau Labo Numérique", "cat": "general", "feat": True, "desc": "Nos nouveaux postes informatiques et équipements sont désormais disponibles sur réservation."},
    ]
    for nd in news_data:
        News.objects.create(
            id=nd["id"],
            title=nd["title"],
            category=nd["cat"],
            featured=nd["feat"],
            excerpt=nd["desc"],
            content=nd["desc"] * 3,
            date=timezone.now().date() - timedelta(days=random.randint(1, 10))
        )

def generate_lab_stations():
    print("Création des stations labo...")
    LabStation.objects.all().delete()
    for i in range(1, 6):
        LabStation.objects.create(
            name=f"Poste PC #{i}",
            specifications="Windows 11, Suite Office, Accès Internet Fibre"
        )
    LabStation.objects.create(
        name="Imprimante 3D",
        specifications="Creality Ender 3, PLA fourni"
    )

def generate_interactions_and_reviews(users):
    print("Génération d'interactions et d'avis...")
    Interaction.objects.all().delete()
    Review.objects.all().delete()
    
    books = list(Book.objects.all()[:50]) # Pick a sample of 50 books
    
    comments = [
        "Un livre fascinant, je le recommande vivement !",
        "L'histoire est un peu lente au début mais la fin est incroyable.",
        "Une excellente ressource pour mes recherches.",
        "J'ai adoré l'univers et les personnages.",
        "Un classique indémodable."
    ]
    
    for u in users:
        # 3 to 8 interactions
        for _ in range(random.randint(3, 8)):
            b = random.choice(books)
            Interaction.objects.create(
                id=f"int_{u.id[:5]}_{random.randint(1000,9999)}",
                user=u, livre=b,
                type_action=random.choice(['vue', 'like', 'marquage']),
                livre_lu=random.choice([True, False]),
                source="application"
            )
        
        # 1 to 3 reviews
        for _ in range(random.randint(1, 3)):
            b = random.choice(books)
            Review.objects.create(
                user=u, livre=b,
                note=random.randint(3, 5),
                commentaire=random.choice(comments)
            )

def main():
    users = clean_and_keep_10_users()
    if not users:
        print("Aucun utilisateur trouvé ! Assurez-vous que l'importation est terminée.")
        return
        
    generate_clubs_and_events(users)
    generate_news()
    generate_lab_stations()
    generate_interactions_and_reviews(users)
    print("Terminé avec succès !")

if __name__ == "__main__":
    main()
