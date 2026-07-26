# CAEB Natitingou

## Présentation

CAEB Natitingou est une plateforme complète de gestion de bibliothèque. Elle combine :
- un backend Django pour la gestion des livres, des emprunts, des utilisateurs et des clubs,
- un frontend React responsive pour l’interface utilisateur,
- un service conversationnel Kossi basé sur FastAPI et Next.js pour l’assistant IA.

## Architecture

- `backend/` : API Django + Django REST Framework
- `frontend/` : application React + Vite
- `Kossi/` : assistant IA avec Next.js et FastAPI

## Fonctionnalités principales

- Catalogue de livres
- Gestion des utilisateurs et des emprunts
- Clubs de lecture
- Événements et actualités
- Avis et notes
- Recommandations personnalisées
- Assistant IA conversationnel

## Prérequis

- Python 3.11+
- Node.js 18+ et npm
- PostgreSQL ou autre base de données configurée pour Django

## Installation

### 1. Backend Django

1. Ouvrez un terminal dans le dossier `backend/`.
2. Créez et activez un environnement virtuel :
   - PowerShell :
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
3. Installez les dépendances :
   ```powershell
   pip install -r requirements.txt
   ```
4. Configurez la base de données dans `backend/backend/settings.py` ou via un fichier `.env`.
5. Appliquez les migrations :
   ```powershell
   python manage.py migrate
   ```
6. Optionnel : chargez des données de test ou initiales :
   ```powershell
   python seed_db.py
   ```

### 2. Frontend React

1. Ouvrez un terminal dans le dossier `frontend/`.
2. Installez les dépendances :
   ```powershell
   npm install
   ```
3. Lancez le frontend :
   ```powershell
   npm run dev
   ```
4. L’application est disponible par défaut sur `http://localhost:5173`.

### 3. Service IA Kossi

1. Ouvrez un terminal dans le dossier `Kossi/`.
2. Installez les dépendances :
   ```powershell
   npm install
   ```
3. Configurez les variables d’environnement dans `Kossi/fastapi_kossi/.env` (clé OpenRouter, URL de l’API Django, etc.).
4. Lancez le service :
   ```powershell
   npm run dev
   ```
5. Le service démarre le frontend Next.js et le backend FastAPI sur le port `8001`.

## Lancement des services

### Depuis la racine du projet

Le fichier `package.json` du dépôt racine contient des scripts pratiques :

- `npm run dev:frontend` : démarre le frontend React
- `npm run dev:backend` : démarre le backend Django sur le port `8080`
- `npm run dev:ia` : démarre le service IA Kossi
- `npm run dev` : lance les trois services en parallèle

### Démarrage manuel

- Backend Django :
  ```powershell
  cd backend
  python manage.py runserver 8000
  ```
- Frontend React :
  ```powershell
  cd frontend
  npm run dev
  ```
- Kossi IA :
  ```powershell
  cd Kossi
  npm run dev
  ```

## API backend

Le backend Django expose l’API principale sur `http://localhost:8000/api/`.

Exemples d’endpoints :

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

Le service IA Kossi expose plusieurs endpoints :

- `POST /chat` : interagir avec l’assistant Kossi
- `POST /chat/stream` : réponses en streaming
- `POST /vectorize` : génération d’embeddings
- `GET /` : santé du service
- `GET /health` : état détaillé
- `GET /metrics` : métriques Prometheus

## Structure des dossiers

- `backend/` : logique métier Django, modèles, API, migrations, recommandations ML
- `frontend/` : interface utilisateur React, composants, pages, styles
- `Kossi/` : service IA, agents, backend FastAPI, frontend Next.js

## Notes importantes

- Le frontend React et le service IA Kossi peuvent être exécutés séparément.
- Kossi synchronise ses données avec l’API Django pour récupérer le catalogue, les clubs et les événements.
- Vérifiez la configuration des variables d’environnement de Kossi avant de démarrer le service. 

## Support

- Backend Django : `backend/api/`
- Frontend React : `frontend/src/`
- Service IA : `Kossi/fastapi_kossi/`


