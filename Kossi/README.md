# Kossi Chat - AI Assistant pour CAEB Natitingou

Interface de chat alimentée par l'IA pour la Bibliothèque CAEB Natitingou, construite avec Next.js 15 et FastAPI.

## Fonctionnalités

- 💬 Chat en temps réel avec assistance IA
- 📚 Recherche dans le catalogue de livres
- 🔍 Recherche Web intégrée
- 📖 Recommandations personnalisées
- 🌍 Support multilingue
- 🚀 Interface moderne et responsive

## Architecture

- **Frontend**: Next.js 15 avec React 19, Tailwind CSS
- **Backend**: FastAPI (Python)
- **IA**: OpenRouter API (LLMs)
- **Base de données**: PostgreSQL (partagée avec CAEB)

## Technologies

```
Frontend:
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Lucide Icons

Backend:
- FastAPI
- SQLAlchemy
- Pydantic
- PostgreSQL
```

## Installation

### Prérequis
- Node.js 18+
- Python 3.9+
- PostgreSQL

### Setup Frontend

```bash
cd Kossi
npm install
cp .env.example .env.local
# Remplir les variables d'environnement
npm run dev
```

### Setup Backend

```bash
cd Kossi
python -m venv venv
source venv/bin/activate  # ou `venv\Scripts\activate` sur Windows
pip install -r requirements.txt
cp fastapi_kossi/.env.example fastapi_kossi/.env
# Remplir les variables d'environnement
python -m uvicorn fastapi_kossi.main:app --reload --port 8001
```

## Variables d'Environnement

### Frontend (.env.local)
```env
NEXT_PUBLIC_KOSSI_API=http://localhost:8001
NEXT_PUBLIC_CAEB_API=https://caeb-backend.onrender.com/api
```

### Backend (fastapi_kossi/.env)
```env
BACKEND_API_URL=https://caeb-backend.onrender.com/api
OPENROUTER_API_KEY=sk-or-v1-...
CORS_ORIGINS=http://localhost:3000,https://kossi-chat.vercel.app
```

## Développement

```bash
# Terminal 1 - Frontend Next.js
npm run dev:frontend

# Terminal 2 - Backend FastAPI
npm run dev:backend

# Ou les deux ensemble:
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Build & Déploiement

### Frontend Vercel
```bash
npm run build
npm start
```

### Backend Render/Railway
- Connecter le repository GitHub
- Configurer les variables d'environnement
- Déployer automatiquement

## Structure du Projet

```
Kossi/
├── app/                  # Pages Next.js (App Router)
├── components/           # Composants React réutilisables
├── lib/                  # Utilitaires et helpers
├── services/             # Services et clients API
├── fastapi_kossi/        # Backend FastAPI
│   ├── main.py          # Point d'entrée FastAPI
│   ├── models/          # Modèles SQLAlchemy
│   ├── routes/          # Endpoints API
│   └── services/        # Logique métier
├── scripts/             # Scripts utilitaires
└── package.json         # Dépendances Node.js
```

## APIs Intégrées

- **CAEB Backend**: Catalogue de livres, utilisateurs
- **OpenRouter**: Modèles d'IA (Claude, GPT, Llama, etc.)
- **SerpAPI**: Recherche web personnalisée
- **Bing Search**: Recherche alternative

## Déploiement sur Vercel

1. Connecter le repository GitHub à Vercel
2. Configurer les variables d'environnement
3. Ajouter le script de build: `npm run build`
4. Déployer automatiquement

## Tester l'API

```bash
# Santé du backend
curl http://localhost:8001/health

# Chat
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Bonjour!"}'
```

## Support

Pour les problèmes:
- Ouvrir une issue sur GitHub
- Consulter la documentation du backend
- Vérifier les logs Vercel

## Licence

MIT

## Auteurs

CAEB Natitingou Development Team
