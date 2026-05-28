/**
 * =============================================================================
 * MODULE API (api.js) - Communication Frontend ↔ Backend
 * =============================================================================
 * 
 * Ce fichier est le "traducteur" entre votre application React (frontend)
 * et le serveur Django (backend). Toutes les communications passent par ici !
 * 
 * QU'EST-CE QU'UNE API ?
 * - API = Application Programming Interface (Interface de programmation)
 * - C'est un ensemble de règles pour communiquer avec un serveur
 * - On envoie des "requêtes" et on reçoit des "réponses"
 * - Format standard : JSON (JavaScript Object Notation)
 * 
 * COMMENT ÇA MARCHE (exemple de connexion) :
 * 1. L'utilisateur clique sur "Se connecter"
 * 2. Ce fichier envoie une requête HTTP POST à /api/token/ avec email + password
 * 3. Le serveur vérifie les identifiants
 * 4. Si OK : le serveur renvoie un token JWT
 * 5. Ce token est stocké et envoyé avec chaque future requête
 * 
 * QU'EST-CE QU'UN TOKEN JWT ?
 * - JWT = JSON Web Token
 * - C'est comme un "badge d'accès" numérique crypté
 * - Il contient l'identité de l'utilisateur
 * - Il a une durée de vie limitée (expiration)
 * - Il y a 2 types :
 *   - Access Token : courte durée (~15 min), utilisé pour les requêtes
 *   - Refresh Token : longue durée (~7 jours), utilisé pour renouveler l'access
 * 
 * SÉCURITÉ :
 * - Les tokens sont stockés en mémoire (variables JS), pas en localStorage
 * - Pourquoi ? localStorage est accessible par tous les scripts de la page (risque XSS)
 * - La mémoire est effacée quand on ferme l'onglet (plus sécurisé)
 * - Inconvénient : déconnexion au rechargement de page (mais on peut rafraîchir)
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONFIGURATION - Paramètres de base de l'API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * URL de base de l'API backend.
 * 
 * import.meta.env.VITE_API_URL :
 * - import.meta.env donne accès aux variables d'environnement
 * - VITE_API_URL est définie dans le fichier .env (ou .env.local)
 * - Le préfixe VITE_ est obligatoire pour que Vite expose la variable
 * 
 * L'opérateur || (ou logique) :
 * - Si VITE_API_URL existe et n'est pas vide, on l'utilise
 * - Sinon, on utilise la valeur par défaut "http://localhost:8000/api"
 * 
 * En développement : http://localhost:8000/api (serveur Django local)
 * En production : https://votre-domaine.com/api
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION STOCKAGE DES TOKENS - Variables pour garder les tokens en mémoire
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Variables pour stocker les tokens JWT.
 * 
 * "let" permet de déclarer des variables qui peuvent être réassignées.
 * (contrairement à "const" qui crée des constantes)
 * 
 * Ces variables sont "privées" à ce module (pas exportées).
 * Seules les fonctions de ce fichier peuvent y accéder directement.
 */

/**
 * Token d'accès (Access Token)
 * 
 * - Courte durée de vie (~15 minutes généralement)
 * - Envoyé dans l'en-tête "Authorization" de chaque requête
 * - Format : "Bearer <token>" (standard OAuth 2.0)
 * - null = pas de token = utilisateur non connecté
 */
let authToken = null;

/**
 * Token de rafraîchissement (Refresh Token)
 * 
 * - Longue durée de vie (~7 jours généralement)
 * - Utilisé uniquement pour obtenir un nouveau access token
 * - Ne doit JAMAIS être envoyé avec les requêtes normales
 * - null = pas de token = utilisateur non connecté
 */
let refreshToken = null;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FONCTIONS EXPORTÉES - Accessible depuis d'autres fichiers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * setAuthTokens : Stocke les tokens après une connexion réussie.
 * 
 * Cette fonction est appelée après :
 * - Une connexion réussie (login)
 * - Un rafraîchissement de token réussi
 * 
 * @param {string} access - Le nouveau token d'accès
 * @param {string} refresh - Le nouveau token de rafraîchissement
 * 
 * Le mot-clé "export" rend cette fonction importable dans d'autres fichiers.
 */
export function setAuthTokens(access, refresh) {
  // Affecte les nouvelles valeurs aux variables du module
  authToken = access;      // Ex: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  refreshToken = refresh;  // Ex: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

/**
 * clearAuthTokens : Supprime les tokens (déconnexion).
 * 
 * Cette fonction est appelée quand :
 * - L'utilisateur se déconnecte volontairement
 * - Le refresh token a expiré (session terminée)
 * - Une erreur d'authentification grave survient
 */
export function clearAuthTokens() {
  // Remet les variables à null (état "non connecté")
  authToken = null;
  refreshToken = null;
}

/**
 * getAuthToken : Récupère le token d'accès actuel.
 * 
 * Utile pour :
 * - Vérifier si l'utilisateur est connecté (token !== null)
 * - Accéder au token depuis d'autres parties de l'application
 * 
 * @returns {string|null} Le token d'accès ou null si non connecté
 */
export function getAuthToken() {
  return authToken;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FONCTIONS INTERNES - Non exportées, usage interne uniquement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * rafraichirToken : Obtient un nouveau token d'accès.
 * 
 * QUAND EST-ELLE APPELÉE ?
 * - Automatiquement quand une requête reçoit une erreur 401 (Unauthorized)
 * - Cela signifie que le token d'accès a expiré
 * 
 * COMMENT ÇA MARCHE ?
 * 1. On envoie le refresh token au serveur
 * 2. Le serveur vérifie que le refresh token est valide
 * 3. Si OK : on reçoit un nouveau token d'accès
 * 4. Si NOK : on déconnecte l'utilisateur (session expirée)
 * 
 * "async" devant une fonction signifie qu'elle retourne une Promise.
 * Cela permet d'utiliser "await" à l'intérieur pour attendre des opérations.
 * 
 * @returns {Promise<string|null>} Le nouveau token ou null si échec
 */
async function rafraichirToken() {
  /**
   * Vérification préalable : a-t-on un refresh token ?
   * Si non, inutile de continuer - l'utilisateur n'était pas connecté.
   */
  if (!refreshToken) return null;
  
  /**
   * Bloc try/catch : gestion des erreurs.
   * 
   * - try : on "essaie" d'exécuter le code
   * - catch : si une erreur survient, on la "capture" et on la gère
   * - Cela évite que l'application "plante" en cas d'erreur
   */
  try {
    /**
     * Appel à l'endpoint de rafraîchissement.
     * 
     * fetch() est la fonction native du navigateur pour les requêtes HTTP.
     * Elle retourne une Promise qu'on attend avec "await".
     * 
     * Les backticks ` ` permettent d'insérer des variables avec ${...}
     * C'est appelé "template literal" ou "template string".
     */
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",                              // Type de requête HTTP
      headers: { "Content-Type": "application/json" }, // Format des données
      body: JSON.stringify({ refresh: refreshToken })  // Données envoyées
    });
    
    /**
     * Vérification de la réponse.
     * 
     * response.ok est true si le code HTTP est entre 200 et 299 (succès).
     * Codes courants :
     * - 200 OK : succès
     * - 401 Unauthorized : non autorisé (token invalide/expiré)
     * - 500 Internal Server Error : erreur serveur
     */
    if (response.ok) {
      /**
       * Lecture du corps de la réponse en JSON.
       * 
       * response.json() retourne une Promise qui résout en objet JavaScript.
       * On attend (await) pour obtenir l'objet directement.
       */
      const data = await response.json();
      
      /**
       * Mise à jour du token d'accès.
       * On garde le même refresh token (il n'a pas changé).
       */
      setAuthTokens(data.access, refreshToken);
      
      // Retourne le nouveau token pour que l'appelant puisse l'utiliser
      return data.access;
    }
  } catch (err) {
    /**
     * Gestion des erreurs réseau ou autres.
     * 
     * console.error() affiche l'erreur dans la console du navigateur.
     * C'est utile pour le débogage mais invisible pour l'utilisateur.
     */
    console.error("Erreur rafraîchissement token:", err);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ÉCHEC DU RAFRAÎCHISSEMENT - Déconnexion de l'utilisateur
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Si on arrive ici, le rafraîchissement a échoué.
   * Raisons possibles :
   * - Refresh token expiré (session trop ancienne)
   * - Refresh token révoqué (déconnexion depuis un autre appareil)
   * - Erreur serveur
   */
  
  // Supprime les tokens invalides
  clearAuthTokens();
  
  /**
   * Émet un événement personnalisé pour notifier l'application.
   * 
   * Les événements personnalisés permettent de communiquer entre
   * différentes parties de l'application sans dépendances directes.
   * 
   * Le hook useAuthentification écoute cet événement et met à jour l'état.
   */
  window.dispatchEvent(new CustomEvent("app:logout"));
  
  // Retourne null pour indiquer l'échec
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : fetchWithAuth
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * fetchWithAuth : Effectue une requête HTTP avec authentification automatique.
 * 
 * C'EST LA FONCTION PRINCIPALE À UTILISER POUR COMMUNIQUER AVEC L'API !
 * 
 * Elle fait tout le travail "magique" :
 * - Ajoute automatiquement le token JWT dans les en-têtes
 * - Gère les erreurs 401 en rafraîchissant le token
 * - Réessaie en cas d'erreur réseau temporaire
 * 
 * @param {string} endpoint - L'URL de l'endpoint (ex: "/livres/", "/users/me/")
 * @param {object} options - Options de la requête fetch (method, body, headers)
 * @param {number} retries - Nombre de tentatives restantes en cas d'erreur réseau
 * @returns {Promise<Response>} La réponse HTTP
 * 
 * EXEMPLES D'UTILISATION :
 * 
 * // Requête GET (récupérer des données)
 * const response = await fetchWithAuth("/livres/");
 * const livres = await response.json();
 * 
 * // Requête POST (envoyer des données)
 * const response = await fetchWithAuth("/emprunts/", {
 *   method: "POST",
 *   body: JSON.stringify({ livre_id: 42 })
 * });
 * 
 * // Requête PUT (modifier des données)
 * const response = await fetchWithAuth("/users/me/", {
 *   method: "PUT",
 *   body: JSON.stringify({ prenom: "Jean" })
 * });
 * 
 * // Requête DELETE (supprimer des données)
 * const response = await fetchWithAuth("/favoris/42/", {
 *   method: "DELETE"
 * });
 */
export async function fetchWithAuth(endpoint, options = {}, retries = 1) {
  /**
   * Récupère le token actuel.
   * On le stocke dans une constante locale pour éviter les problèmes
   * de synchronisation si le token change pendant la requête.
   */
  const token = authToken;
  
  /**
   * Construction de l'URL complète.
   * 
   * endpoint.startsWith("http") vérifie si l'endpoint est déjà une URL complète.
   * - Si oui : on l'utilise telle quelle
   * - Si non : on la préfixe avec API_BASE_URL
   * 
   * L'opérateur ternaire "condition ? siVrai : siFaux" est comme un if/else compact.
   */
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION INTERNE : sendRequest - Effectue la requête HTTP
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Fonction interne qui effectue réellement la requête.
   * 
   * @param {string} tokenActuel - Le token à utiliser pour cette requête
   * @returns {Promise<Response>} La réponse HTTP
   */
  const sendRequest = async (tokenActuel) => {
    /**
     * Construction des en-têtes HTTP.
     * 
     * L'opérateur spread "..." copie toutes les propriétés d'un objet.
     * Cela permet de fusionner plusieurs objets en un seul.
     * 
     * L'ordre est important : les propriétés plus tard écrasent les précédentes.
     */
    const headers = {
      "Content-Type": "application/json",  // Format des données envoyées
      ...options.headers,                   // En-têtes personnalisés (si fournis)
      /**
       * Ajout conditionnel du token.
       * 
       * tokenActuel ? {...} : {} signifie :
       * - Si tokenActuel existe : ajouter l'en-tête Authorization
       * - Sinon : ajouter un objet vide (rien)
       */
      ...(tokenActuel ? { "Authorization": `Bearer ${tokenActuel}` } : {})
    };
    
    /**
     * Bloc try/catch pour gérer les erreurs réseau.
     */
    try {
      /**
       * Appel fetch() avec toutes les options.
       * 
       * { ...options, headers } crée un nouvel objet avec :
       * - Toutes les options fournies (method, body, etc.)
       * - Les headers qu'on vient de construire (écrase les headers d'origine)
       */
      return await fetch(url, { ...options, headers });
    } catch (error) {
      /**
       * Gestion des erreurs réseau.
       * 
       * Si retries > 0, on réessaie après 1 seconde.
       * Cela gère les problèmes de connexion temporaires.
       */
      if (retries > 0) {
        // Message de warning dans la console (pour le débogage)
        console.warn(`Erreur réseau détectée, nouvelle tentative dans 1s (${retries} essai(s) restant(s))...`);
        
        /**
         * Attente de 1 seconde.
         * 
         * new Promise(resolve => setTimeout(resolve, 1000)) crée une promesse
         * qui se résout après 1000 millisecondes (1 seconde).
         * await met la fonction en pause pendant ce temps.
         */
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        /**
         * Appel récursif avec une tentative de moins.
         * La récursion s'arrête quand retries atteint 0.
         */
        return fetchWithAuth(endpoint, options, retries - 1);
      }
      
      /**
       * Plus de tentatives disponibles : on propage l'erreur.
       * "throw" lance une exception qui peut être capturée par l'appelant.
       */
      throw error;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // EXÉCUTION DE LA REQUÊTE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Déclaration de la variable qui contiendra la réponse.
   * "let" car elle sera assignée dans le try/catch.
   */
  let response;
  
  try {
    // Exécute la requête avec le token actuel
    response = await sendRequest(token);
  } catch (error) {
    // Si l'erreur n'a pas été gérée dans sendRequest, on la propage
    throw error;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GESTION DE L'ERREUR 401 (Token expiré)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Vérification du code de statut HTTP.
   * 
   * 401 Unauthorized signifie que le token n'est plus valide.
   * On tente alors de le rafraîchir et de réessayer la requête.
   */
  if (response && response.status === 401) {
    // Tente de rafraîchir le token
    const nouveauToken = await rafraichirToken();
    
    if (nouveauToken) {
      /**
       * Rafraîchissement réussi : réessaie la requête avec le nouveau token.
       * 
       * Appel récursif à fetchWithAuth pour réexécuter la même requête
       * mais cette fois avec le nouveau token.
       */
      return fetchWithAuth(endpoint, { ...options }, 1);
    }
    
    // Si le rafraîchissement a échoué, rafraichirToken() a déjà
    // appelé clearAuthTokens() et émis l'événement de déconnexion
  }
  
  // Retourne la réponse (succès ou erreur autre que 401)
  return response;
}
