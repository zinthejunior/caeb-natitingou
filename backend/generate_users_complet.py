#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script de génération COMPLÈTE des utilisateurs de test — CAEB Bibliothèque
==========================================================================
Couverture maximale : GENRE (M/F) × NIVEAU D'ÉTUDE (6) × PROFIL COMPORTEMENTAL (3)
soit 6 x 2 x 3 = 36 archétypes de base, avec plusieurs utilisateurs par archétype
pour garantir de la variance dans les recommandations IA.

Exécution :
    cd backend
    python generate_users_complet.py [--reset]

Options :
    --reset  Supprime TOUS les utilisateurs test_ avant de recréer
"""

import os
import sys
import django
import random
import argparse
from datetime import date, timedelta

# ── Configuration Django ──────────────────────────────────────────────────────
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Book, Interaction, Borrow, Review
import uuid

User = get_user_model()

# ═══════════════════════════════════════════════════════════════════════════════
# DONNÉES DE RÉFÉRENCE
# ═══════════════════════════════════════════════════════════════════════════════

# Niveaux d'étude avec leurs métadonnées (âge min, âge max, classe possible)
NIVEAUX = {
    'Primaire': {
        'age_min': 6, 'age_max': 11,
        'classes': ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
        'cat_age': 'enfant',
        'intentions': ['apprendre', 'decouvrir', 's_amuser'],
        'genres_preferes_pool': ['Conte', 'Album jeunesse', 'Documentaire jeunesse', 'Bande dessinée', 'Fable'],
    },
    'Collège': {
        'age_min': 11, 'age_max': 15,
        'classes': ['6ème', '5ème', '4ème', '3ème'],
        'cat_age': 'ado',
        'intentions': ['apprendre', 'se_divertir', 'preparer_examen', 'decouvrir'],
        'genres_preferes_pool': ['Roman', 'Bande dessinée', 'Manga', 'Aventure', 'Fantastique', 'Science-fiction'],
    },
    'Lycée': {
        'age_min': 15, 'age_max': 18,
        'classes': ['Seconde', 'Première', 'Terminale'],
        'cat_age': 'ado',
        'intentions': ['preparer_examen', 'apprendre', 'se_divertir', 'culture_generale'],
        'genres_preferes_pool': ['Roman', 'Philosophie', 'Histoire', 'Science-fiction', 'Policier', 'Poésie'],
    },
    'Licence': {
        'age_min': 18, 'age_max': 22,
        'classes': ['Licence 1', 'Licence 2', 'Licence 3'],
        'cat_age': 'adulte',
        'intentions': ['approfondir', 'recherche', 'culture_generale', 'preparer_concours'],
        'genres_preferes_pool': ['Essai', 'Roman', 'Sciences', 'Droit', 'Économie', 'Philosophie', 'Histoire'],
    },
    'Master': {
        'age_min': 22, 'age_max': 28,
        'classes': ['Master 1', 'Master 2'],
        'cat_age': 'adulte',
        'intentions': ['recherche', 'approfondir', 'preparer_concours', 'ecrire'],
        'genres_preferes_pool': ['Essai', 'Sciences', 'Droit', 'Économie', 'Sociologie', 'Littérature contemporaine'],
    },
    'Doctorat': {
        'age_min': 26, 'age_max': 45,
        'classes': ['Doctorat'],
        'cat_age': 'adulte',
        'intentions': ['recherche', 'ecrire', 'approfondir'],
        'genres_preferes_pool': ['Essai', 'Sciences', 'Philosophie', 'Sociologie', 'Littérature classique', 'Biographie'],
    },
}

# Genres biologiques avec prénoms et noms béninois associés
GENRES_BIOLOGIQUES = {
    'M': {
        'label': 'Masculin',
        'prenoms': [
            'Kossi', 'Koffi', 'Adjovi', 'Mensah', 'Togbe', 'Senu', 'Edem', 'Kwame',
            'Brice', 'Franck', 'Jean-Pierre', 'Rodrigue', 'Marius', 'Arnaud', 'Didier',
            'Serge', 'Patrick', 'Thierry', 'Emmanuel', 'Cédric', 'Yves', 'Wilfried',
            'Achille', 'Florentin', 'Gildas', 'Herve', 'Innocent', 'Josué', 'Kevin',
        ],
        'noms': [
            'Agbodjan', 'Amegbor', 'Atchou', 'Dossou', 'Gbedevi', 'Houngbedji',
            'Kpade', 'Mensah', 'Segla', 'Toviho', 'Yehouessi', 'Zinzindohoue',
            'Ahouansou', 'Bocco', 'Codjo', 'Degla', 'Edou', 'Fagla', 'Guedenon',
        ],
    },
    'F': {
        'label': 'Féminin',
        'prenoms': [
            'Afia', 'Akossiwa', 'Ama', 'Efua', 'Ewoenam', 'Kafui', 'Sena', 'Yawa',
            'Abigaël', 'Blandine', 'Christelle', 'Dorcas', 'Estelle', 'Fabiola',
            'Grâce', 'Honorine', 'Isabelle', 'Joëlle', 'Karelle', 'Laura',
            'Mariette', 'Nadège', 'Olivia', 'Prudence', 'Rachelle', 'Sandra',
            'Thérèse', 'Ulricke', 'Vanessa', 'Wendy', 'Yvette', 'Zoé',
        ],
        'noms': [
            'Ahoyo', 'Boco', 'Chikou', 'Degbevi', 'Eklou', 'Favi', 'Gbedje',
            'Hounsa', 'Issa', 'Jossou', 'Koudjo', 'Lafia', 'Metonou', 'Noudewa',
            'Ogouma', 'Padonou', 'Quenum', 'Roti', 'Sossa', 'Tagba', 'Ufon',
        ],
    },
}

# Profils comportementaux (archétypes de lecteurs)
PROFILS = {
    'avide': {
        'nb_interactions': (8, 15),   # Lecteur très actif
        'pct_cold_start': 0.0,         # Ne laisse jamais le cold start
        'diversite_genre': 'faible',   # Reste dans ses genres
        'actions_weights': [0.3, 0.25, 0.25, 0.2],  # vue, like, marquage, avis
        'description': 'Lecteur avide — interagit beaucoup, avis réguliers',
    },
    'curieux': {
        'nb_interactions': (4, 8),
        'pct_cold_start': 0.1,
        'diversite_genre': 'haute',    # Explore tous les genres
        'actions_weights': [0.5, 0.2, 0.2, 0.1],
        'description': 'Lecteur curieux — explore des genres variés',
    },
    'occasionnel': {
        'nb_interactions': (1, 4),
        'pct_cold_start': 0.25,
        'diversite_genre': 'moyenne',
        'actions_weights': [0.6, 0.15, 0.15, 0.1],
        'description': 'Lecteur occasionnel — peu d\'interactions',
    },
}

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS UTILITAIRES
# ═══════════════════════════════════════════════════════════════════════════════

def calculer_date_naissance(age: int) -> date:
    today = date.today()
    try:
        dob = today.replace(year=today.year - age)
    except ValueError:
        dob = today.replace(year=today.year - age, day=28)
    return dob


def generer_email(prenom: str, nom: str, cpt: int) -> str:
    prenom_clean = prenom.lower().replace(' ', '').replace('-', '').replace("'", '')
    nom_clean = nom.lower().replace(' ', '').replace('-', '').replace("'", '')
    return f"test.{prenom_clean}.{nom_clean}{cpt}@caeb-test.bj"


def generer_username(prenom: str, nom: str, cpt: int) -> str:
    prenom_clean = prenom.lower().replace(' ', '_').replace('-', '_').replace("'", '')[:10]
    nom_clean = nom.lower().replace(' ', '_').replace('-', '_').replace("'", '')[:8]
    return f"test_{prenom_clean}_{nom_clean}_{cpt}"


def choisir_genres_preferes(niveau_data: dict, diversite: str, livres_par_genre: dict) -> list:
    """Sélectionne des genres préférés en fonction du profil et des genres disponibles en DB."""
    pool = [g for g in niveau_data['genres_preferes_pool'] if g in livres_par_genre]
    if not pool:
        pool = list(livres_par_genre.keys())[:5]

    if diversite == 'faible':
        nb = random.randint(1, 2)
    elif diversite == 'haute':
        nb = random.randint(3, 5)
    else:
        nb = random.randint(2, 3)

    return random.sample(pool, min(nb, len(pool)))


# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def run(reset: bool = False):
    print("=" * 65)
    print("  [CAEB] Generation COMPLETE des utilisateurs de test")
    print("=" * 65)

    # ── 1. Chargement des livres disponibles ──────────────────────────────────
    tous_les_livres = list(Book.objects.all())
    if not tous_les_livres:
        print("❌ Erreur : Aucun livre dans la base. Importez d'abord les livres.")
        return

    genres_db = list(
        Book.objects.exclude(genre__isnull=True).exclude(genre='')
        .values_list('genre', flat=True).distinct()
    )
    print(f"\n[LIVRES] {len(tous_les_livres)} livres trouves | {len(genres_db)} genres distincts")

    livres_par_genre = {}
    for g in genres_db:
        livres_par_genre[g] = list(Book.objects.filter(genre=g))

    livres_populaires = list(Book.objects.order_by('-exemplaires')[:10])

    # ── 2. Nettoyage optionnel ────────────────────────────────────────────────
    anciens = User.objects.filter(username__startswith='test_')
    nb_anciens = anciens.count()
    if reset and nb_anciens > 0:
        anciens.delete()
        print(f"[RESET] {nb_anciens} anciens utilisateurs test supprimes.\n")
    elif nb_anciens > 0:
        print(f"[INFO] {nb_anciens} utilisateurs test deja existants (utilisez --reset pour les supprimer).\n")

    # ── 3. Génération des utilisateurs ───────────────────────────────────────
    # Croisement : NIVEAU × GENRE_BIOLOGIQUE × PROFIL = 6 × 2 × 3 = 36 combinaisons
    # On génère 2 utilisateurs par combinaison → 72 utilisateurs au total

    USERS_PAR_COMBINAISON = 2  # Augmenter si besoin de plus de variance
    users_crees = []
    cpt = 1
    erreurs = 0

    print(f"\n{'Niveau':<12} {'Genre':<10} {'Profil':<14} {'Statut'}")
    print("-" * 55)

    for niveau_label, niveau_data in NIVEAUX.items():
        for genre_code, genre_data in GENRES_BIOLOGIQUES.items():
            for profil_label, profil_data in PROFILS.items():
                for _ in range(USERS_PAR_COMBINAISON):
                    try:
                        prenom = random.choice(genre_data['prenoms'])
                        nom = random.choice(genre_data['noms'])
                        age = random.randint(niveau_data['age_min'], niveau_data['age_max'])
                        dob = calculer_date_naissance(age)
                        classe = random.choice(niveau_data['classes'])
                        intentions = random.sample(
                            niveau_data['intentions'],
                            k=min(2, len(niveau_data['intentions']))
                        )
                        genres_preferes = choisir_genres_preferes(
                            niveau_data, profil_data['diversite_genre'], livres_par_genre
                        )

                        username = generer_username(prenom, nom, cpt)
                        email = generer_email(prenom, nom, cpt)

                        # Vérification d'unicité du username
                        if User.objects.filter(username=username).exists():
                            username = f"{username}_{uuid.uuid4().hex[:4]}"

                        user = User.objects.create_user(
                            username=username,
                            email=email,
                            password='caeb2024!',
                            first_name=prenom,
                            last_name=nom,
                            niveau_etude=niveau_label,
                            classe=classe,
                            date_naissance=dob,
                            genres_preferes=genres_preferes,
                            intentions=intentions,
                            type_compte='membre',
                            demande_adhesion=True,
                            bio=f"[TEST] {profil_data['description']} — {genre_data['label']}, {niveau_label}",
                            pseudo=f"{prenom.lower()}{random.randint(10,99)}",
                        )

                        users_crees.append({
                            'user': user,
                            'niveau': niveau_label,
                            'niveau_data': niveau_data,
                            'genre_bio': genre_code,
                            'profil': profil_label,
                            'profil_data': profil_data,
                            'genres_preferes': genres_preferes,
                        })

                        print(f"  {niveau_label:<12} {genre_data['label']:<10} {profil_label:<14} OK {username}")
                        cpt += 1

                    except Exception as e:
                        erreurs += 1
                        print(f"  {niveau_label:<12} {genre_data['label']:<10} {profil_label:<14} ERR {str(e)[:40]}")

    print(f"\n[OK] {len(users_crees)} utilisateurs crees | [ERR] {erreurs} erreurs\n")

    # ── 4. Génération des interactions ───────────────────────────────────────
    print("[...] Generation des interactions...")
    print("-" * 55)

    interactions_creees = 0

    for u_data in users_crees:
        user = u_data['user']
        profil_data = u_data['profil_data']
        genres_pref = u_data['genres_preferes']

        # Cold start : certains utilisateurs n'ont aucune interaction
        if random.random() < profil_data['pct_cold_start']:
            print(f"  [{user.username}] SKIP cold start")
            continue

        # Nombre d'interactions selon le profil
        nb_min, nb_max = profil_data['nb_interactions']
        nb_interactions = random.randint(nb_min, nb_max)

        # Collecte des livres possibles
        livres_possibles = []
        for g in genres_pref:
            livres_possibles.extend(livres_par_genre.get(g, []))

        # En haute diversité, on ajoute des livres hors genres préférés
        if profil_data['diversite_genre'] == 'haute' and livres_par_genre:
            genres_autres = [g for g in livres_par_genre if g not in genres_pref]
            for g in random.sample(genres_autres, min(3, len(genres_autres))):
                livres_possibles.extend(random.sample(livres_par_genre[g], min(3, len(livres_par_genre[g]))))

        if not livres_possibles:
            livres_possibles = tous_les_livres

        # Déduplication et limitation
        livres_possibles = list({l.id: l for l in livres_possibles}.values())
        livres_selectionnes = random.sample(livres_possibles, min(nb_interactions, len(livres_possibles)))

        for livre in livres_selectionnes:
            action = random.choices(
                ['vue', 'like', 'marquage', 'avis'],
                weights=profil_data['actions_weights'],
                k=1
            )[0]
            try:
                Interaction.objects.create(
                    id=uuid.uuid4().hex[:40],
                    user=user,
                    livre=livre,
                    type_action=action,
                    livre_lu=(action == 'marquage'),
                    notation=random.randint(3, 5) if action == 'avis' else None,
                    source='test_script',
                )
                interactions_creees += 1
            except Exception:
                pass

        # Bruit naturel : interaction sur un livre populaire
        if random.random() < 0.35 and livres_populaires:
            try:
                Interaction.objects.create(
                    id=uuid.uuid4().hex[:40],
                    user=user,
                    livre=random.choice(livres_populaires),
                    type_action='vue',
                    livre_lu=False,
                    source='test_script',
                )
                interactions_creees += 1
            except Exception:
                pass

    print(f"\n[OK] {interactions_creees} interactions generees.\n")

    # ── 5. Résumé final ───────────────────────────────────────────────────────
    print("=" * 65)
    print("  RESUME DE LA GENERATION")
    print("=" * 65)
    print(f"\n  Utilisateurs crees  : {len(users_crees)}")
    print(f"  Interactions crees  : {interactions_creees}")
    print(f"\n  Croisements couverts :")
    print(f"    - Niveaux d'etude    : {len(NIVEAUX)} ({', '.join(NIVEAUX.keys())})")
    print(f"    - Genres biologiques : {len(GENRES_BIOLOGIQUES)} (Masculin, Feminin)")
    print(f"    - Profils lecteurs   : {len(PROFILS)} (avide, curieux, occasionnel)")
    print(f"    - Total combinaisons : {len(NIVEAUX) * len(GENRES_BIOLOGIQUES) * len(PROFILS)}")
    print(f"\n  Mot de passe : caeb2024!")
    print(f"  Emails       : test.prenom.nomN@caeb-test.bj")
    print(f"  Filtre admin : username commence par 'test_'")
    print("\n" + "=" * 65)
    print("  Generation terminee avec succes !")
    print("=" * 65 + "\n")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Génère les utilisateurs de test CAEB')
    parser.add_argument(
        '--reset',
        action='store_true',
        help='Supprime tous les utilisateurs test_ avant de recréer'
    )
    args = parser.parse_args()
    run(reset=args.reset)
