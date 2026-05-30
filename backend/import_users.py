#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script d'import des utilisateurs depuis Excel
Exécution : python import_users.py --file Data/features_utilisateurs.xlsx
"""

import os
import sys
import pandas as pd

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password
from api.models import User
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Importe les utilisateurs depuis Excel'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, required=True)

    def handle(self, *args, **options):
        excel_path = options['file']
        
        self.stdout.write(f"📖 Lecture du fichier : {excel_path}")
        
        # Forcer l'encodage avec engine='openpyxl'
        df = pd.read_excel(excel_path, sheet_name='Sheet1', engine='openpyxl')
        self.stdout.write(f"✅ {len(df)} lignes chargées")
        
        created = 0
        skipped = 0
        
        for index, row in df.iterrows():
            try:
                user_id = str(row['user_id']).strip()
                
                if User.objects.filter(id=user_id).exists():
                    skipped += 1
                    continue
                
                # Extraire la section principale pour le niveau d'étude
                section = row.get('section_principale', '')
                niveau_etude = None
                classe = None
                
                if pd.notna(section):
                    section_str = str(section).upper()
                    if 'SECONDAIRE' in section_str:
                        if '2NDE' in section_str or 'SECONDE' in section_str:
                            niveau_etude = 'Seconde'
                            classe = 'Seconde'
                        elif '1ÈRE' in section_str or 'PREMIÈRE' in section_str:
                            niveau_etude = 'Première'
                            classe = 'Première'
                        elif 'TERMINALE' in section_str:
                            niveau_etude = 'Terminale'
                            classe = 'Terminale'
                        else:
                            niveau_etude = 'Secondaire'
                    elif 'UNIVERSITAIRE' in section_str:
                        niveau_etude = 'Supérieur'
                    elif 'PRIMAIRE' in section_str:
                        niveau_etude = 'Primaire'
                
                User.objects.create(
                    id=user_id,
                    username=f"user_{user_id[:20]}",
                    email=f"{user_id}@membre.caeb.bj",
                    password=make_password('membre123'),
                    type_compte='membre',
                    first_name="",
                    last_name="",
                    niveau_etude=niveau_etude,
                    classe=classe,
                    demande_adhesion=True,
                )
                created += 1
                
                if created % 20 == 0:
                    self.stdout.write(f"   👤 {created} utilisateurs importés...")
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️ Ligne {index + 2}: {str(e)[:50]}"))
                skipped += 1
        
        self.stdout.write(self.style.SUCCESS(f"\n✅ {created} utilisateurs importés, {skipped} ignorés"))


if __name__ == '__main__':
    # Exécution directe
    excel_path = 'Data/features_utilisateurs.xlsx'
    
    print(f"📖 Lecture du fichier : {excel_path}")
    
    if not os.path.exists(excel_path):
        print(f"❌ Fichier introuvable : {excel_path}")
        sys.exit(1)
    
    # Forcer l'encodage avec engine='openpyxl'
    df = pd.read_excel(excel_path, sheet_name='Sheet1', engine='openpyxl')
    print(f"✅ {len(df)} lignes chargées")
    
    created = 0
    skipped = 0
    
    for index, row in df.iterrows():
        try:
            user_id = str(row['user_id']).strip()
            
            if User.objects.filter(id=user_id).exists():
                skipped += 1
                continue
            
            User.objects.create(
                id=user_id,
                username=f"user_{user_id[:20]}",
                email=f"{user_id}@membre.caeb.bj",
                password=make_password('membre123'),
                type_compte='membre',
                first_name="",
                last_name="",
            )
            created += 1
            
            if created % 20 == 0:
                print(f"   👤 {created} utilisateurs importés...")
                
        except Exception as e:
            print(f"   ⚠️ Ligne {index + 2}: {str(e)[:50]}")
            skipped += 1
    
    print(f"\n✅ {created} utilisateurs importés, {skipped} ignorés")