import os
import json
import django
from datetime import datetime

# Configuration de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, Book, Borrow, Interaction, Notification, ReadingClub, Event, News, Badge

def load_json(filename):
    path = os.path.join('dataset', 'data', f'{filename}.json')
    if not os.path.exists(path):
        print(f"File {path} not found")
        return []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def import_books():
    print("Importation des livres...")
    books_data = load_json('livres')
    for item in books_data:
        Book.objects.update_or_create(
            id=item['id'],
            defaults={
                'titre': item.get('titre', item.get('title', 'Sans titre')),
                'auteur': item.get('auteur', item.get('author', 'Inconnu')),
                'genre': item.get('genre'),
                'sous_genre': item.get('sous_genre'),
                'annee': item.get('annee', item.get('year')),
                'nb_pages': item.get('nb_pages', item.get('pages', 0)) if item.get('nb_pages') is not None or item.get('pages') is not None else 0,
                'langue': item.get('langue', 'fr') or 'fr',
                'categorie_age': item.get('categorie_age', item.get('targetAudience', 'adulte')) or 'adulte',
                'note_moyenne': item.get('note_moyenne', item.get('rating', 0)) if item.get('note_moyenne') is not None or item.get('rating') is not None else 0,
                'nb_notes': item.get('nb_notes', item.get('reviewCount', 0)) if item.get('nb_notes') is not None or item.get('reviewCount') is not None else 0,
                'nb_emprunts': item.get('nb_emprunts') if item.get('nb_emprunts') is not None else 0,
                'popularite': item.get('popularite') if item.get('popularite') is not None else 0,
                'resume': item.get('resume', item.get('synopsis')),
                'couverture_url': item.get('couverture_url', item.get('cover')),
                'vecteur_livre': item.get('vecteur_livre'),
                'disponible': item.get('disponible', item.get('isAvailable', True))
            }
        )
    print(f"{len(books_data)} livres importés.")

def import_users():
    print("Importation des utilisateurs...")
    users_data = load_json('users')
    for item in users_data:
        username = item.get('email', item.get('username'))
        if not username: continue
        
        if User.objects.filter(username=username).exists():
            continue
            
        first_name = item.get('nom', '').split(' ')[0] if item.get('nom') else item.get('firstName', '')
        last_name = ' '.join(item.get('nom', '').split(' ')[1:]) if item.get('nom') else item.get('lastName', '')
        
        User.objects.create_user(
            id=item['id'],
            username=username,
            email=item.get('email', ''),
            password='password123',
            first_name=first_name,
            last_name=last_name,
            type_compte=item.get('type_compte', 'non_membre').replace('-', '_'),
            date_naissance=item.get('date_naissance', item.get('birthDate')),
            niveau_etude=item.get('niveau_etude', item.get('educationLevel')),
            classe=item.get('classe'),
            genre_prefere=item.get('genre_prefere'),
            sous_genre_prefere=item.get('sous_genre_prefere'),
            score_confiance=item.get('score_confiance', 0),
            profil_complet=bool(item.get('profil_complet')),
        )
    print(f"{len(users_data)} utilisateurs importés.")

def import_clubs():
    print("Importation des clubs...")
    clubs_data = load_json('clubs')
    for item in clubs_data:
        manager = item.get('manager', {})
        ReadingClub.objects.update_or_create(
            id=item['id'],
            defaults={
                'name': item['name'],
                'description': item['description'],
                'image': item.get('image'),
                'target_audience': item.get('targetAudience', 'all'),
                'member_count': item.get('memberCount', 0),
                'manager_name': manager.get('name'),
                'manager_role': manager.get('role'),
                'manager_email': manager.get('email'),
            }
        )
    print(f"{len(clubs_data)} clubs importés.")

def import_events():
    print("Importation des événements...")
    events_data = load_json('events')
    for item in events_data:
        Event.objects.update_or_create(
            id=item['id'],
            defaults={
                'title': item['title'],
                'description': item['description'],
                'type_event': item.get('type', 'conference'),
                'date': item['date'],
                'time': item['time'],
                'location': item['location'],
                'participant_count': item.get('participantCount', 0),
                'club_id': item.get('clubId'),
            }
        )
    print(f"{len(events_data)} événements importés.")

def import_news():
    print("Importation des actualités...")
    news_data = load_json('news')
    for item in news_data:
        News.objects.update_or_create(
            id=item['id'],
            defaults={
                'title': item['title'],
                'excerpt': item['excerpt'],
                'content': item.get('content'),
                'image': item.get('image'),
                'date': item['date'],
                'category': item.get('category', 'general'),
                'featured': bool(item.get('featured')),
            }
        )
    print(f"{len(news_data)} actualités importées.")

if __name__ == '__main__':
    import_books()
    import_users()
    import_clubs()
    import_events()
    import_news()
    print("Importation terminée !")
