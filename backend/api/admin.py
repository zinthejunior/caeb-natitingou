from django.contrib import admin
from .models import User, Book, Borrow, Interaction, Notification, ReadingClub, Event, News, Badge

# Enregistrement des modèles pour l'interface d'administration
admin.site.register(User)
admin.site.register(Book)
admin.site.register(Borrow)
admin.site.register(Interaction)
admin.site.register(Notification)
admin.site.register(ReadingClub)
admin.site.register(Event)
admin.site.register(News)
admin.site.register(Badge)
