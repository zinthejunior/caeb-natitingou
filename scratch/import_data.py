import os
import sys
import django
import pandas as pd
import requests
import uuid
import re
from datetime import datetime

# Setup Django
sys.path.append(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from api.models import Book, Borrow, User

def get_cover_url(isbn):
    if not isbn or str(isbn).strip() in ['nan', '', ' ']:
        return " "
    isbn_clean = re.sub(r'[^0-9X]', '', str(isbn))
    if not isbn_clean:
        return " "
    
    # We use OpenLibrary to get the cover
    return f"https://covers.openlibrary.org/b/isbn/{isbn_clean}-L.jpg"

def parse_name(full_name):
    # Split name and extract uppercase parts as last name
    full_name = full_name.replace('\xa0', ' ').strip()
    words = full_name.split()
    last_name_parts = []
    first_name_parts = []
    
    for word in words:
        # If word is fully uppercase and at least 2 chars or is a single letter (like 'O.')
        # Wait, if word is purely uppercase
        clean_word = word.replace('.', '').replace(',', '')
        if clean_word.isupper():
            last_name_parts.append(word)
        else:
            first_name_parts.append(word)
            
    last_name = " ".join(last_name_parts) if last_name_parts else " "
    first_name = " ".join(first_name_parts) if first_name_parts else " "
    
    # Fallback if no uppercase words found
    if last_name == " " and first_name != " ":
        last_name = first_name
        first_name = " "
        
    return first_name, last_name

def import_books():
    print("Importing books...")
    df_books = pd.read_excel(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Caddie_EXPL_188.xlsx", header=1)
    
    # Set the first row as the actual column names
    columns = df_books.iloc[0].tolist()
    df_books.columns = columns
    df_books = df_books.drop(index=0)
    
    books_created = 0
    for _, row in df_books.iterrows():
        code_barres = str(row.get('Code-barres', '')).strip()
        if not code_barres or code_barres == 'nan':
            continue
        
        titre = str(row.get('Titre propre', ' ')).strip()
        if titre == 'nan' or not titre: titre = " "
        if len(titre) > 300: titre = titre[:300]
        
        auteur = str(row.get('aut_entree_0', ' ')).strip()
        if auteur == 'nan' or not auteur: auteur = " "
        
        annee_str = str(row.get('Année', ' ')).strip()
        annee = None
        if annee_str.isdigit():
            annee = int(annee_str)
            
        pages_str = str(row.get("Importance matérielle (nombre de pages, d'éléments...)", ' ')).strip()
        nb_pages = None
        match = re.search(r'(\d+)', pages_str)
        if match:
            nb_pages = int(match.group(1))
            
        resume = str(row.get('Résumé', ' ')).strip()
        if resume == 'nan' or not resume: resume = " "
        
        isbn = str(row.get('ISBN', ' ')).strip()
        couverture_url = get_cover_url(isbn)
        
        categorie = 'adulte'
        section = str(row.get('section_libelle_opac', ' ')).lower()
        if 'enfant' in section: categorie = 'enfant'
        elif 'ado' in section: categorie = 'ado'
        
        genre = str(row.get('Type de document', ' ')).strip()
        if genre == 'nan' or not genre: genre = " "
        
        Book.objects.update_or_create(
            id=code_barres[:20],
            defaults={
                'titre': titre,
                'auteur': auteur[:200],
                'genre': genre[:100],
                'sous_genre': " ",
                'annee': annee,
                'nb_pages': nb_pages,
                'resume': resume,
                'categorie_age': categorie,
                'couverture_url': couverture_url,
            }
        )
        books_created += 1
    print(f"Books imported: {books_created}")

def import_borrows():
    print("Importing borrows...")
    df_prets = pd.read_excel(r"c:\wamp64\www\Projet Bibliothèque\app1 - Copie\Data\Prêt total.xlsx")
    borrows_created = 0
    
    for _, row in df_prets.iterrows():
        code_barres = str(row.get('Code-barres', '')).strip()
        emprunteur = str(row.get('Emprunteur', '')).strip()
        sortie_str = str(row.get('Sortie', '')).strip()
        retour_str = str(row.get('Retour', '')).strip()
        
        if not code_barres or code_barres == 'nan' or not emprunteur or emprunteur == 'nan':
            continue
            
        try:
            book = Book.objects.get(id=code_barres[:20])
        except Book.DoesNotExist:
            continue
            
        # Parse name
        first_name, last_name = parse_name(emprunteur)
        
        # Get or create user
        user_qs = User.objects.filter(last_name=last_name, first_name=first_name)
        if user_qs.exists():
            user = user_qs.first()
        else:
            user_id = str(uuid.uuid4())[:40]
            # username from last_name and first_name without spaces
            base_username = f"{first_name}{last_name}".replace(" ", "").lower()
            if not base_username: base_username = "user"
            
            # ensure username uniqueness
            username = base_username[:150]
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username[:140]}{counter}"
                counter += 1
                
            user = User.objects.create(
                id=user_id,
                username=username,
                last_name=last_name[:100],
                first_name=first_name[:100],
                type_compte='membre'
            )
            
        # parse dates
        try:
            date_emprunt = datetime.strptime(sortie_str, "%d/%m/%Y").date()
        except:
            date_emprunt = datetime.now().date()
            
        try:
            date_prevue = datetime.strptime(retour_str, "%d/%m/%Y").date()
        except:
            date_prevue = datetime.now().date()
            
        borrow_id = f"bor_{code_barres}_{date_emprunt.strftime('%Y%m%d')}"[:20]
        
        Borrow.objects.get_or_create(
            id=borrow_id,
            defaults={
                'user': user,
                'livre': book,
                'date_emprunt': date_emprunt,
                'date_prevue': date_prevue,
                'statut': 'en_cours'
            }
        )
        borrows_created += 1
        
    print(f"Borrows imported: {borrows_created}")

if __name__ == "__main__":
    import_books()
    import_borrows()
    print("Done!")
