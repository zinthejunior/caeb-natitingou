"""
Configuration WSGI pour le projet backend.

Ce module expose l'appelable WSGI sous le nom de variable de module ``application``.

Pour plus d'informations sur ce fichier, voir
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
