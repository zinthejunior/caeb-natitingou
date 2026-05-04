import sqlite3
import json
import os
from datetime import datetime
import uuid

# Configuration
DB_PATH = 'data.db'
JSON_DIR = os.path.join('dataset', 'data')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("--- Début de la migration des données ---")

    # 1. Migration des Livres (livres -> api_book)
    print("Migration des livres...")
    cursor.execute("DELETE FROM api_book")
    cursor.execute("SELECT * FROM livres")
    legacy_books = cursor.fetchall()
    for row in legacy_books:
        # Mapping des colonnes
        # legacy: id, ol_id, titre, auteur, genre, sous_genre, annee, nb_pages, langue, categorie_age, note_moyenne, nb_notes, disponible, resume, couverture_url
        # api_book: id, ol_id, titre, auteur, genre, sous_genre, annee, nb_pages, langue, categorie_age, note_moyenne, nb_notes, disponible, resume, couverture_url, created_at
        cursor.execute("""
            INSERT INTO api_book (id, ol_id, titre, auteur, genre, sous_genre, annee, nb_pages, langue, categorie_age, note_moyenne, nb_notes, disponible, resume, couverture_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['ol_id'], row['titre'], row['auteur'], row['genre'], row['sous_genre'],
            row['annee'], row['nb_pages'], row['langue'], row['categorie_age'],
            row['note_moyenne'], row['nb_notes'], row['disponible'], row['resume'], row['couverture_url'],
            datetime.now().isoformat()
        ))
    print(f"-> {len(legacy_books)} livres migrés.")

    # 2. Migration des Utilisateurs (users -> api_user)
    # Note: Django User nécessite plus de champs (password, is_staff, etc.)
    print("Migration des utilisateurs...")
    cursor.execute("DELETE FROM api_user")
    cursor.execute("SELECT * FROM users")
    legacy_users = cursor.fetchall()
    
    # Mot de passe par défaut : 'pbkdf2_sha256$870000$...' pour 'password123' ou simplement laisser vide/générer
    # On va mettre un mot de passe bidon pour le moment car ils devront probablement être réinitialisés
    dummy_password = "pbkdf2_sha256$870000$dummy$S6f5X9..." 

    for row in legacy_users:
        # api_user: password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, id, type_compte, date_naissance, niveau_etude, classe, date_inscription, favorites, intentions
        username = row['email'].split('@')[0] if row['email'] else f"user_{row['id']}"
        cursor.execute("""
            INSERT INTO api_user (id, username, email, first_name, last_name, type_compte, date_naissance, niveau_etude, classe, date_inscription, password, is_superuser, is_staff, is_active, date_joined, favorites, intentions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, '[]', '[]')
        """, (
            row['id'], username, row['email'], row['nom'], "", row['type_compte'],
            row['date_naissance'], row['niveau_etude'], row['classe'], row['date_inscription'],
            dummy_password, datetime.now().isoformat()
        ))
    print(f"-> {len(legacy_users)} utilisateurs migrés.")

    # 3. Migration des Emprunts (emprunts -> api_borrow)
    print("Migration des emprunts...")
    cursor.execute("DELETE FROM api_borrow")
    cursor.execute("SELECT * FROM emprunts")
    legacy_borrows = cursor.fetchall()
    for row in legacy_borrows:
        cursor.execute("""
            INSERT INTO api_borrow (id, user_id, livre_id, date_emprunt, date_prevue, date_retour, renouvele, statut)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['user_id'], row['livre_id'], row['date_emprunt'], row['date_prevue'],
            row['date_retour'], row['renouvele'], row['statut']
        ))
    print(f"-> {len(legacy_borrows)} emprunts migrés.")

    # 4. Import des Clubs (JSON -> api_readingclub)
    print("Import des clubs (JSON)...")
    cursor.execute("DELETE FROM api_readingclub")
    clubs_file = os.path.join(JSON_DIR, 'clubs.json')
    if os.path.exists(clubs_file):
        with open(clubs_file, 'r', encoding='utf-8') as f:
            clubs = json.load(f)
            for c in clubs:
                manager = c.get('manager', {})
                cursor.execute("""
                    INSERT INTO api_readingclub (id, name, description, image, target_audience, member_count, manager_name, manager_role, manager_email)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    c['id'], c['name'], c['description'], c['image'], c['targetAudience'],
                    c['memberCount'], manager.get('name'), manager.get('role'), manager.get('email')
                ))
            print(f"-> {len(clubs)} clubs importés.")

    # 5. Import des Événements (JSON -> api_event)
    print("Import des événements (JSON)...")
    cursor.execute("DELETE FROM api_event")
    events_file = os.path.join(JSON_DIR, 'events.json')
    if os.path.exists(events_file):
        with open(events_file, 'r', encoding='utf-8') as f:
            events = json.load(f)
            for e in events:
                cursor.execute("""
                    INSERT INTO api_event (id, title, description, type_event, date, time, location, participant_count, club_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    e['id'], e['title'], e['description'], e['type'], e['date'], e['time'],
                    e['location'], e['participantCount'], e.get('clubId')
                ))
            print(f"-> {len(events)} événements importés.")

    # 6. Import des News (JSON -> api_news)
    print("Import des actualités (JSON)...")
    cursor.execute("DELETE FROM api_news")
    news_file = os.path.join(JSON_DIR, 'news.json')
    if os.path.exists(news_file):
        with open(news_file, 'r', encoding='utf-8') as f:
            news = json.load(f)
            for n in news:
                cursor.execute("""
                    INSERT INTO api_news (id, title, excerpt, content, image, date, category, featured)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    n['id'], n['title'], n['excerpt'], n['content'], n['image'], n['date'][:10],
                    n['category'], n['featured']
                ))
            print(f"-> {len(news)} actualités importées.")

    # 7. Migration des Interactions (interactions -> api_interaction)
    print("Migration des interactions...")
    cursor.execute("DELETE FROM api_interaction")
    cursor.execute("SELECT * FROM interactions")
    legacy_ints = cursor.fetchall()
    for row in legacy_ints:
        cursor.execute("""
            INSERT INTO api_interaction (id, user_id, livre_id, type_action, notation, duree_secondes, livre_lu, commentaire, position, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['user_id'], row['livre_id'], row['type_action'], row['notation'],
            row['duree_secondes'], row['livre_lu'], row['commentaire'], row['position'], row['source'],
            row['created_at']
        ))
    print(f"-> {len(legacy_ints)} interactions migrées.")

    # 8. Migration des Sessions IA (sessions_ia -> api_sessionia)
    print("Migration des sessions IA...")
    cursor.execute("DELETE FROM api_sessionia")
    cursor.execute("SELECT * FROM sessions_ia")
    legacy_sessions = cursor.fetchall()
    for row in legacy_sessions:
        cursor.execute("""
            INSERT INTO api_sessionia (id, user_id, humeur_detectee, vecteur_intention, livres_rejetes, livres_acceptes, debut, fin, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['user_id'], row['humeur_detectee'], row['vecteur_intention'],
            row['livres_rejetes'], row['livres_acceptes'], row['debut'], row['fin'], row['active']
        ))
    print(f"-> {len(legacy_sessions)} sessions IA migrées.")

    # 9. Migration des Notifications (notifications -> api_notification)
    print("Migration des notifications...")
    cursor.execute("DELETE FROM api_notification")
    cursor.execute("SELECT * FROM notifications")
    legacy_notifs = cursor.fetchall()
    for row in legacy_notifs:
        cursor.execute("""
            INSERT INTO api_notification (id, user_id, emprunt_id, livre_id, type_notif, message, envoyee_le, lue)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            row['id'], row['user_id'], row['emprunt_id'], row['livre_id'], row['type_notif'],
            row['message'], row['envoyee_le'], row['lue']
        ))
    print(f"-> {len(legacy_notifs)} notifications migrées.")

    conn.commit()
    conn.close()
    print("--- Migration terminée avec succès ---")

if __name__ == "__main__":
    migrate()
