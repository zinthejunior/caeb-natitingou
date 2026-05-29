"""
Django settings for backend project.

Pour plus d'informations sur ce fichier, voir :
https://docs.djangoproject.com/en/6.0/topics/settings/

Liste complète des paramètres et de leurs valeurs :
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

from pathlib import Path
import os
from dotenv import load_dotenv

# ── Chargement des variables d'environnement depuis le fichier .env ───────────
# IMPORTANT : Toutes les valeurs sensibles (clé secrète, mot de passe DB,
# clés API, etc.) doivent être définies dans le fichier .env et jamais
# écrites directement dans ce fichier.
load_dotenv()

# Construire les chemins du projet ainsi : BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ── Sécurité ──────────────────────────────────────────────────────────────────
# Voir https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# CRITIQUE : La SECRET_KEY est lue depuis le fichier .env.
# Elle ne doit JAMAIS être codée en dur ici.
# Si la variable d'environnement est absente, on lève une erreur explicite
# pour éviter un démarrage silencieux avec une clé vide ou par défaut.
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError(
        "La variable d'environnement SECRET_KEY est manquante. "
        "Veuillez la définir dans votre fichier .env avant de démarrer le serveur."
    )

# DEBUG doit être False en production.
# On lit la valeur depuis l'environnement : "True" (chaîne) → True (booléen).
# Par défaut à False pour sécuriser une mise en production accidentelle.
DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

# ALLOWED_HOSTS : liste des noms d'hôtes autorisés à servir l'application.
# En développement : localhost, 127.0.0.1.
# En production : le nom de domaine du serveur (ex: caeb-natitingou.org).
# Valeur lue depuis .env sous forme de chaîne séparée par des virgules.
_allowed_hosts_env = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts_env.split(',') if h.strip()]


# ── Applications installées ───────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'api',
]

# ── Middleware ────────────────────────────────────────────────────────────────
# IMPORTANT : CorsMiddleware doit être placé en premier pour intercepter
# les requêtes OPTIONS (preflight) avant que les autres middlewares ne les traitent.

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# ── Base de données ───────────────────────────────────────────────────────────
# Configuration PostgreSQL locale uniquement.
# Les variables d'environnement suivantes peuvent être définies dans .env :
#   - DB_NAME : nom de la base (par défaut: 'caeb_bibliotheque')
#   - DB_USER : utilisateur PostgreSQL (par défaut: 'postgres')
#   - DB_PASSWORD : mot de passe PostgreSQL (par défaut: 'postgres')
#   - DB_HOST : host PostgreSQL (par défaut: 'localhost')
#   - DB_PORT : port PostgreSQL (par défaut: '5432')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'caeb_bibliotheque'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}


# ── CORS (Cross-Origin Resource Sharing) ──────────────────────────────────────
# Liste des origines autorisées à appeler l'API, lue depuis .env.
# Format dans .env : CORS_ALLOWED_ORIGINS=http://localhost:5173,https://caeb-natitingou.org
_cors_origins_env = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_env.split(',') if o.strip()]

# Requis pour autoriser le passage de cookies HttpOnly entre le frontend (port 5173) et l'API (port 8000)
CORS_ALLOW_CREDENTIALS = True


# ── Django REST Framework ──────────────────────────────────────────────────────

REST_FRAMEWORK = {
    # Authentification via jetons JWT dans les cookies HttpOnly et Authorization header
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'api.authentication.CookieJWTAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],

    # ── Pagination ─────────────────────────────────────────────────────────────
    # Toutes les vues qui renvoient des listes utiliseront automatiquement
    # cette pagination par curseur de page (PageNumber).
    # Le client peut surcharger la taille de page avec ?page_size=N (max 200).
    # Sans pagination, charger l'intégralité du catalogue (ex: 10 000 livres)
    # dans une seule réponse HTTP peut faire crasher le navigateur.
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,  # 20 éléments par page par défaut

    # ── Throttling (Limitation du taux de requêtes) ────────────────────────────
    # Protège les routes publiques sensibles contre les abus (spam, DoS, scraping).
    # - 'anon'  : utilisateurs non authentifiés
    # - 'user'  : utilisateurs authentifiés (limite plus généreuse)
    # Ces valeurs sont les limites par défaut ; chaque ViewSet peut les surcharger.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',    # 60 requêtes/minute pour les visiteurs anonymes
        'user': '300/minute',   # 300 requêtes/minute pour les utilisateurs connectés
        # Taux spéciaux pour les endpoints sensibles (définis dans api/throttling.py)
        'inscription': '5/minute',   # Max 5 inscriptions/minute par IP
        'contact':     '10/minute',  # Max 10 messages de contact/minute par IP
        'auth':        '10/minute',  # Max 10 tentatives d'authentification/minute
    },
}


# ── Validation des mots de passe ──────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ── Internationalisation ──────────────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Porto-Novo'
USE_I18N = True
USE_TZ = True


# ── Fichiers statiques ────────────────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'


# ── Modèle utilisateur personnalisé ──────────────────────────────────────────
AUTH_USER_MODEL = 'api.User'


# ── Headers de sécurité HTTP (actifs en production uniquement) ────────────────
# Ces paramètres renforcent la sécurité de l'application en production.
# Ils sont désactivés en développement pour éviter des blocages lors des tests.
if not DEBUG:
    # Force l'utilisation de HTTPS (HSTS)
    SECURE_HSTS_SECONDS = 31536000          # 1 an
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True              # Redirige HTTP → HTTPS automatiquement

    # Empêche le navigateur de deviner le type MIME (protection XSS)
    SECURE_CONTENT_TYPE_NOSNIFF = True

    # Active le filtre XSS intégré des navigateurs
    SECURE_BROWSER_XSS_FILTER = True

    # Empêche l'application d'être intégrée dans un iFrame (clickjacking)
    X_FRAME_OPTIONS = 'DENY'

    # Cookie de session transmis uniquement via HTTPS
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# ── Configuration Email ───────────────────────────────────────────────────────
# En développement (DEBUG=True) : les emails s'affichent dans la console.
# En production (DEBUG=False)   : les emails sont envoyés via SMTP.

if DEBUG:
    # Affiche le contenu des emails dans le terminal (parfait pour les tests)
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST          = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT          = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS       = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER     = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL  = os.environ.get('DEFAULT_FROM_EMAIL', 'no-reply@caeb-natitingou.org')

# URL de base du frontend (utilisée dans les liens d'email : confirmation, reset mdp, etc.)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
