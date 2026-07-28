/**
 * =============================================================================
 * CONFIGURATION CENTRALISÉE DES URLs (config.js)
 * =============================================================================
 *
 * Ce module centralise TOUTES les URLs externes de l'application afin d'éviter
 * les liens en dur (localhost) qui cassent en production.
 *
 * Principe :
 * - En développement (`import.meta.env.DEV`), on cible les serveurs locaux.
 * - En production (`import.meta.env.PROD`), on utilise les URLs déployées.
 * - Chaque valeur reste surchargeable via une variable d'environnement Vite
 *   (VITE_API_URL, VITE_MEDIA_URL, VITE_KOSSI_UI_URL / VITE_KOSSI_URL).
 *
 * Ainsi, même si aucune variable d'environnement n'est configurée sur Vercel,
 * l'application pointe automatiquement vers les bons services en production.
 * =============================================================================
 */

const IS_PROD = import.meta.env.PROD;

// URLs de production déployées (valeurs de repli sûres).
const PROD_API_URL = "https://caeb-backend.onrender.com/api";
const PROD_KOSSI_URL = "https://kossi-chat.vercel.app";

// URLs de développement local.
const DEV_API_URL = "http://localhost:8080/api";
const DEV_KOSSI_URL = "http://localhost:3000";

function sanitizeUrl(envVal, defaultProd, defaultDev) {
  if (envVal) {
    if (IS_PROD && (envVal.includes("localhost") || envVal.includes("127.0.0.1"))) {
      return defaultProd;
    }
    return envVal;
  }
  return IS_PROD ? defaultProd : defaultDev;
}

/**
 * URL de base de l'API backend (Django).
 */
export const API_BASE_URL = sanitizeUrl(
  import.meta.env.VITE_API_URL,
  PROD_API_URL,
  DEV_API_URL
);

/**
 * Origine du backend pour les média/statiques.
 */
export const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_URL || API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * URL de l'interface de l'assistant IA Kossi.
 */
export const KOSSI_URL = sanitizeUrl(
  import.meta.env.VITE_KOSSI_UI_URL || import.meta.env.VITE_KOSSI_URL,
  PROD_KOSSI_URL,
  DEV_KOSSI_URL
);

/**
 * Construit une URL complète vers un fichier média du backend.
 * @param {string} src Chemin renvoyé par l'API (ex: "/media/photo.jpg")
 * @returns {string} URL absolue (ou l'entrée telle quelle si déjà absolue)
 */
export function buildMediaUrl(src) {
  if (!src) return src;
  if (src.startsWith("/media/") || src.startsWith("/static/")) {
    return `${MEDIA_BASE_URL}${src}`;
  }
  return src;
}
