/**
 * =============================================================================
 * HOOK D'AUTHENTIFICATION (useAuthentification.js)
 * =============================================================================
 * 
 * Ce fichier contient un "hook personnalisé" React qui gère tout ce qui
 * concerne l'authentification des utilisateurs dans l'application.
 * 
 * QU'EST-CE QU'UN HOOK PERSONNALISÉ ?
 * - C'est une fonction JavaScript qui commence par "use"
 * - Elle utilise d'autres hooks React (useState, useEffect, useCallback, etc.)
 * - Elle permet de réutiliser la même logique dans plusieurs composants
 * - Elle encapsule une fonctionnalité complexe en une interface simple
 * 
 * CE QUE CE HOOK FOURNIT :
 * - connexion(email, motDePasse) : connecte un utilisateur existant
 * - inscription(donnees) : crée un nouveau compte utilisateur
 * - deconnexion() : déconnecte l'utilisateur actuel
 * - mettreAJourUtilisateur(updates) : modifie le profil utilisateur
 * - changerMotDePasse(ancien, nouveau) : change le mot de passe
 * - verifierEmail(email) : vérifie si un email est déjà utilisé
 * - utilisateur : les données de l'utilisateur connecté (ou null)
 * - estAuthentifie : booléen indiquant si quelqu'un est connecté
 * - chargement : booléen indiquant si une opération est en cours
 * 
 * COMMENT L'UTILISER DANS UN COMPOSANT :
 * ```jsx
 * import { useAuthentification } from "@/hooks/useAuthentification";
 * 
 * function MonComposant() {
 *   const { utilisateur, connexion, deconnexion, chargement } = useAuthentification();
 *   
 *   if (chargement) return <p>Chargement...</p>;
 *   if (!utilisateur) return <p>Non connecté</p>;
 *   return <p>Bonjour {utilisateur.prenom} !</p>;
 * }
 * ```
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION IMPORTS - Chargement des dépendances nécessaires
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IMPORT : useState (React)
 * 
 * Hook React pour créer des variables d'état.
 * Quand l'état change, le composant qui utilise ce hook se re-rend.
 * 
 * Ici utilisé pour :
 * - Stocker les données de l'utilisateur connecté
 * - Suivre l'état d'authentification (connecté ou non)
 * - Indiquer si une opération est en cours (chargement)
 */

/**
 * IMPORT : useCallback (React)
 * 
 * Hook React pour mémoriser des fonctions.
 * Sans useCallback, une nouvelle fonction serait créée à chaque rendu,
 * ce qui peut causer des re-rendus inutiles dans les composants enfants.
 * 
 * Syntaxe : const maFonction = useCallback((params) => { ... }, [dépendances]);
 * La fonction n'est recréée que si les dépendances changent.
 */

/**
 * IMPORT : useEffect (React)
 * 
 * Hook React pour gérer les "effets de bord".
 * Un effet de bord est une action qui se produit en dehors du rendu :
 * - Appels API
 * - Abonnements à des événements
 * - Manipulation du DOM
 * - Timers (setTimeout, setInterval)
 * 
 * Syntaxe : useEffect(() => { ... }, [dépendances]);
 * L'effet s'exécute après le rendu, et se ré-exécute si les dépendances changent.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

/**
 * IMPORT : Fonctions de l'API
 * 
 * Ces fonctions sont définies dans lib/api.js :
 * - fetchWithAuth : fait des requêtes HTTP avec authentification par cookies automatique
 */
import { fetchWithAuth } from "@/lib/api";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONFIGURATION - Constantes et paramètres
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * URL de base de l'API backend.
 * 
 * En développement : http://localhost:8080/api (Django local)
 * En production : URL du serveur de production
 * 
 * La valeur peut être définie via la variable d'environnement VITE_API_URL.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FONCTIONS UTILITAIRES - Helpers pour transformer les données
// ═════════════════──────────────────────────────────────────────────────────────

/**
 * normaliserUtilisateur : Transforme les données brutes de l'API en format standardisé.
 * 
 * POURQUOI NORMALISER ?
 * L'API Django peut renvoyer les champs avec différents noms selon les endpoints.
 * Cette fonction garantit que notre code frontend utilise toujours les mêmes noms.
 * 
 * Exemple : L'API peut renvoyer "firstName" ou "prenom" selon l'endpoint.
 * Après normalisation, on a toujours accès aux deux.
 * 
 * @param {object} raw - Les données brutes reçues de l'API
 * @returns {object} - Les données normalisées avec tous les champs attendus
 */
function normaliserUtilisateur(raw) {
  /**
   * L'opérateur spread "...raw" copie toutes les propriétés de l'objet raw.
   * Ensuite, on ajoute/écrase des propriétés spécifiques.
   */
  return {
    ...raw, // Copie toutes les propriétés existantes
    
    // ─── NOMS EN FRANÇAIS ET ANGLAIS ─────────────────────────────────────────
    // On s'assure que les deux versions sont disponibles
    prenom: raw.prenom || raw.firstName || "",
    nom: raw.nom || raw.lastName || "",
    firstName: raw.firstName || raw.prenom || "",
    lastName: raw.lastName || raw.nom || "",
    
    // ─── STATUT MEMBRE ───────────────────────────────────────────────────────
    // L'opérateur ?? (nullish coalescing) renvoie la partie droite seulement
    // si la partie gauche est null ou undefined (pas pour false ou 0)
    estMembre: raw.estMembre ?? raw.isMember ?? raw.type_compte === "membre",
    isMember: raw.isMember ?? raw.estMembre ?? raw.type_compte === "membre",
    estEnAttente: raw.type_compte === "en_attente",
    
    // ─── DATES ───────────────────────────────────────────────────────────────
    date_inscription: raw.date_inscription || raw.createdAt || "",
    createdAt: raw.createdAt || raw.date_inscription || "",
    date_naissance: raw.date_naissance || "",
    
    // ─── GENRES PRÉFÉRÉS ─────────────────────────────────────────────────────
    // Gère différents formats : tableau, chaîne séparée par des virgules, ou vide
    genresPreferes: raw.preferredGenres || (raw.genre_prefere 
      ? Array.isArray(raw.genre_prefere) 
        ? raw.genre_prefere 
        : raw.genre_prefere.split(",").filter(Boolean) // Convertit "a,b,c" en ["a", "b", "c"]
      : []),
    preferredGenres: raw.preferredGenres || (raw.genre_prefere 
      ? Array.isArray(raw.genre_prefere) 
        ? raw.genre_prefere 
        : raw.genre_prefere.split(",").filter(Boolean) 
      : []),
    
    // ─── AUTRES PROPRIÉTÉS ───────────────────────────────────────────────────
    favoris: raw.favorites ?? [],        // Livres favoris (tableau d'IDs)
    intentions: raw.intentions ?? [],    // Intentions de lecture
    clubsSuivis: raw.followedClubs ?? [], // Clubs suivis
    stats: raw.stats ?? {                 // Statistiques utilisateur avec valeurs par défaut
      livresLus: 0,
      avisPublies: 0,
      clubsRejoints: 0,
      evenementsParticipes: 0
    }
  };
}

/**
 * denormaliserMisesAJour : Transforme les données du frontend en format API.
 * 
 * C'est l'inverse de normaliserUtilisateur.
 * Quand on envoie des mises à jour au serveur, on doit utiliser les noms
 * de champs que l'API Django attend.
 * 
 * @param {object} updates - Les données à envoyer (format frontend)
 * @returns {object} - Les données formatées pour l'API (format backend)
 */
function denormaliserMisesAJour(updates) {
  // Crée une copie pour ne pas modifier l'original
  const out = { ...updates };
  
  // ─── CONVERSION DES NOMS DE CHAMPS ─────────────────────────────────────────
  // L'opérateur "in" vérifie si une propriété existe dans un objet
  if ("prenom" in updates) {
    out["first_name"] = updates.prenom; // Django attend "first_name"
  }
  if ("nom" in updates) {
    out["last_name"] = updates.nom; // Django attend "last_name"
  }
  if ("genresPreferes" in updates && Array.isArray(updates.genresPreferes)) {
    out["genre_prefere"] = updates.genresPreferes.join(","); // Convertit ["a", "b"] en "a,b"
  }
  
  // ─── SUPPRESSION DES CHAMPS NON ACCEPTÉS PAR L'API ─────────────────────────
  // delete supprime une propriété d'un objet
  delete out["prenom"];        // Remplacé par first_name
  delete out["nom"];           // Remplacé par last_name
  delete out["genresPreferes"]; // Remplacé par genre_prefere
  delete out["estMembre"];     // Calculé côté serveur
  delete out["stats"];         // Non modifiable directement
  delete out["clubsSuivis"];   // Géré par une autre API
  delete out["favoris"];       // Géré par une autre API
  
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL : useAuthentification
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook personnalisé pour gérer l'authentification.
 * 
 * Retourne un objet contenant :
 * - utilisateur : les données de l'utilisateur ou null
 * - estAuthentifie : true si connecté, false sinon
 * - chargement : true si une opération est en cours
 * - connexion : fonction pour se connecter
 * - inscription : fonction pour créer un compte
 * - deconnexion : fonction pour se déconnecter
 * - mettreAJourUtilisateur : fonction pour modifier le profil
 * - changerMotDePasse : fonction pour changer le mot de passe
 * - verifierEmail : fonction pour vérifier si un email existe
 */
function useProvideAuthentification() {
  // ─────────────────────────────────────────────────────────────────────────────
  // ÉTAT PRINCIPAL - Stocke toutes les informations d'authentification
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * État principal du hook.
   * 
   * On utilise un seul objet d'état plutôt que plusieurs useState séparés.
   * Avantages :
   * - Mise à jour atomique (toutes les propriétés changent ensemble)
   * - Évite les états incohérents
   * - Plus facile à retourner en fin de hook
   */
  const [etat, setEtat] = useState({
    utilisateur: null,      // Données de l'utilisateur ou null si non connecté
    estAuthentifie: false,  // Booléen : est-ce que quelqu'un est connecté ?
    chargement: true        // Booléen : est-ce qu'une opération est en cours ?
    // Note : chargement commence à true car on vérifie le token au montage
  });

  /**
   * Réinitialise l'état d'authentification local sans requêtes réseau supplémentaires.
   */
  const reinitialiserEtatLocal = useCallback(() => {
    setEtat({ 
      utilisateur: null,      // Plus d'utilisateur
      estAuthentifie: false,  // Plus connecté
      chargement: false       // Pas de chargement en cours
    });
  }, []);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : deconnexion
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Déconnecte l'utilisateur actuel.
   * 
   * Effectue un appel POST à l'API /logout/ pour effacer et blacklister les cookies.
   */
  const deconnexion = useCallback(async () => {
    try {
      await fetchWithAuth("/logout/", { method: "POST" });
    } catch (err) {
      console.error("Erreur lors de la déconnexion backend:", err);
    }
    reinitialiserEtatLocal();
  }, [reinitialiserEtatLocal]);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : recupererUtilisateur
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Récupère les données de l'utilisateur depuis l'API.
   * 
   * Cette fonction est appelée :
   * - Au montage du composant (si un token existe)
   * - Après une connexion réussie
   * - Après une inscription réussie
   * 
   * Elle utilise le token JWT stocké pour s'authentifier auprès du serveur.
   */
  const recupererUtilisateur = useCallback(async () => {
    try {
      // Appel à l'API avec authentification automatique
      const response = await fetchWithAuth("/utilisateurs/me/");
      
      if (response.ok) { // Code HTTP 2xx
        const raw = await response.json(); // Parse le JSON de la réponse
        setEtat({ 
          utilisateur: normaliserUtilisateur(raw), // Normalise les données
          estAuthentifie: true, 
          chargement: false 
        });
        return true; // Succès
      }
    } catch (erreur) {
      // Log l'erreur pour le débogage (visible dans la console du navigateur)
      console.error("Échec de la récupération de l'utilisateur:", erreur);
    }
    
    // En cas d'erreur, on garde l'état actuel mais on arrête le chargement
    setEtat((prev) => ({ ...prev, chargement: false }));
    return false; // Échec
  }, []); // Pas de dépendances = fonction constante
  
  // ─────────────────────────────────────────────────────────────────────────────
  // EFFET : Vérification du token au montage
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Cet effet s'exécute une fois au montage du composant.
   * 
   * OBJECTIF :
   * - Tenter de récupérer l'utilisateur via les cookies HttpOnly (si une session existe)
   * - Écouter l'événement de déconnexion forcée (token expiré)
   */
  useEffect(() => {
    // Tente de récupérer l'utilisateur connecté via les cookies de session.
    void recupererUtilisateur();
    
    // ─── ÉCOUTE DE L'ÉVÉNEMENT DE DÉCONNEXION ────────────────────────────────
    // Cet événement est émis par api.js quand le refresh token a expiré
    const handleLogout = () => reinitialiserEtatLocal();
    window.addEventListener("app:logout", handleLogout);
    
    // ─── FONCTION DE NETTOYAGE ───────────────────────────────────────────────
    // Retournée par useEffect, elle s'exécute quand le composant est démonté
    // Cela évite les fuites de mémoire (memory leaks)
    return () => window.removeEventListener("app:logout", handleLogout);
  }, [recupererUtilisateur, reinitialiserEtatLocal]); // Dépendances : recréer si ces fonctions changent
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : connexion
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Connecte un utilisateur avec son email et mot de passe.
   * 
   * @param {string} email - L'adresse email de l'utilisateur
   * @param {string} motDePasse - Le mot de passe de l'utilisateur
   * @returns {Promise<boolean>} - true si connexion réussie, false sinon
   */
  const connexion = useCallback(async (email, motDePasse) => {
    console.log("[useAuth] Tentative de connexion...");
    
    if (!email || !motDePasse) {
      console.log("[useAuth] Email ou mot de passe manquant, annulation.");
      return false;
    }
    
    setEtat((prev) => ({ ...prev, chargement: true }));
    
    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password: motDePasse }),
        credentials: "include"
      });
      
      if (response.ok) {
        console.log("[useAuth] API /token/ a répondu avec succès (200 OK) avec cookies HttpOnly.");
        return await recupererUtilisateur();
      } else {
        console.log(`[useAuth] Échec de la connexion. Statut HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error("Erreur de connexion:", err);
    }
    
    setEtat((prev) => ({ ...prev, chargement: false }));
    return false;
  }, [recupererUtilisateur]); // Dépend de recupererUtilisateur
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : inscription
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Crée un nouveau compte utilisateur.
   * 
   * @param {object} donnees - Les données du formulaire d'inscription
   *   - email: string
   *   - password: string
   *   - firstName: string
   *   - lastName: string
   *   - birthDate: string (optionnel)
   *   - educationLevel: string (optionnel)
   *   - classe: string (optionnel)
   *   - preferredGenres: string[] (optionnel)
   *   - sous_genre_prefere: string[] (optionnel)
   *   - intentions: string[] (optionnel)
   * 
   * @returns {Promise<{success: boolean, errors?: object}>}
   * 
   * FLUX :
   * 1. Prépare les données au format attendu par Django
   * 2. Envoie la requête POST à /utilisateurs/
   * 3. Si succès : connecte automatiquement l'utilisateur
   * 4. Retourne le résultat (succès ou erreurs)
   */
  const inscription = useCallback(async (donnees) => {
    console.log("[useAuth] Lancement du processus d'inscription...");
    setEtat((prev) => ({ ...prev, chargement: true }));
    
    try {
      // ─── PRÉPARATION DES DONNÉES (PAYLOAD) ─────────────────────────────────
      // Le payload doit correspondre aux champs attendus par le sérialiseur Django
      const payload = {
        // username = email (unicité garantie)
        username: donnees.email,
        email: donnees.email,
        password: donnees.password,
        
        // Informations personnelles
        prenom: donnees.firstName || "",
        nom: donnees.lastName || "",
        type_compte: "non_membre", // Par défaut, pas encore membre payant
        date_naissance: donnees.birthDate || null,
        niveau_etude: donnees.educationLevel || null,
        classe: donnees.classe || null,
        
        // Préférences (tableaux JSON)
        preferredGenres: Array.isArray(donnees.preferredGenres) ? donnees.preferredGenres : [],
        sous_genre_prefere: Array.isArray(donnees.sous_genre_prefere) ? donnees.sous_genre_prefere : [],
        intentions: Array.isArray(donnees.intentions) ? donnees.intentions : []
      };
      
      // ─── ENVOI DE LA REQUÊTE ───────────────────────────────────────────────
      const response = await fetch(`${API_BASE_URL}/utilisateurs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) { // Code 201 Created
        console.log("[useAuth] Inscription réussie côté backend (201 Created). Connexion automatique...");
        
        // ─── CONNEXION AUTOMATIQUE ───────────────────────────────────────────
        // Après inscription, on connecte directement l'utilisateur
        await connexion(donnees.email, donnees.password);
        return { success: true };
      } else {
        // ─── GESTION DES ERREURS ─────────────────────────────────────────────
        const errData = await response.json();
        console.warn("[useAuth] Le backend a refusé l'inscription. Erreurs reçues:", errData);
        
        // Si le username (= email) est déjà pris, on le signale comme erreur email
        if (errData.username && !errData.email) {
          errData.email = errData.username;
        }
        
        setEtat((prev) => ({ ...prev, chargement: false }));
        return { success: false, errors: errData };
      }
    } catch (err) {
      console.error("Erreur lors de l'inscription:", err);
      setEtat((prev) => ({ ...prev, chargement: false }));
      return { success: false, errors: { detail: err.message } };
    }
  }, [connexion]); // Dépend de la fonction connexion

  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : verifierEmail
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Vérifie si un email est déjà utilisé dans la base de données.
   * 
   * Utilisée pendant l'inscription pour éviter les doublons
   * et proposer de se connecter si le compte existe déjà.
   * 
   * @param {string} email - L'email à vérifier
   * @returns {Promise<boolean>} - true si l'email existe, false sinon
   */
  const verifierEmail = useCallback(async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/utilisateurs/check-email/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.exists; // true ou false
      }
      return false; // En cas d'erreur, on suppose que l'email n'existe pas
    } catch (err) {
      console.error("Erreur lors de la vérification de l'email:", err);
      return false;
    }
  }, []); // Pas de dépendances

  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : mettreAJourUtilisateur
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Met à jour les informations du profil utilisateur.
   * 
   * @param {object} updates - Les champs à modifier
   *   Exemple : { prenom: "Jean", genresPreferes: ["Roman", "Policier"] }
   * 
   * @returns {Promise<boolean>} - true si mise à jour réussie, false sinon
   * 
   * Note : Cette fonction utilise PATCH (mise à jour partielle)
   * et non PUT (remplacement complet).
   */
  const mettreAJourUtilisateur = useCallback(async (updates) => {
    // Vérification de sécurité : on ne peut pas modifier si pas connecté
    if (!etat.utilisateur) return false;
    
    try {
      // Convertit les noms de champs frontend en noms backend
      const body = denormaliserMisesAJour(updates);
      
      // Envoi de la requête PATCH
      const response = await fetchWithAuth("/utilisateurs/me/update/", {
        method: "PATCH", // PATCH = mise à jour partielle
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        // Met à jour l'état local avec les nouvelles données
        const raw = await response.json();
        setEtat((prev) => ({ 
          ...prev, 
          utilisateur: normaliserUtilisateur(raw) 
        }));
        return true;
      } else {
        // Log de l'erreur pour le débogage
        const errText = await response.text();
        console.error("Erreur PATCH user:", errText);
        return false;
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", err);
      return false;
    }
  }, [etat.utilisateur]); // Dépend de l'utilisateur actuel
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION : changerMotDePasse
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Change le mot de passe de l'utilisateur.
   * 
   * @param {string} ancienMotDePasse - Le mot de passe actuel (pour vérification)
   * @param {string} nouveauMotDePasse - Le nouveau mot de passe souhaité
   * @returns {Promise<boolean>} - true si changement réussi, false sinon
   * 
   * Note : L'ancien mot de passe est requis pour des raisons de sécurité.
   * Cela empêche quelqu'un qui aurait accès à la session de changer le mot de passe.
   */
  const changerMotDePasse = useCallback(async (ancienMotDePasse, nouveauMotDePasse) => {
    try {
      const response = await fetchWithAuth("/utilisateurs/me/change-password/", {
        method: "POST",
        body: JSON.stringify({ 
          old_password: ancienMotDePasse, // Django attend old_password
          new_password: nouveauMotDePasse  // Django attend new_password
        })
      });
      return response.ok; // true si code 2xx, false sinon
    } catch (err) {
      console.error("Erreur changement mot de passe:", err);
      return false;
    }
  }, []); // Pas de dépendances
  
  // ─────────────────────────────────────────────────────────────────────────────
  // VALEUR DE RETOUR DU HOOK
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Retourne un objet avec toutes les données et fonctions du hook.
   * 
   * L'opérateur spread "...etat" copie toutes les propriétés de l'état
   * (utilisateur, estAuthentifie, chargement) dans l'objet retourné.
   */
  return {
    ...etat, // utilisateur, estAuthentifie, chargement
    connexion,
    inscription,
    verifierEmail,
    deconnexion,
    mettreAJourUtilisateur,
    changerMotDePasse
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALIAS : useAuth (nom court)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Alias pour useAuthentification.
 * 
 * Certains développeurs préfèrent le nom court "useAuth".
 * Les deux sont équivalents et peuvent être utilisés de façon interchangeable.
 * 
 * Utilisation :
 * import { useAuth } from "@/hooks/useAuthentification";
 * // ou
 * import { useAuthentification } from "@/hooks/useAuthentification";
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const auth = useProvideAuthentification();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuthentification() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuthentification must be used within AuthProvider");
  }
  return context;
}

export const useAuth = useAuthentification;
