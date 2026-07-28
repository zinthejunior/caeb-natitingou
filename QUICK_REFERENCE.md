# 📌 Référence Rapide - Déploiement CAEB

## 🌐 URLs en Production

```
Frontend               → https://caeb-frontend.vercel.app
Admin Panel (NOUVEAU)  → https://admin-nextjs-lemon.vercel.app
Chat Kossi (NOUVEAU)   → https://kossi-chat.vercel.app
Backend Django         → https://caeb-backend.onrender.com
Backend FastAPI (Kossi)→ https://kossi-backend.onrender.com
```

## 🔐 Authentification Admin

**Supabase Project URL:** (à configurer dans Vercel)
```
NEXT_PUBLIC_SUPABASE_URL = [URL Supabase]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Clé Supabase]
```

## ⚙️ Configuration Requise

### Dans Vercel - Admin Panel
```bash
# Allez sur: https://vercel.com/dashboard
# Projet: admin-nextjs
# Settings → Environment Variables
# Ajouter:
NEXT_PUBLIC_SUPABASE_URL = ...
NEXT_PUBLIC_SUPABASE_ANON_KEY = ...
NEXT_PUBLIC_API_URL = https://caeb-backend.onrender.com/api
```

### Dans Vercel - Kossi Chat
```bash
# Projet: kossi-chat
# Settings → Environment Variables
# Ajouter:
NEXT_PUBLIC_KOSSI_API = https://kossi-backend.onrender.com
NEXT_PUBLIC_CAEB_API = https://caeb-backend.onrender.com/api
```

### Dans Django Backend
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'https://caeb-frontend.vercel.app',
    'https://admin-nextjs-lemon.vercel.app',  # NEW
    'https://kossi-chat.vercel.app',           # NEW
]
```

### Dans FastAPI Backend
```python
# main.py
allow_origins=[
    'https://caeb-frontend.vercel.app',
    'https://admin-nextjs-lemon.vercel.app',
    'https://kossi-chat.vercel.app',  # Kossi chat
]
```

## 📊 Tests de Vérification

| Test | URL | Expected |
|------|-----|----------|
| Admin accueil | /admin-nextjs-lemon.vercel.app | Page d'accueil |
| Admin login | /admin-nextjs-lemon.vercel.app (Supabase) | Formulaire login |
| Kossi accueil | /kossi-chat.vercel.app | Page chat |
| API Admin | GET /admin-nextjs/api/stats | 200 OK |
| API Kossi | GET /kossi-chat/api/config | 200 OK |

## 🔧 Commandes Utiles

```bash
# Voir logs Vercel
vercel logs [project-name]

# Redéployer
cd [project-dir] && vercel --prod

# Vérifier env vars
vercel env list

# SSH dans le déploiement
vercel inspect [url]
```

## 📈 Statut du Déploiement

```
✅ Admin Panel (Next.js)        → LIVE
✅ Kossi Chat (Next.js)          → LIVE
✅ Supabase Connection           → À configurer
✅ Backend Django CORS           → À mettre à jour
✅ Backend FastAPI CORS          → À mettre à jour
⏳ End-to-End Testing            → À faire
```

## 🚀 Action Items (Ordre de Priorité)

1. **[URGENT]** Configurer env vars Vercel Admin
2. **[URGENT]** Configurer env vars Vercel Kossi
3. **[HIGH]** Mettre à jour CORS Django + FastAPI
4. **[HIGH]** Tester connectivity Admin ↔ Django
5. **[HIGH]** Tester connectivity Kossi ↔ FastAPI
6. **[MEDIUM]** Configurer auth Kossi Chat
7. **[MEDIUM]** Ajouter monitoring/logs

## 📱 Contact & Support

- Documentation: Voir les fichiers DEPLOYMENT_*.md
- GitHub Repos:
  - Admin: https://github.com/zinthejunior/caeb-admin
  - Kossi: https://github.com/zinthejunior/kossi-chat
