# Guide de Déploiement - CAEB Natitingou

Ce guide explique comment déployer Admin et Kossi sur Vercel et Render.

## État actuel du projet

### Déploiements existants ✅
- **caeb-frontend** - React/Vite → https://caeb-frontend.vercel.app
- **caeb-backend** - Django → https://caeb-backend.onrender.com
- **kossi-backend** - FastAPI → https://kossi-backend.onrender.com

### À déployer 🚀
- **admin-nextjs** - Panel d'administration (NEW)
- **Kossi** - Chat AI frontend (EXISTING)

---

## 1. Créer les dépôts GitHub séparés

### Option A: Via GitHub CLI
```bash
# Admin repo
gh repo create zinthejunior/caeb-admin --public --source=/vercel/share/v0-project/admin-nextjs --remote=origin --push

# Kossi repo
gh repo create zinthejunior/kossi-chat --public --source=/vercel/share/v0-project/Kossi --remote=origin --push
```

### Option B: Manuellement sur GitHub.com
1. Créer un nouveau repository: `caeb-admin`
2. Créer un nouveau repository: `kossi-chat`
3. Puis pusher:
   ```bash
   cd /vercel/share/v0-project/admin-nextjs
   git remote add origin https://github.com/zinthejunior/caeb-admin.git
   git branch -M main
   git push -u origin main
   ```

---

## 2. Déployer Admin sur Vercel

### Étapes
1. Aller sur https://vercel.com
2. Cliquer "New Project"
3. Importer le repo `caeb-admin`
4. Configuration:
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Ajouter les variables d'environnement:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<votre_url_supabase>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre_clé_supabase>
   NEXT_PUBLIC_API_URL=https://caeb-backend.onrender.com/api
   ```
6. Déployer!

### URL Admin
```
https://caeb-admin.vercel.app
```

---

## 3. Déployer Kossi sur Vercel

### Étapes Frontend
1. Aller sur https://vercel.com
2. Cliquer "New Project"
3. Importer le repo `kossi-chat`
4. Configuration:
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Ajouter les variables d'environnement:
   ```
   NEXT_PUBLIC_KOSSI_API=https://kossi-backend.onrender.com
   NEXT_PUBLIC_CAEB_API=https://caeb-backend.onrender.com/api
   ```
6. Déployer!

### URL Kossi Frontend
```
https://kossi-chat.vercel.app
```

### Backend FastAPI (déjà déployé)
```
https://kossi-backend.onrender.com
```

---

## 4. Configuration des CORS

### Admin - Backend Django
Ajouter à `ALLOWED_HOSTS` dans Django:
```python
ALLOWED_HOSTS = [
    'caeb-admin.vercel.app',
    'caeb-frontend.vercel.app',
]

CORS_ALLOWED_ORIGINS = [
    'https://caeb-admin.vercel.app',
    'https://caeb-frontend.vercel.app',
]
```

### Kossi - Backend FastAPI
Ajouter au `.env` ou config:
```
CORS_ORIGINS=https://kossi-chat.vercel.app
```

---

## 5. Configuration Supabase pour Admin

L'admin utilise la **même instance Supabase** que le frontend caeb.

### Credentials à obtenir de:
- **NEXT_PUBLIC_SUPABASE_URL**: Depuis Supabase project settings
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Depuis Supabase project settings

Ajouter ces variables dans les paramètres Vercel pour Admin.

---

## 6. Tester les déploiements

### Admin Panel
```bash
curl https://caeb-admin.vercel.app
# Devrait retourner le HTML de la page
```

### Kossi Chat
```bash
curl https://kossi-chat.vercel.app
# Devrait retourner le HTML de la page
```

### Connexions API
```bash
# Tester Admin → Backend Django
curl https://caeb-backend.onrender.com/api/books

# Tester Kossi → Backend FastAPI
curl https://kossi-backend.onrender.com/health
```

---

## 7. Structure finale déployée

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
├──────────────────┬──────────────────┬──────────────────┤
│ caeb-frontend    │   caeb-admin     │   kossi-chat     │
│ (React/Vite)     │  (Next.js Admin) │ (Next.js Chat)   │
│ Vercel           │     Vercel       │     Vercel       │
└────────┬─────────┴────────┬─────────┴────────┬─────────┘
         │                  │                   │
         └──────────────────┼───────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │      BACKEND LAYER                  │
    ┌────┴─────────────────┐         ┌────────┴──────┐
    │ caeb-backend         │         │ kossi-backend  │
    │ (Django)             │         │ (FastAPI)      │
    │ Render               │         │ Render         │
    └────┬────────────────┘         └────────┬───────┘
         │                                   │
    ┌────┴─────────────────────┬────────────┘
    │    DATABASE LAYER        │
    │    ┌─────────────────┐   │
    │    │    Supabase     │   │
    │    │  PostgreSQL     │   │
    │    └─────────────────┘   │
    └────────────────────────┘
```

---

## 8. Checkliste de déploiement

### Admin Panel
- [ ] Créer repo GitHub `caeb-admin`
- [ ] Pousser le code vers GitHub
- [ ] Créer projet Vercel
- [ ] Configurer variables d'environnement
- [ ] Configurer CORS dans Django backend
- [ ] Tester la connexion à Supabase
- [ ] Tester les appels API

### Kossi Chat
- [ ] Créer repo GitHub `kossi-chat`
- [ ] Pousser le code vers GitHub
- [ ] Créer projet Vercel
- [ ] Configurer variables d'environnement
- [ ] Configurer CORS dans FastAPI backend
- [ ] Tester la connexion au backend
- [ ] Tester le chat

---

## 9. Variables d'environnement résumées

### Admin (.env Vercel)
```
NEXT_PUBLIC_SUPABASE_URL = https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
NEXT_PUBLIC_API_URL = https://caeb-backend.onrender.com/api
```

### Kossi Frontend (.env Vercel)
```
NEXT_PUBLIC_KOSSI_API = https://kossi-backend.onrender.com
NEXT_PUBLIC_CAEB_API = https://caeb-backend.onrender.com/api
```

### Django Backend (.env Render)
```
CORS_ALLOWED_ORIGINS = https://caeb-admin.vercel.app,https://caeb-frontend.vercel.app,https://kossi-chat.vercel.app
ALLOWED_HOSTS = caeb-admin.vercel.app,caeb-frontend.vercel.app,kossi-chat.vercel.app
```

### FastAPI Backend (.env Render)
```
CORS_ORIGINS = https://kossi-chat.vercel.app
BACKEND_API_URL = https://caeb-backend.onrender.com/api
```

---

## 10. Support & Troubleshooting

### Admin ne se connecte pas à Supabase
- Vérifier `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Vérifier que Supabase est accessible (https://supabase.com)

### Admin/Kossi ne peuvent pas appeler le backend
- Vérifier les URL d'API
- Vérifier CORS dans les backends
- Vérifier les firewall/pare-feu

### Kossi chat ne fonctionne pas
- Vérifier que FastAPI backend est running
- Vérifier `NEXT_PUBLIC_KOSSI_API`
- Consulter les logs Render du backend

---

## Prochaines étapes

1. Créer les repos GitHub (voir section 1)
2. Déployer Admin sur Vercel (voir section 2)
3. Déployer Kossi sur Vercel (voir section 3)
4. Tester les connexions (voir section 6)
5. Mettre à jour les CORS (voir section 4)

Bonne chance! 🚀
