# Application d'Administration Autonome — CAEB Natitingou (`admin/`)

Cette application est une interface d'administration dédiée et indépendante située dans le dossier `/admin` à la racine du projet.

Elle s'interface directement avec l'API Django `/api/` pour offrir une gestion complète (CRUD) de la bibliothèque.

---

## 🌟 Fonctionnalités Principales

1. **Tableau de Bord & Statistiques** :
   - Nombre de livres au catalogue.
   - Nombre d'utilisateurs et membres.
   - Emprunts actifs et alertes de retards.
   - Listes récentes.

2. **Gestion des Livres (CRUD)** :
   - Ajout de nouveaux ouvrages (avec couverture, auteur, genre, cote, résumé, nombre d'exemplaires).
   - Modification / Édition d'un livre existant.
   - Suppression d'un livre.
   - Filtrage par genre et recherche instantanée par titre ou auteur.

3. **Gestion des Utilisateurs & Membres** :
   - Validation en 1-clic des demandes d'adhésion physique (Passage au statut Membre).
   - Recherche d'utilisateurs par nom, pseudo ou email.
   - Modification et suppression des utilisateurs.

4. **Gestion des Emprunts** :
   - Suivi des prêts en cours, rendus et perdus.
   - Bouton d'action pour marquer un emprunt comme **Rendu**.

5. **Gestion des Publications, Actualités & Événements** :
   - Consultation et modération des actualités.
   - Suivi des événements et activités de la bibliothèque.

---

## 🚀 Comment l'utiliser ?

L'application d'administration est constituée de fichiers statiques autonomes (`index.html`, `style.css`, `app.js`).

### En développement local :
Ouvrez simplement le fichier `admin/index.html` dans votre navigateur ou lancez un petit serveur local :
```bash
npx serve admin
```
L'application se connectera automatiquement à votre API locale `http://localhost:8080/api`.

### En production :
Vous pouvez déployer le dossier `admin/` sur Vercel, Netlify ou tout autre hébergeur statique gratuit en le connectant à votre API de production `https://caeb-backend.onrender.com/api`.
