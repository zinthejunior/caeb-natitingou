# Projet Bibliothéque CAEB Natitingou

Application web de la Bibliothéque CAEB de Natitingou, composée de :
- un backend Django REST (`backend/`),
- un frontend React + TypeScript + Vite (`src/`),
- un service d'IA conversationnelle FastAPI (`fastapi_kossi/`).

## Architecture

- `backend/` : API Django + Django REST Framework.
- `src/` : interface utilisateur React avec hooks, composants et pages.
- `public/` : ressources statiques et images.
- `fastapi_kossi/` : service IA local pour l'assistant Kossi.

## Objectif

Ce projet vise à gérer un catalogue de livres, des réservations, des clubs de lecture, des événements, des avis et un laboratoire IA. Les statistiques publiques sont calculées dynamiquement à partir des données réelles du backend.

## Installation locale

### 1. Backend

1. Ouvrez une console dans `backend/`.
2. Créez et activez un environnement Python :
   - Windows PowerShell : `python -m venv .venv ; .\.venv\Scripts\Activate.ps1`
3. Installez les dépendances :
   - `pip install -r requirements.txt`
4. Configurez la base de données si nécessaire dans `backend/backend/settings.py` ou via un fichier `.env`.
5. Appliquez les migrations :
   - `python manage.py migrate`
6. Chargez des données de test si vous en disposez :
   - `python manage.py loaddata <fichier>` ou `python seed_db.py`

### 2. Frontend

1. Ouvrez une console dans le dossier racine du projet.
2. Installez les dépendances :
   - `npm install`
3. Lancez le serveur de développement :
   - `npm run dev`
4. Le frontend s'exécute généralement sur `http://localhost:5173`.

### 3. Service IA (Kossi)

1. Ouvrez une console dans `fastapi_kossi/`.
2. Activez le mème environnement Python ou un autre.
3. Lancez le service :
   - `uvicorn main:app --reload --port 8001`
4. Ce service expose un endpoint de chat local pour l'assistant Kossi.

## Points clés du projet

### API publique

- Base API : `http://localhost:8000/api/`
- Endpoints principaux :
  - `api/livres/`
  - `api/clubs/`
  - `api/evenements/`
  - `api/avis/`
  - `api/reservations/`
  - `api/stats/`

### Statistiques dynamiques

Le point final `GET /api/stats/` renvoie désormais des données calculées en temps réel :
- `books_count` / `total_books`
- `members_count` / `total_users`
- `years` / `expertise_years`
- `clubs_count`
- `news_count`
- `lab_count`
- `active_readers`

Le champ `years` est calculé automatiquement comme `année actuelle - 1978`, ce qui rend l'ancienneté de la CAEB dynamique et ne dépend plus d'une valeur codée en dur.

### Alignement frontend/backend

- Le backend expose des alias français/anglais pour les champs des livres et des statistiques.
- Le frontend `src/hooks/useData.ts` consomme `/stats/` et normalise les clés reçues, ce qui évite les incohérences entre anciens et nouveaux noms de champs.

## Lancer le projet

- Backend : `python backend/manage.py runserver 8000`
- Frontend : `npm run dev`
- IA : `uvicorn fastapi_kossi.main:app --reload --port 8001`

> Note : en local, le frontend attend le backend sur `http://localhost:8000/api` et le service IA sur `http://localhost:8001`.

## Bonnes pratiques

- Utilisez les routes Django DRF définies dans `backend/api/urls.py`.
- Les champs de données des livres sont définis dans `backend/api/models.py` et sérialisés dans `backend/api/serializers.py`.
- Pour ajouter un nouveau champ de statistiques, mettez à jour `backend/api/views.py` et `src/hooks/useData.ts` en parallèle.
