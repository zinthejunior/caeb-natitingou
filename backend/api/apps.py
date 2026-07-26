from django.apps import AppConfig


class ApiConfig(AppConfig):
    # Cette classe configure l'application Django qui se trouve dans le dossier api.
    # `name` est le nom interne que Django utilise pour identifier cette application.
    # `verbose_name` est le nom affiché dans l'interface d'administration.
    name = 'api'
    verbose_name = 'API CAEB'
