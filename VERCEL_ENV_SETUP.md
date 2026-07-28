# Configuration des Variables d'Environnement Vercel

## Admin Panel (https://admin-nextjs-lemon.vercel.app)

Pour configurer les variables d'environnement dans Vercel:

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez le projet `admin-nextjs`
3. Allez dans Settings → Environment Variables
4. Ajoutez les variables suivantes:

```
NEXT_PUBLIC_SUPABASE_URL = [Votre URL Supabase]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [Votre clé Supabase anonyme]
NEXT_PUBLIC_API_URL = https://caeb-backend.onrender.com/api
```

### Comment obtenir les credentials Supabase:
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez le projet CAEB
3. Allez dans Settings → API
4. Copiez:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Kossi Chat (https://kossi-chat.vercel.app)

Configurez les variables d'environnement:

```
NEXT_PUBLIC_KOSSI_API = https://kossi-backend.onrender.com
NEXT_PUBLIC_CAEB_API = https://caeb-backend.onrender.com/api
```

---

## Variables d'Environnement Actuelles

### Supabase (caeb-frontend)
```
VITE_SUPABASE_URL=https://[votre-url].supabase.co
VITE_SUPABASE_ANON_KEY=[votre-key]
VITE_API_URL=https://caeb-backend.onrender.com/api
```

### Backends
- Django: https://caeb-backend.onrender.com
- FastAPI (Kossi): https://kossi-backend.onrender.com
- Frontend (caeb): https://caeb-frontend.vercel.app

---

## CORS Configuration Requise

Après le déploiement, mettez à jour les CORS dans les backends:

### Django Backend (caeb_backend)
```python
# settings.py
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    'caeb-frontend.vercel.app',
    'admin-nextjs-lemon.vercel.app',  # Admin panel
]

CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://caeb-frontend.vercel.app',
    'https://admin-nextjs-lemon.vercel.app',  # Admin panel
    'https://kossi-chat.vercel.app',  # Kossi chat
]
```

### FastAPI Backend (kossi_backend)
```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://localhost:5173',
        'https://caeb-frontend.vercel.app',
        'https://admin-nextjs-lemon.vercel.app',
        'https://kossi-chat.vercel.app',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)
```

---

## Checklist de Déploiement

- [ ] Admin Panel variables d'env configurées dans Vercel
- [ ] Kossi Chat variables d'env configurées dans Vercel
- [ ] Django CORS mis à jour avec les nouvelles URLs
- [ ] FastAPI CORS mis à jour avec les nouvelles URLs
- [ ] Test du login admin (Supabase auth)
- [ ] Test de l'API Admin → Django
- [ ] Test de l'API Kossi → FastAPI
- [ ] Test du chat Kossi
