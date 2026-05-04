import os
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Book, ReadingClub, Event, News

class Command(BaseCommand):
    help = 'Imports initial data from JSON files'

    def handle(self, *args, **options):
        data_dir = os.path.join(settings.BASE_DIR, 'dataset', 'data')
        
        # Import Books
        books_file = os.path.join(data_dir, 'livres.json')
        if os.path.exists(books_file):
            with open(books_file, 'r', encoding='utf-8') as f:
                books_data = json.load(f)
                books_created = 0
                for item in books_data:
                    # Clean up data
                    try:
                        annee = int(item.get('annee')) if item.get('annee') else None
                    except (ValueError, TypeError):
                        annee = None

                    try:
                        nb_pages = int(item.get('nb_pages')) if item.get('nb_pages') else None
                    except (ValueError, TypeError):
                        nb_pages = None
                        
                    note_moyenne = 0.0
                    if item.get('rating') is not None:
                        note_moyenne = float(item['rating'])
                    if item.get('note_moyenne') is not None:
                        note_moyenne = float(item['note_moyenne'])

                    nb_notes = 0
                    if item.get('reviewCount') is not None:
                        nb_notes = int(item['reviewCount'])
                    if item.get('nb_notes') is not None:
                        nb_notes = int(item['nb_notes'])

                    book, created = Book.objects.get_or_create(
                        id=item.get('ol_id') or item.get('id', f"book_{books_created}"),
                        defaults={
                            'titre': item.get('titre') or item.get('title', 'Sans titre'),
                            'auteur': item.get('auteur') or item.get('author', 'Auteur Inconnu'),
                            'genre': item.get('genre', 'Général'),
                            'sous_genre': item.get('sous_genre', ''),
                            'annee': annee,
                            'nb_pages': nb_pages,
                            'langue': item.get('langue', 'fr'),
                            'categorie_age': item.get('categorie_age') or item.get('targetAudience', 'all'),
                            'couverture_url': item.get('cover') or item.get('couverture_url', ''),
                            'resume': item.get('synopsis') or item.get('resume', ''),
                            'note_moyenne': note_moyenne,
                            'nb_notes': nb_notes,
                            'disponible': item.get('isAvailable', True) if 'isAvailable' in item else item.get('disponible', True),
                        }
                    )
                    if created:
                        books_created += 1
                self.stdout.write(self.style.SUCCESS(f"Imported {books_created} books."))
        
        # Import Clubs
        clubs_file = os.path.join(data_dir, 'clubs.json')
        if os.path.exists(clubs_file):
            with open(clubs_file, 'r', encoding='utf-8') as f:
                clubs_data = json.load(f)
                clubs_created = 0
                for item in clubs_data:
                    manager = item.get('manager', {})
                    club, created = ReadingClub.objects.get_or_create(
                        id=item.get('id'),
                        defaults={
                            'name': item.get('name', 'Club'),
                            'description': item.get('description', ''),
                            'image': item.get('image', ''),
                            'target_audience': item.get('targetAudience', 'all'),
                            'member_count': item.get('memberCount', 0),
                            'manager_name': manager.get('name', ''),
                            'manager_role': manager.get('role', ''),
                            'manager_email': manager.get('email', ''),
                        }
                    )
                    if created:
                        clubs_created += 1
                self.stdout.write(self.style.SUCCESS(f"Imported {clubs_created} clubs."))

        # Import Events
        events_file = os.path.join(data_dir, 'events.json')
        if os.path.exists(events_file):
            with open(events_file, 'r', encoding='utf-8') as f:
                events_data = json.load(f)
                events_created = 0
                for item in events_data:
                    try:
                        date_str = item.get('date')
                        if date_str:
                            if 'T' in date_str:
                                date_obj = datetime.fromisoformat(date_str.replace('Z', '')).date()
                            else:
                                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                        else:
                            date_obj = datetime.now().date()
                    except ValueError:
                        date_obj = datetime.now().date()

                    club_obj = None
                    if item.get('clubId'):
                        try:
                            club_obj = ReadingClub.objects.get(id=item.get('clubId'))
                        except ReadingClub.DoesNotExist:
                            pass

                    event, created = Event.objects.get_or_create(
                        id=item.get('id'),
                        defaults={
                            'title': item.get('title', 'Événement'),
                            'description': item.get('description', ''),
                            'type_event': item.get('type', 'conference'),
                            'date': date_obj,
                            'time': item.get('time', '12:00'),
                            'location': item.get('location', 'Bibliothèque'),
                            'participant_count': item.get('participantCount', 0),
                            'club': club_obj
                        }
                    )
                    if created:
                        events_created += 1
                self.stdout.write(self.style.SUCCESS(f"Imported {events_created} events."))

        # Import News
        news_file = os.path.join(data_dir, 'news.json')
        if os.path.exists(news_file):
            with open(news_file, 'r', encoding='utf-8') as f:
                news_data = json.load(f)
                news_created = 0
                for item in news_data:
                    try:
                        date_str = item.get('date')
                        if date_str:
                            if 'T' in date_str:
                                date_obj = datetime.fromisoformat(date_str.replace('Z', '')).date()
                            else:
                                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                        else:
                            date_obj = datetime.now().date()
                    except ValueError:
                        date_obj = datetime.now().date()

                    news, created = News.objects.get_or_create(
                        id=item.get('id'),
                        defaults={
                            'title': item.get('title', 'Actualité'),
                            'excerpt': item.get('excerpt', ''),
                            'content': item.get('content', ''),
                            'image': item.get('image', ''),
                            'date': date_obj,
                            'category': item.get('category', 'general'),
                            'featured': item.get('featured', False)
                        }
                    )
                    if created:
                        news_created += 1
                self.stdout.write(self.style.SUCCESS(f"Imported {news_created} news items."))

