from django.contrib import admin
from .models import User, Book, Borrow, Interaction, Notification, ReadingClub, Event, News, Review, Reservation

# Ce fichier configure l'interface d'administration Django pour le module API.
# Chaque modèle enregistré ici devient visible et modifiable via /admin/.

# Enregistrement des modèles pour l'interface d'administration
admin.site.register(User)  # Utilisateurs de l'application
admin.site.register(Book)  # Livres du catalogue
admin.site.register(Borrow)  # Emprunts de livres par les utilisateurs
admin.site.register(Interaction)  # Interactions utilisateur (notation, favori, etc.)
admin.site.register(Notification)  # Notifications envoyées aux utilisateurs
admin.site.register(ReadingClub)  # Clubs de lecture disponibles
admin.site.register(Event)  # Événements ou cours gérés par l'application
admin.site.register(News)  # Actualités et publications
admin.site.register(Review)  # Avis de lecture laissés par les utilisateurs
admin.site.register(Reservation)  # Réservations de livres ou d'événements
