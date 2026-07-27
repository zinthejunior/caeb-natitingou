"""
Script d'importation des livres depuis features_livres.xlsx vers PostgreSQL / Supabase
Usage : python manage.py import_data --file Data/features_livres.xlsx
"""

import re
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Book


def extract_year(value):
    """Extrait l'année (4 chiffres) d'une chaîne comme 'DL 2019', 'cop. 2023', 'ca2025', 'impr. 2014'"""
    if pd.isna(value) or not value:
        return None
    value_str = str(value).strip()
    match = re.search(r'\b(19|20)\d{2}\b', value_str)
    if match:
        return int(match.group())
    return None


def clean_text(text, max_length=None):
    """Nettoie et tronque un texte si nécessaire"""
    if pd.isna(text) or not text:
        return None
    text = str(text).strip()
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    if max_length and len(text) > max_length:
        text = text[:max_length]
    return text if text else None


def infer_genre_from_section(section):
    """Infère le genre à partir de la section"""
    if pd.isna(section):
        return 'Autre'
    
    section = str(section).upper()
    
    genre_mapping = [
        ('LITTÉRATURE', 'Littérature'),
        ('ROMAN', 'Littérature'),
        ('POÉSIE', 'Littérature'),
        ('THÉÂTRE', 'Littérature'),
        ('OEUVRES LITTÉRAIRES', 'Littérature'),
        ('PHYSIQUE', 'Sciences'),
        ('CHIMIE', 'Sciences'),
        ('SCIENCES DE LA VIE', 'Sciences'),
        ('SVT', 'Sciences'),
        ('MATHÉMATIQUES', 'Mathématiques'),
        ('ALGÈBRE', 'Mathématiques'),
        ('GÉOMÉTRIE', 'Mathématiques'),
        ('ARITHMÉTIQUE', 'Mathématiques'),
        ('CALCUL', 'Mathématiques'),
        ('HISTOIRE', 'Histoire'),
        ('GÉOGRAPHIE', 'Géographie'),
        ('PHILOSOPHIE', 'Philosophie'),
        ('LANGUES', 'Langues'),
        ('ANGLAIS', 'Langues'),
        ('ESPAGNOL', 'Langues'),
        ('FRANÇAIS', 'Langues'),
        ('COMPTABILITÉ', 'Comptabilité'),
        ('FINANCE', 'Économie'),
        ('FORMATION TECHNIQUE', 'Technique'),
        ('DÉVELOPPEMENT PERSONNEL', 'Développement personnel'),
        ('RELIGION', 'Religion'),
        ('BANDES DESSINÉES', 'Bande dessinée'),
    ]
    
    for keyword, genre in genre_mapping:
        if keyword in section:
            return genre
    
    return 'Autre'


def infer_sous_genre(section, titre):
    """Infère un sous-genre plus spécifique"""
    if pd.isna(section):
        return None
    
    section = str(section).upper()
    titre_upper = str(titre).upper() if not pd.isna(titre) else ""
    
    if 'BANDES DESSINÉES' in section:
        return 'BD'
    if 'JEUNESSE' in section:
        return 'Jeunesse'
    if 'UNIVERSITAIRE' in section or 'UNIVERSITAIRES' in section:
        return 'Universitaire'
    if 'SECONDAIRE' in section:
        if 'MATHS' in titre_upper:
            return 'Mathématiques secondaire'
        if 'PCT' in titre_upper or 'PHYSIQUE' in titre_upper:
            return 'Sciences secondaire'
        return 'Manuel scolaire'
    if 'PROGRAMME' in section:
        return 'Au programme scolaire'
    
    return None


def infer_categorie_age(section, resume):
    """Détermine la catégorie d'âge cible"""
    if pd.isna(section):
        return 'adulte'
    
    section = str(section).upper()
    
    enfant_keywords = ['PRIMAIRE', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', 'ENFANT', 'JEUNE PUBLIC']
    ado_keywords = ['SECONDAIRE', 'COLLÈGE', 'LYCÉE', '6ÈME', '5ÈME', '4ÈME', '3ÈME', 
                    '2NDE', 'PREMIÈRE', 'TERMINALE', 'JEUNESSE', 'JEUNE']
    
    for keyword in enfant_keywords:
        if keyword in section:
            return 'enfant'
    
    for keyword in ado_keywords:
        if keyword in section:
            return 'ado'
    
    return 'adulte'


def detect_language(section, titre):
    """Détecte la langue du livre"""
    if pd.isna(section):
        return 'fr'
    
    section = str(section).upper()
    
    if 'ANGLAIS' in section:
        return 'en'
    if 'ESPAGNOL' in section:
        return 'es'
    
    return 'fr'


COVER_THEMES = {
    'Littérature': [
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=600&q=80",
    ],
    'Sciences': [
        "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
    ],
    'Mathématiques': [
        "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
    ],
    'Jeunesse': [
        "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80",
    ],
    'Histoire': [
        "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80",
    ],
    'Bande dessinée': [
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
    ],
    'Langues': [
        "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80",
    ],
    'Default': [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=600&q=80",
        "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80",
    ]
}


def resolve_cover_url(code_barres_str, genre, idx):
    """
    Attribution automatique et élégante de couverture de livre :
    - Si le code-barres ressemble à un ISBN (10 ou 13 chiffres), tente Open Library Covers API.
    - Sinon, sélectionne une image HD pertinente de la banque Unsplash selon le genre.
    """
    cleaned_code = re.sub(r'\D', '', str(code_barres_str))
    if len(cleaned_code) in (10, 13):
        return f"https://covers.openlibrary.org/b/isbn/{cleaned_code}-L.jpg"
    
    covers_pool = COVER_THEMES.get(genre, COVER_THEMES['Default'])
    return covers_pool[idx % len(covers_pool)]


class Command(BaseCommand):
    help = 'Importe les livres depuis un fichier Excel vers PostgreSQL / Supabase'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True, 
                           help='Chemin vers le fichier Excel')
        parser.add_argument('--batch-size', type=int, default=500,
                           help='Taille des lots pour bulk_create')

    def handle(self, *args, **options):
        excel_path = options['file']
        batch_size = options['batch_size']
        
        try:
            self.stdout.write(f"[INFO] Lecture du fichier : {excel_path}")
            df = pd.read_excel(excel_path, sheet_name='Sheet1')
            self.stdout.write(f"[OK] {len(df)} lignes chargees")
            
            books_to_create = []
            stats = {'created': 0, 'duplicates': 0, 'errors': 0}
            existing_ids = set(Book.objects.values_list('id', flat=True))
            
            for index, row in df.iterrows():
                try:
                    code_barres = row.get('Code_barres')
                    if pd.isna(code_barres):
                        stats['errors'] += 1
                        continue
                    
                    book_id = str(int(code_barres))
                    if book_id in existing_ids:
                        stats['duplicates'] += 1
                        continue
                    
                    titre = clean_text(row.get('Titre'), max_length=300)
                    if not titre:
                        stats['errors'] += 1
                        continue
                    
                    auteur = clean_text(row.get('Auteur'), max_length=200)
                    section = clean_text(row.get('Section'), max_length=200)
                    cote = clean_text(row.get('Cote'), max_length=50)
                    annee = extract_year(row.get('Annee'))
                    description = clean_text(row.get('Description'))
                    resume = clean_text(row.get('Resume'))
                    
                    nb_emprunts = int(row.get('nb_emprunts_total', 0)) if pd.notna(row.get('nb_emprunts_total')) else 0
                    nb_emprunteurs = int(row.get('nb_emprunteurs_uniq', 0)) if pd.notna(row.get('nb_emprunteurs_uniq')) else 0
                    duree_moy = float(row.get('duree_moy_emprunt', 0)) if pd.notna(row.get('duree_moy_emprunt')) else 0.0
                    score_moy = float(row.get('score_lecture_moy', 0)) if pd.notna(row.get('score_lecture_moy')) else 0.0
                    score_max = float(row.get('score_lecture_max', 0)) if pd.notna(row.get('score_lecture_max')) else 0.0
                    pop_log = float(row.get('Popularite_log', 0)) if pd.notna(row.get('Popularite_log')) else 0.0
                    
                    genre = infer_genre_from_section(section)
                    sous_genre = infer_sous_genre(section, titre)
                    categorie_age = infer_categorie_age(section, resume)
                    langue = detect_language(section, titre)
                    couverture_url = resolve_cover_url(code_barres, genre, index)
                    
                    book = Book(
                        id=book_id,
                        titre=titre,
                        auteur=auteur,
                        genre=genre,
                        sous_genre=sous_genre,
                        annee=annee,
                        nb_pages=None,
                        langue=langue,
                        categorie_age=categorie_age,
                        note_moyenne=0.0,
                        nb_notes=0,
                        exemplaires=1,
                        cote=cote,
                        section=section,
                        localisation=section,
                        codes_barres=book_id,
                        resume=resume,
                        description=description,
                        couverture_url=couverture_url,
                        mots_cles=None,
                        nb_emprunts=nb_emprunts,
                        popularite=pop_log,
                        nb_emprunteurs_uniq=nb_emprunteurs,
                        duree_emprunt_moy=duree_moy,
                        score_lecture_moy=score_moy,
                        score_lecture_max=score_max,
                        popularite_log=pop_log,
                    )
                    books_to_create.append(book)
                    existing_ids.add(book_id)
                    
                except Exception as e:
                    self.stdout.write(f"[WARNING] Ligne {index + 2}: {str(e)}")
                    stats['errors'] += 1
            
            if books_to_create:
                self.stdout.write(f"[INFO] Insertion de {len(books_to_create)} livres dans la base...")
                
                with transaction.atomic():
                    for i in range(0, len(books_to_create), batch_size):
                        batch = books_to_create[i:i+batch_size]
                        created_count = Book.objects.bulk_create(batch, ignore_conflicts=True)
                        stats['created'] += len(created_count)
                        self.stdout.write(f"   Lot {i//batch_size + 1}/{(len(books_to_create)-1)//batch_size + 1}: {len(created_count)} livres inseres")
            
            self.stdout.write(
                f"\n==================================================\n"
                f"[SUCCESS] IMPORT TERMINE AVEC SUCCES SUR SUPABASE\n"
                f"==================================================\n"
                f"Livres meublis / crees : {stats['created']}\n"
                f"Doublons meublis / meubles ignores : {stats['duplicates']}\n"
                f"Erreurs : {stats['errors']}\n"
                f"Total traite : {len(df)} lignes\n"
                f"=================================================="
            )
            
        except FileNotFoundError:
            self.stdout.write(f"[ERROR] Fichier introuvable : {excel_path}")
        except Exception as e:
            self.stdout.write(f"[ERROR] Exception : {str(e)}")