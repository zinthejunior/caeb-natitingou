"""
Commande Django pour importer les utilisateurs et les emprunts réels sur Supabase
Usage : python manage.py import_users_and_borrows
"""

import os
import re
import pandas as pd
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.timezone import now
from api.models import User, Book, Borrow


def clean_str(val):
    if pd.isna(val) or not val:
        return ""
    return str(val).strip()


class Command(BaseCommand):
    help = 'Importe les profils utilisateurs et les emprunts réels dans Supabase'

    def handle(self, *args, **options):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        users_excel = os.path.join(base_dir, 'Data', 'features_utilisateurs.xlsx')
        borrow_excel = os.path.join(base_dir, 'Data', 'borrow.xlsx')

        self.stdout.write("[INFO] Démarrage de l'importation des utilisateurs et des emprunts...")

        # ── 1. IMPORTATION DES UTILISATEURS ──
        if os.path.exists(users_excel):
            self.stdout.write(f"[INFO] Lecture des utilisateurs : {users_excel}")
            df_users = pd.read_excel(users_excel, engine='openpyxl')
            self.stdout.write(f"[OK] {len(df_users)} profils utilisateurs trouvés.")

            created_users = 0
            updated_users = 0

            with transaction.atomic():
                for idx, row in df_users.iterrows():
                    raw_id = clean_str(row.get('user_id'))
                    if not raw_id:
                        continue
                    
                    user_id = raw_id[:40]
                    username = f"membre_{user_id[:8]}"
                    email = f"{username}@caeb-natitingou.org"
                    
                    sec_princ = clean_str(row.get('section_principale'))
                    
                    user_obj, created = User.objects.get_or_create(
                        id=user_id,
                        defaults={
                            'username': username,
                            'email': email,
                            'first_name': 'Membre',
                            'last_name': f"CAEB {user_id[:4].upper()}",
                            'type_compte': 'membre',
                            'demande_adhesion': False,
                        }
                    )
                    
                    if created:
                        user_obj.set_unusable_password()
                        user_obj.save()
                        created_users += 1
                    else:
                        updated_users += 1

            self.stdout.write(f"[SUCCESS] Utilisateurs : {created_users} créés, {updated_users} mis à jour.")
        else:
            self.stdout.write(f"[WARNING] Fichier introuvable : {users_excel}")

        # ── 2. IMPORTATION DES EMPRUNTS ──
        if os.path.exists(borrow_excel):
            self.stdout.write(f"[INFO] Lecture de l'historique d'emprunts : {borrow_excel}")
            df_borrow = pd.read_excel(borrow_excel, engine='openpyxl')
            self.stdout.write(f"[OK] {len(df_borrow)} lignes d'emprunt chargées.")

            created_borrows = 0
            skipped_borrows = 0
            existing_user_ids = set(User.objects.values_list('id', flat=True))
            existing_book_ids = set(Book.objects.values_list('id', flat=True))

            borrows_to_create = []

            for idx, row in df_borrow.iterrows():
                try:
                    raw_book_id = row.get('Code_barres')
                    raw_user_id = clean_str(row.get('user_id'))
                    
                    if pd.isna(raw_book_id) or not raw_user_id:
                        skipped_borrows += 1
                        continue

                    book_id = str(int(raw_book_id))
                    user_id = raw_user_id[:40]

                    if book_id not in existing_book_ids or user_id not in existing_user_ids:
                        skipped_borrows += 1
                        continue

                    sortie_val = row.get('Sortie')
                    retour_val = row.get('Retour')

                    if pd.notna(sortie_val):
                        date_sortie = pd.to_datetime(sortie_val).date()
                    else:
                        date_sortie = (now() - timedelta(days=30)).date()

                    if pd.notna(retour_val):
                        date_retour_effective = pd.to_datetime(retour_val).date()
                        statut = 'rendu'
                    else:
                        date_retour_effective = None
                        statut = 'en_cours'

                    date_retour_prevue = date_sortie + timedelta(days=14)
                    borrow_id = f"emp-{idx+1:05d}"

                    if Borrow.objects.filter(id=borrow_id).exists():
                        skipped_borrows += 1
                        continue

                    b_obj = Borrow(
                        id=borrow_id,
                        user_id=user_id,
                        livre_id=book_id,
                        date_sortie=date_sortie,
                        date_retour_prevue=date_retour_prevue,
                        date_retour_effective=date_retour_effective,
                        renouvele=False,
                        statut=statut,
                    )
                    borrows_to_create.append(b_obj)

                except Exception as e:
                    skipped_borrows += 1

            if borrows_to_create:
                self.stdout.write(f"[INFO] Insertion de {len(borrows_to_create)} emprunts réels sur Supabase...")
                batch_size = 500
                with transaction.atomic():
                    for i in range(0, len(borrows_to_create), batch_size):
                        batch = borrows_to_create[i:i+batch_size]
                        created = Borrow.objects.bulk_create(batch, ignore_conflicts=True)
                        created_borrows += len(created)

            self.stdout.write(
                f"\n==================================================\n"
                f"[SUCCESS] EMPRUNTS RÉELS IMPORTS SUR SUPABASE\n"
                f"==================================================\n"
                f"Emprunts créés : {created_borrows}\n"
                f"Emprunts ignorés / doublons : {skipped_borrows}\n"
                f"Total prêts traités : {len(df_borrow)}\n"
                f"=================================================="
            )
        else:
            self.stdout.write(f"[WARNING] Fichier introuvable : {borrow_excel}")
