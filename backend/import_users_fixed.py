#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script d'import des utilisateurs depuis Excel - Version corrigée
Exécution : python import_users_fixed.py
"""

import os
import sys

# Configuration Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth.hashers import make_password
from api.models import User

# Utiliser calamine au lieu de pandas pour éviter les problèmes d'encodage
try:
    from calamine import load_workbook
    print("📖 Lecture avec calamine...")
    wb = load_workbook('Data/features_utilisateurs.xlsx')
    sheet = wb['Sheet1']
    
    # Lire les en-têtes
    headers = [str(cell.value) for cell in sheet[0]]
    user_id_col = headers.index('user_id')
    
    created = 0
    skipped = 0
    
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if row[user_id_col]:
            user_id = str(row[user_id_col]).strip()
            
            if not User.objects.filter(id=user_id).exists():
                try:
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
                    print(f"   ⚠️ Erreur: {str(e)[:50]}")
                    skipped += 1
            else:
                skipped += 1
    
    print(f"\n✅ {created} utilisateurs importés, {skipped} ignorés")
    
except ImportError:
    print("❌ Installez python-calamine: pip install python-calamine")