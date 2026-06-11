# CAEB Natitingou

Application web de la Bibliothèque CAEB de Natitingou.

## Structure du projet

- `backend/` : API Django + Django REST Framework.
- `frontend/` : interface utilisateur React + Vite.
- `Kossi/` : interface de chat Next.js pour le service IA.
- `Kossi/fastapi_kossi/` : service IA FastAPI local pour l’assistant Kossi.

## Objectif

Ce projet permet de gérer :
- un catalogue de livres,
- des clubs de lecture,
- des événements,
- des réservations,
- des avis,
- des utilisateurs,
- un assistant IA conversationnel.

## Installation

### Prérequis

- Python 3.11+ (ou version compatible avec le projet)
- Node.js 18+ / npm
- PostgreSQL ou autre base configurée via Django

### 1. Backend Django

1. Ouvrez un terminal dans `backend/`.
2. Créez et activez un environnement virtuel :
   - PowerShell : `python -m venv .venv ; .\.venv\Scripts\Activate.ps1`
3. Installez les dépendances :
   - `pip install -r requirements.txt`
4. Configurez la base de données dans `backend/backend/settings.py` ou via `.env`.
5. Appliquez les migrations :
   - `python manage.py migrate`
6. Chargez des données si nécessaire :
   - `python seed_db.py`

### 2. Frontend React

1. Ouvrez un terminal dans `frontend/`.
2. Installez les dépendances :
   - `npm install`
3. Lancez le frontend :
   - `npm run dev`
4. Par défaut, l’application sera accessible sur `http://localhost:5173`.

### 3. Service IA Kossi

1. Ouvrez un terminal dans `Kossi/`.
2. Installez les dépendances si nécessaire :
   - `npm install`
3. Lancez l’interface Next.js et le backend FastAPI :
   - `npm run dev`

Le service FastAPI s’exécute sur `http://localhost:8001`.

## Lancement des services

### Lancement individuel

- Backend Django :
  - `cd backend && python manage.py runserver 8000`
- Frontend React :
  - `cd frontend && npm run dev`
- Service IA Kossi :
  - `cd Kossi && npm run dev`

### Lancement global depuis la racine

Ce monorepo propose des scripts npm pour démarrer les applications ensemble.

- `npm run dev:frontend` : démarre le frontend React.
- `npm run dev:backend` : démarre le backend Django.
- `npm run dev:ia` : démarre l’interface Kossi + le service IA.
- `npm run dev` : lance les trois services en parallèle.

## API backend

Le backend expose les routes Django REST sous `http://localhost:8000/api/`.

Routes principales :

- `GET /api/livres/`
- `GET /api/utilisateurs/`
- `GET /api/clubs/`
- `GET /api/evenements/`
- `GET /api/actualites/`
- `GET /api/avis/`
- `GET /api/reservations/`
- `GET /api/stats/`

Auth JWT :

- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/logout/`

## Service IA Kossi

Endpoints FastAPI principaux :

- `POST /chat` : dialogue avec l’assistant Kossi.
- `POST /chat/stream` : réponse en streaming SSE.
- `POST /vectorize` : génération d’embeddings.
- `GET /` : vérification de santé.
- `GET /health` : état détaillé.
- `GET /metrics` : métriques Prometheus (si activées).

## Notes importantes

- Le frontend React consomme l’API backend et peut être configuré pour pointer vers `http://localhost:8000/api`.
- Le service IA est indépendant du backend Django, mais il peut être utilisé par les interfaces frontales.
- Les statistiques globales sont disponibles via l’endpoint `GET /api/stats/`.

## Aide et maintenance

- Backend Django : `backend/api/` contient les modèles, serializers, vues et routes.
- Frontend React : `frontend/src/` contient les composants et hooks.
- Service Kossi : `Kossi/fastapi_kossi/` contient le coeur FastAPI, la configuration et les agents.

---

*README généré pour le projet CAEB Natitingou.*
