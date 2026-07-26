"""
api/throttling.py — Classes de limitation de taux personnalisées.

Ces classes définissent des limites spécifiques pour les endpoints sensibles
(inscription, contact, authentification). Elles étendent les classes de base
AnonRateThrottle / UserRateThrottle de Django REST Framework.

Les taux correspondants sont configurés dans settings.py sous
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].

Utilisation dans une vue :
    from api.throttling import InscriptionRateThrottle
    throttle_classes = [InscriptionRateThrottle]
"""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class InscriptionRateThrottle(AnonRateThrottle):
    """
    Limite la création de comptes (endpoint POST /api/utilisateurs/).
    Protège contre la création massive de faux comptes (bots, spam).
    Taux : défini par la clé 'inscription' dans DEFAULT_THROTTLE_RATES.
    """
    scope = 'inscription'


class ContactRateThrottle(AnonRateThrottle):
    """
    Limite l'envoi de messages de contact aux clubs (POST /api/clubs/{id}/contact/).
    Accessible sans authentification → cible privilégiée pour le spam.
    Taux : défini par la clé 'contact' dans DEFAULT_THROTTLE_RATES.
    """
    scope = 'contact'


class AuthRateThrottle(AnonRateThrottle):
    """
    Limite les tentatives d'authentification (check-email, connexion).
    Protège contre les attaques par force brute sur les mots de passe.
    Taux : défini par la clé 'auth' dans DEFAULT_THROTTLE_RATES.
    """
    scope = 'auth'
