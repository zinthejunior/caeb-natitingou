/**
 * =============================================================================
 * MODULE API (api.js) - Communication Frontend ↔ Backend (Cookies HttpOnly)
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
 * COMMENT ÇA MARCHE (avec cookies HttpOnly) :
 * 1. L'utilisateur clique sur "Se connecter"
 * 2. Ce fichier envoie une requête HTTP POST à /api/token/ avec email + password
 * 3. Le serveur vérifie les identifiants et définit deux cookies HttpOnly :
 *    - 'access' : Le jeton d'accès de courte durée (~24h)
 *    - 'refresh' : Le jeton de rafraîchissement de longue durée (~7 jours)
 * 4. Les cookies sont stockés de manière sécurisée par le navigateur
 * 5. Le navigateur envoie AUTOMATIQUEMENT ces cookies avec chaque requête grâce
 *    à l'option `credentials: "include"`.
 * 
 * SÉCURITÉ :
 * - Les cookies HttpOnly ne sont pas accessibles via le code JavaScript (XSS-safe).
 * - Plus besoin de stocker manuellement de tokens en mémoire ou dans le localStorage !
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION CONFIGURATION - Paramètres de base de l'API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * URL de base de l'API backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION FONCTIONS INTERNES - Usage interne uniquement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * rafraichirToken : Obtient un nouveau token d'accès via les cookies.
 * 
 * QUAND EST-ELLE APPELÉE ?
 * - Automatiquement quand une requête reçoit une erreur 401 (Unauthorized)
 * 
 * COMMENT ÇA MARCHE ?
 * 1. On envoie une requête POST à /token/refresh/ avec `credentials: "include"`
 * 2. Le serveur Django lit le cookie 'refresh' HttpOnly
 * 3. Si valide, le serveur met à jour les cookies 'access' et 'refresh'
 * 4. Si invalide, on déconnecte l'utilisateur (session expirée)
 * 
 * @returns {Promise<boolean>} true si le rafraîchissement a réussi, false sinon
 */
async function rafraichirToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include" // Nécessaire pour envoyer le cookie refresh et recevoir le nouveau cookie access
    });
    
    if (response.ok) {
      console.log("[api.js] Jeton rafraîchi avec succès via cookies HttpOnly.");
      return true;
    }
  } catch (err) {
    console.error("Erreur rafraîchissement token:", err);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // ÉCHEC DU RAFRAÎCHISSEMENT - Le rafraîchissement a échoué.
  // Ne pas forcer la déconnexion générale du site ; seul le bouton de logout
  // doit déclencher la déconnexion globale.
  // ─────────────────────────────────────────────────────────────────────────────
  console.warn("[api.js] Échec du rafraîchissement du jeton. Session invalide mais pas de déconnexion forcée.");
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE : fetchWithAuth
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * fetchWithAuth : Effectue une requête HTTP avec authentification automatique par cookies.
 * 
 * @param {string} endpoint - L'URL de l'endpoint (ex: "/livres/", "/users/me/")
 * @param {object} options - Options de la requête fetch (method, body, headers)
 * @param {number} retries - Nombre de tentatives restantes en cas d'erreur réseau
 * @returns {Promise<Response>} La réponse HTTP
 */
export async function fetchWithAuth(endpoint, options = {}, retries = 1) {
  // Construction de l'URL complète
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FONCTION INTERNE : sendRequest - Effectue la requête HTTP
  // ─────────────────────────────────────────────────────────────────────────────
  const sendRequest = async () => {
    const headers = {
      "Content-Type": "application/json",  // Format des données envoyées par défaut
      ...options.headers,                  // En-têtes personnalisés (si fournis)
    };
    
    try {
      // credentials: "include" est capital pour inclure les cookies de session avec la requête !
      return await fetch(url, { 
        ...options, 
        headers, 
        credentials: "include" 
      });
    } catch (error) {
      if (retries > 0) {
        console.warn(`Erreur réseau détectée, nouvelle tentative dans 1s (${retries} essai(s) restant(s))...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithAuth(endpoint, options, retries - 1);
      }
      throw error;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // EXÉCUTION DE LA REQUÊTE
  // ─────────────────────────────────────────────────────────────────────────────
  let response = await sendRequest();

  // ─────────────────────────────────────────────────────────────────────────────
  // GESTION DE L'ERREUR 401 (Token expiré)
  // ─────────────────────────────────────────────────────────────────────────────
  if (response && response.status === 401 && !endpoint.includes("logout")) {
    console.log("[api.js] Erreur 401 reçue. Tentative de rafraîchissement...");
    const succesRafraichissement = await rafraichirToken();
    
    if (succesRafraichissement) {
      // Réessai une seule fois avec le nouveau cookie
      return fetchWithAuth(endpoint, { ...options }, 0);
    }
  }
  
  return response;
}
