"""
Configuration ASGI pour le projet backend.

Ce module expose l'appelable ASGI sous le nom de variable de module ``application``.

Pour plus d'informations sur ce fichier, voir
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_asgi_application()
