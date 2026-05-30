# 📚 RAPPORT COMPLET — FONCTIONNALITÉS DE LA PLATEFORME CAEB BIBLIOTHÈQUE

## I. ARCHITECTURE GÉNÉRALE

**Stack technique :**
- **Backend** : Django + Django REST Framework (DRF) + PostgreSQL/SQLite
- **Frontend** : React 18 + Vite + TailwindCSS
- **ML/Reco** : NMF + TF-IDF + Collaborative Filtering (joblib)
- **Auth** : JWT (token-based)
- **Infrastructure** : WAMP64 (dev), prêt pour déploiement

**Environnements** :
- `/backend/` : API REST + logique métier
- `/frontend/` : Interface utilisateur web
- `/fastapi_kossi/` : Chatbot IA (en parallèle)

---

## II. MODULES FONCTIONNELS

### 📖 1. GESTION DU CATALOGUE (Books)

**Endpoints API** :
- `GET /livres/` — lister tous les livres (pagination supportée, 1000 par page)
- `GET /livres/<id>/` — détails d'un livre
- `POST /livres/` — créer un livre (admin)
- `PATCH /livres/<id>/` — modifier un livre
- `DELETE /livres/<id>/` — supprimer un livre

**Actions spéciales** :
- `POST /livres/<id>/favorite/` — ajouter/retirer des favoris
- `POST /livres/<id>/mark-as-read/` — marquer comme lu

**Métadonnées** :
- Titre, auteur, année, langue (défaut : français)
- Genre, sous-genre
- Résumé, description, mots-clés
- Catégorie d'âge (enfant/ado/adulte)
- Codes-barres, cote, section, localisation
- Couverture (URL)
- Nombre d'exemplaires en stock
- Note moyenne et avis

**Statistiques calculées en temps réel** :
- Nombre d'emprunts
- Nombre d'emprunteurs uniques
- Durée moyenne d'emprunt
- Score de lecture (note moyenne)
- Popularité (log(emprunteurs_uniq))
- Flag : isNew (< 30 jours), isPopular (>= 5 emprunts)

**Frontend** :
- [CatalogPage.jsx](frontend/src/sections/CatalogPage.jsx) — catalogue browsable
- [BookDetailPage.jsx](frontend/src/sections/BookDetailPage.jsx) — détail complet
- Filtres : genre, sous-genre, année, niveau d'étude
- Recherche full-text

---

### 👥 2. GESTION DES UTILISATEURS (Users)

**Endpoints API** :
- `POST /utilisateurs/` — inscription (public, throttled)
- `GET /utilisateurs/me/` — profil connecté + statistiques
- `PATCH /utilisateurs/me/update/` — mise à jour profil (partial)
- `POST /utilisateurs/me/change-password/` — changement mot de passe
- `POST /utilisateurs/check-email/` — vérifier email unique (public, throttled)

**Statuts de compte** :
- `non_membre` — utilisateur inscrit, accès limité
- `en_attente` — demande d'adhésion soumise
- `membre` — adhésion validée, accès complet (réservation, prêt)

**Profil utilisateur** :
- Prénom, nom, pseudo, bio
- Avatar (URL)
- Email + téléphone
- Date de naissance (calcul de tranche d'âge pour reco)
- Niveau d'étude, classe
- Genres préférés, sous-genres préférés
- Intentions de lecture (JSONField)
- Liste de favoris (JSONField)
- Demande d'adhésion (flag)

**Statistiques en profil** :
- Nombre de livres lus
- Nombre d'avis postés
- Clubs adhérents
- Événements participés

**Frontend** :
- [RegisterPage.jsx](frontend/src/sections/RegisterPage.jsx) — inscription multi-step
- [LoginPage.jsx](frontend/src/sections/LoginPage.jsx) — connexion JWT
- [ProfilePage.jsx](frontend/src/sections/ProfilePage.jsx) — profil + édition

---

### 📋 3. EMPRUNTS (Borrows)

**Endpoints API** :
- `GET /emprunts/` — emprunts de l'utilisateur connecté
- `POST /emprunts/` — créer un emprunt (membre)
- `GET /emprunts/<id>/` — détails d'un emprunt
- `PATCH /emprunts/<id>/` — modifier (ex: renouveler)

**Données d'emprunt** :
- Utilisateur + Livre
- Date de sortie, date de retour prévue (durée = 14j par défaut)
- Date de retour effective (null si en cours)
- Statut : en_cours, rendu, perdu
- Flag renouvele (prolongation de 14j)
- Durée calculée en jours

**Workflows** :
- Réservation livre → emprunt créé en attente
- À réception physique → sortie du stock
- Retour → date retour effective enregistrée + stats livre maj
- Renouvellement → prolongation de 14j si possible

**Frontend** :
- [BorrowsPage.jsx](frontend/src/sections/BorrowsPage.jsx) — historique + emprunts actifs

---

### ⭐ 4. AVIS & NOTATION (Reviews)

**Endpoints API** :
- `GET /avis/` — lister tous les avis (publics)
- `GET /avis/?book=<id>` — avis d'un livre spécifique
- `POST /avis/` — poster un avis (authentifié)
- `PATCH /avis/<id>/` — modifier son avis
- `DELETE /avis/<id>/` — supprimer son avis

**Données** :
- Utilisateur + Livre
- Note (1–5 étoiles)
- Commentaire texte
- Date création
- Nombre de likes (applaudissements)

**Signaux associés** :
- Création/suppression d'avis → maj `Book.note_moyenne`, `Book.nb_notes`, `Book.score_lecture_max`

**Frontend** :
- Avis listés sur [BookDetailPage.jsx](frontend/src/sections/BookDetailPage.jsx)
- Section "Avis (n)" avec formulaire + tri par utilité

---

### 🎯 5. RECOMMANDATIONS (Recommendations)

**Endpoints API** :
- `GET /recommandations/?n=10` — recommandations personnalisées (authentifié)

**Moteur hybride** :
- **Collaborative NMF** : signaux utilisateur×livre via matrice pivot
- **Content-based TF-IDF** : similarité titre/résumé/mots-clés
- **Item-item co-emprunts** : Jaccard sur prêts conjoints
- **Profil utilisateur** : filtrage par genres, âge, niveau d'étude (fusion à poids configurable)
- **Cold-start** : pour utilisateurs sans historique, génère recommendations basées sur profil

**Fonctionnement** :
1. Si utilisateur dans pivot → fusion modèle + profil (poids = 30% profil par défaut)
2. Si nouvel utilisateur → recommendations profil-based + popularité
3. Filtre : ignorer livres déjà lus, ignorer livres absents de la base
4. Retourne : Code_barres, Titre, Section, Cote, Score (0–1)

**Frontend** :
- [RecommendationsPage.jsx](frontend/src/sections/RecommendationsPage.jsx) — page dédiée + carousel

---

### 💬 6. INTERACTIONS (Interactions)

**Endpoints API** :
- `GET /interactions/` — interactions utilisateur (filtrables)
- `POST /interactions/` — enregistrer interaction
- Filtres : `?type_action=vue`, `?livre_lu=true`

**Types d'interaction** :
- `vue` — consultation d'une page livre
- `marquage` — marquer comme lu
- `note` — évaluation (notation)
- `like` — j'aime
- `chat_ia` — interaction avec chatbot

**Champs** :
- user + livre
- type_action, notation (1–5 si applicable)
- durée_secondes (temps passé)
- livre_lu (flag)
- commentaire (optionnel)
- position (position dans une liste reco)
- source : application / chat_ia / recherche
- created_at

**Utilisé par** :
- Moteur de recommandations (données d'entraînement pivot)
- Analytics (tracking engagement)

---

### 🏘️ 7. CLUBS DE LECTURE (Reading Clubs)

**Endpoints API** :
- `GET /clubs/` — lister tous les clubs (publics)
- `GET /clubs/<id>/` — détails d'un club
- `POST /clubs/` — créer un club (admin/leader)
- `POST /clubs/<id>/join/` — rejoindre (authentifié)
- `POST /clubs/<id>/leave/` — quitter
- `POST /clubs/<id>/contact/` — envoyer message au responsable (public, throttled)

**Données** :
- Nom, description
- Image représentative
- Public visé : enfants, ados, adultes, tous
- Nombre de membres (calculé)
- Responsable : nom, rôle, email
- Relation ManyToMany avec Users

**Frontend** :
- [ClubsPage.jsx](frontend/src/sections/ClubsPage.jsx) — liste clubs + filtres
- [ClubDetailPage.jsx](frontend/src/sections/ClubDetailPage.jsx) — détail + adhésion + contact

---

### 📅 8. ÉVÉNEMENTS (Events)

**Endpoints API** :
- `GET /evenements/` — lister événements (publics)
- `GET /evenements/<id>/` — détails événement
- `POST /evenements/` — créer événement (admin)
- `POST /evenements/<id>/register/` — s'inscrire (authentifié)

**Types d'événements** :
- `club` — réunion club de lecture
- `conference` — conférence / présentation
- `workshop` — atelier / animation

**Données** :
- Titre, description, type, date, heure, lieu
- Nombre de participants (count)
- Club associé (optionnel)

**Frontend** :
- [EventsPage.jsx](frontend/src/sections/EventsPage.jsx) — agenda
- [EventDetailPage.jsx](frontend/src/sections/EventDetailPage.jsx) — détail + inscription

---

### 📰 9. ACTUALITÉS (News)

**Endpoints API** :
- `GET /actualites/` — lister nouvelles (publics, triées récentes d'abord)
- `GET /actualites/<id>/` — détails actualité

**Données** :
- Titre, contenu, image, date publication
- Auteur (optionnel)

**Frontend** :
- [NewsPage.jsx](frontend/src/sections/NewsPage.jsx) — liste actualités
- [NewsDetailPage.jsx](frontend/src/sections/NewsDetailPage.jsx) — article complet

---

### 📬 10. NOTIFICATIONS (Notifications)

**Endpoints API** :
- `GET /notifications/` — notifications utilisateur connecté
- `PATCH /notifications/<id>/` — marquer comme lue

**Types** :
- `rappel_retour` — rappel avant date limite retour
- `retard` — retard détecté
- `livre_disponible` — livre réservé disponible
- `demande_adhesion` — demande d'adhésion reçue (admin)
- `adhesion_confirmee` — adhésion validée
- `inscription_evenement` — confirmation inscription

**Champs** :
- user, type_notif, message, envoyee_le, lue (flag)
- Liens optionnels : emprunt, livre

**Signaux** :
- Notifications créées automatiquement par certains workflows (ex: validation adhésion)

---

### 💌 11. CONTACTS (Club Contact Messages)

**Endpoints API** :
- `POST /clubs/<id>/contact/` — envoyer message à club
- `GET /contacts/` — lister messages reçus (club manager)

**Données** :
- Club, utilisateur (optionnel), nom, email, message
- Timestamp

**Throttling** : 10 messages/min par IP

---

### 💬 12. CHAT IA (ChatSessions & ChatMessages)

**Endpoints API** :
- `GET /chat/` — lister sessions utilisateur
- `POST /chat/` — créer nouvelle session
- `POST /chat/<id>/messages/` — ajouter message à session

**Données session** :
- user, titre (optionnel), contexte
- created_at, updated_at

**Messages** :
- session, role (user/assistant), content, created_at

**Utilité** :
- Chatbot Kossi (IA recommandation + support)
- Historique conversations
- Contexte pour recommandations contextuellesNote : implémentation en cours (aussi dans `fastapi_kossi/main.py`)

---

### 🎫 13. RÉSERVATIONS (Reservations)

**Endpoints API** :
- `GET /reservations/` — réservations utilisateur
- `POST /reservations/` — créer réservation
- `PATCH /reservations/<id>/` — modifier
- `DELETE /reservations/<id>/` — annuler

**Données** :
- user, livre, date_reservation, date_limite
- Statut : en_attente, confirmee, annulee

**Workflow** :
- Membre clique "Réserver" → création réservation
- Livre devient indisponible (exemplaires = 0)
- Bibliothécaire contacte utilisateur
- Retrait physique + création emprunt

---

### 📊 14. PARTICIPATIONS AUX ÉVÉNEMENTS (ParticipationEvent)

**Endpoints API** :
- `GET /participations-evenements/` — participations utilisateur
- `POST /participations-evenements/` — créer participation

**Données** :
- user + event
- statut : confirmee, annulee
- date_inscription

---

### 📈 15. STATISTIQUES GLOBALES

**Endpoints API** :
- `GET /stats/` — statistiques publiques pour landing page

**Données retournées** :
- total_books, total_users
- clubs_count, news_count
- expertise_years (1978 → maintenant)
- active_readers (estimé)
- lab_count (cyberespace/lab)

**Utilité** : affichage landing page

---

## III. FEATURES AVANCÉES

### 🔍 Recherche & Filtres

**Frontend** :
- [SearchPage.jsx](frontend/src/sections/SearchPage.jsx) — recherche multi-critères
- Filtres : genre, année, niveau, auteur, titre
- Intégration avec endpoint `/livres/?search=...`

---

### ❤️ Favoris

- Sauvegarde liste `User.favorites` (JSONField)
- Action spéciale `/livres/<id>/favorite/` pour toggle
- [FavoritesPage.jsx](frontend/src/sections/FavoritesPage.jsx) — affichage favoris

---

### 🔐 Authentification & Autorisation

**Mécanisme** :
- JWT (tokens)
- `IsAuthenticated` — requiert JWT valide
- `AllowAny` — public
- `IsAuthenticatedOrReadOnly` — lire public, écrire authentifié
- Throttling sur actions sensibles (inscription, check-email, contact) : 5–10 req/min par IP

---

### 🎨 Thème & Accessibilité

- Mode sombre/clair (TailwindCSS + custom CSS vars)
- [ThemeToggle.jsx](frontend/src/components/ThemeToggle.jsx)
- Contraste adaptatif pour textes sur fonds (hook custom)
- Mobile-first responsive design
- [BottomNavigation.jsx](frontend/src/components/BottomNavigation.jsx) pour mobile

---

### 🔔 Notifications Push & Email

**Email** :
- Emails de bienvenue à inscription (service `emails.py`)
- Potentiellement : rappels, actualités

**Système** :
- Table `Notification` pour in-app notifications
- Pas de push mobile visible (à intégrer)

---

### 🌐 Progressive Web App (PWA)

- Manifest + service worker (hook `usePWAInstall.jsx`)
- Offline support potentiel (à valider)

---

## IV. PAGES FRONTEND

| Page | Route | Authentification | Description |
|------|-------|------------------|-------------|
| Landing | `/` | None | Présentation, stats globales |
| Connexion | `/login` | None | Formulaire JWT |
| Inscription | `/register` | None | Multi-step registration |
| Catalogue | `/catalog` | Any | Liste livres + filtres |
| Détail livre | `/books/:id` | Any | Couverture, avis, actions |
| Recherche | `/search` | Any | Recherche multi-critères |
| Mes emprunts | `/borrows` | Authenticated | Historique + actifs |
| Mes favoris | `/favorites` | Authenticated | Liste favoris |
| Recommandations | `/recommendations` | Authenticated | Carousel reco personnalisées |
| Profil | `/profile` | Authenticated | Édition profil + stats |
| Clubs | `/clubs` | Any | Liste clubs |
| Détail club | `/clubs/:id` | Any | Description + adhésion |
| Événements | `/events` | Any | Agenda |
| Détail événement | `/events/:id` | Any | Détails + inscription |
| Actualités | `/news` | Any | Articles blog |
| Détail article | `/news/:id` | Any | Article complet |
| Chat IA | `/chat` | Authenticated | Conversations Kossi |
| Paramètres | `/settings` | Authenticated | Thème, notifications, etc. |
| 404 | `*` | Any | Page non trouvée |

---

## V. INTÉGRATIONS EXTERNES

- **Email SMTP** : Django mail backend (dev console, prod via SMTP config)
- **IA Kossi** : FastAPI parallel (chatbot, recommendations contextuals)
- **Images** : AWS S3 ou URLs locales (couvertures)
- **Analytics** : pas visible (à intégrer)

---

## VI. DONNÉES CRITIQUES

**Volumes estimés** :
- Users : 100–10k (scalable)
- Books : 1k–100k+ (scalable)
- Interactions : 10k–1M+ (nécessite batch processing/streaming)
- Emprunts : 1k–100k+

**Modèle NMF** :
- Matrice pivot utilisateurs × livres (sparse)
- Reconstructed predictions matrix
- Features livres (TF-IDF vectors)
- Co-emprunts + scores Jaccard

---

## VII. RÉSUMÉ DES CAPACITÉS

✅ **Opérationnels** :
- CRUD complet catalogue + users + emprunts + avis + clubs + événements
- Système de favoris + marquage
- Recommandations hybrides NMF + contenu
- Authentification JWT
- Notifications in-app
- Chat IA basique
- Landing page avec stats

⚠️ **Partiellement implémentés** :
- Cold-start et profil-based filtering (nouvellement améliorés)
- Monitoring/metrics (basique via signals)
- PWA (structure prête, fonctionnalité unclear)

❌ **À implémenter/améliorer** :
- Réentraînement automatique du modèle (batch job)
- Versioning modèle + swap atomique
- Monitoring + dashboards (Prometheus/Grafana)
- Embeddings modernes (sentence-transformers remplaçant TF-IDF)
- Diversification recommandations (MMR)
- Pipeline événements streaming (Kafka)
- Tests unitaires complets
- Swagger/OpenAPI doc

---

## CONCLUSION

La plateforme **CAEB Bibliothèque** est une **application web moderne et fonctionnelle** dédiée à la gestion de bibliothèque avec **recommandations IA intégrées**. 

**Points forts** :
- Architecture modulaire (Django + React)
- Base de données riche (métadonnées livres + utilisateurs)
- Moteur de recommandation hybride mature
- UX soignée (thème, responsive, accessibility)

**Défis** :
- Scalabilité modèle et ingestion événements
- Boucle d'apprentissage continu automatisée
- Monitoring et qualité ML en production

**État de production** : **4/10** — fonctionnel mais nécessite renforcement infra & pipelines.
