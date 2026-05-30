import os
import sys
import django
import random
from datetime import date, timedelta

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models import Book, Interaction

User = get_user_model()

def run():
    print("Démarrage de la génération des données de test...")
    
    # 1. Récupération des données de base
    genres_disponibles = list(Book.objects.exclude(genre__isnull=True).exclude(genre='').values_list('genre', flat=True).distinct())
    if not genres_disponibles:
        print("Erreur: Aucun livre avec un genre n'a été trouvé.")
        return
        
    niveaux_etude = ['primaire', 'college', 'lycee', 'licence', 'master', 'doctorat']
    
    print(f"Trouvé {len(genres_disponibles)} genres et {len(niveaux_etude)} niveaux d'étude.")
    
    # 2. Nettoyage des anciens utilisateurs de test (optionnel mais recommandé pour la propreté)
    anciens_tests = User.objects.filter(username__startswith="test_user_")
    nb_anciens = anciens_tests.count()
    if nb_anciens > 0:
        anciens_tests.delete()
        print(f"Suppression de {nb_anciens} anciens utilisateurs de test.")
        
    # 3. Génération des utilisateurs (croisement Genre x Niveau)
    users_crees = []
    
    # Pour ne pas exploser la base si on a beaucoup de genres, on prend un échantillon représentatif de genres
    # S'il y a plus de 10 genres, on en prend 10 au hasard
    genres_echantillon = random.sample(genres_disponibles, min(10, len(genres_disponibles)))
    
    cpt = 1
    for niveau in niveaux_etude:
        for genre in genres_echantillon:
            # Calcul d'une date de naissance cohérente avec le niveau
            today = date.today()
            if niveau == 'primaire': age = random.randint(6, 10)
            elif niveau == 'college': age = random.randint(11, 14)
            elif niveau == 'lycee': age = random.randint(15, 17)
            elif niveau == 'licence': age = random.randint(18, 21)
            else: age = random.randint(22, 40)
            
            dob = today.replace(year=today.year - age)
            
            username = f"test_user_{cpt}"
            
            user = User.objects.create_user(
                username=username,
                email=f"{username}@test.com",
                password="password123",
                first_name="Test",
                last_name=f"{niveau.capitalize()} {genre.capitalize()[:10]}",
                niveau_etude=niveau,
                date_naissance=dob,
                genres_preferes=[genre],
                date_inscription=today

            )
            users_crees.append({
                'user': user,
                'niveau': niveau,
                'genre': genre
            })
            cpt += 1
            
    print(f"{len(users_crees)} utilisateurs de test créés avec succès !")
    
    # 4. Génération des interactions
    print("Génération des interactions pour les utilisateurs de test...")
    interactions_creees = 0
    
    # Préchauffage des livres par genre pour optimiser
    livres_par_genre = {}
    for genre in genres_echantillon:
        livres = list(Book.objects.filter(genre=genre)[:20]) # 20 max par genre
        if livres:
            livres_par_genre[genre] = livres
            
    # Livre populaire (pour introduire un biais naturel)
    livres_populaires = list(Book.objects.all().order_by('-exemplaires')[:5])
            
    for u_data in users_crees:
        user = u_data['user']
        genre_pref = u_data['genre']
        
        # Scénario 1 : Nouveaux utilisateurs purs (Cold start strict)
        # On laisse 20% des utilisateurs sans aucune interaction
        if random.random() < 0.2:
            continue
            
        # Scénario 2 : Utilisateurs avec historique cohérent
        # L'utilisateur interagit principalement avec son genre préféré
        nb_interactions = random.randint(2, 8)
        
        livres_possibles = livres_par_genre.get(genre_pref, [])
        if not livres_possibles:
            livres_possibles = livres_populaires
            
        # Sélection aléatoire de livres
        livres_selectionnes = random.sample(livres_possibles, min(nb_interactions, len(livres_possibles)))
        
        import uuid
        for livre in livres_selectionnes:
            # Type d'action (plus de vues et de marquages lus que d'avis)
            action = random.choices(
                ['vue', 'like', 'marquage', 'avis'],
                weights=[0.5, 0.2, 0.2, 0.1],
                k=1
            )[0]
            
            Interaction.objects.create(
                id=uuid.uuid4().hex[:20],
                user=user,
                livre=livre,
                type_action=action,
                livre_lu=(action == 'marquage'),
                source='test_script'
            )
            interactions_creees += 1
            
        # On ajoute parfois 1 interaction sur un livre populaire (bruit)
        if random.random() < 0.3 and livres_populaires:
            Interaction.objects.create(
                id=uuid.uuid4().hex[:20],
                user=user,
                livre=random.choice(livres_populaires),
                type_action='vue',
                livre_lu=False,
                source='test_script'
            )
            interactions_creees += 1

    print(f"{interactions_creees} interactions de test générées avec succès !")
    print("Terminé ! Vous pouvez vous connecter avec 'test_user_X' / 'password123'")

if __name__ == '__main__':
    run()
