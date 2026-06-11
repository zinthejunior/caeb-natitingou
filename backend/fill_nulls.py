import os
import django
from random import choice

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Book, User

PLACEHOLDER_COVERS = ["/book-1.jpg", "/book-2.jpg", "/book-3.jpg"]
PLACEHOLDER_AUTHORS = ["Auteur inconnu", "Collectif CAEB", "Anonyme"]
PLACEHOLDER_RESUMES = [
    "Résumé temporaire.",
    "Description fournie par le service de peuplement.",
    "Résumé auto-généré pour test."
]

def fill_books():
    updated = 0
    # Cherche les livres qui ont des champs vides ou null
    qs = Book.objects.all()
    for b in qs:
        changed = False
        if not b.couverture_url:
            b.couverture_url = choice(PLACEHOLDER_COVERS)
            changed = True
        if not b.auteur:
            b.auteur = choice(PLACEHOLDER_AUTHORS)
            changed = True
        if not b.resume:
            b.resume = choice(PLACEHOLDER_RESUMES)
            changed = True
        if changed:
            b.save()
            updated += 1
            if updated >= 3:
                break
    print(f"Livres mis à jour: {updated}")

def fill_users():
    updated = 0
    qs = User.objects.all()
    for u in qs:
        changed = False
        if not u.pseudo:
            u.pseudo = (u.firstName or "Utilisateur") + str(u.id)[:4]
            changed = True
        if not u.educationLevel:
            u.educationLevel = "autre"
            changed = True
        if changed:
            u.save()
            updated += 1
            if updated >= 3:
                break
    print(f"Utilisateurs mis à jour: {updated}")

if __name__ == '__main__':
    print("Début du script de remplissage des champs vides (3 max par table)")
    fill_books()
    fill_users()
    print("Terminé.")
