/**
 * api.ts - Utilitaire central pour les appels API authentifiés avec rafraîchissement automatique du token.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Rafraîchit le token d'accès en utilisant le refresh token stocké.
 */
async function rafraichirToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('caeb_refresh');
  if (!refreshToken) return null;
 
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('caeb_token', data.access);
      return data.access;
    }
  } catch (err) {
    console.error('Erreur rafraîchissement token:', err);
  }
  
  // Si le rafraîchissement échoue, on nettoie tout
  localStorage.removeItem('caeb_token');
  localStorage.removeItem('caeb_refresh');
  window.dispatchEvent(new CustomEvent('app:logout'));
  return null;
}

/**
 * Effectue une requête fetch avec authentification Bearer.
 * Tente de rafraîchir le token automatiquement en cas d'erreur 401.
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem('caeb_token');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const sendRequest = (tokenActuel: string | null) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(tokenActuel ? { 'Authorization': `Bearer ${tokenActuel}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  let response = await sendRequest(token);
  
  if (response.status === 401) {
    // Si on a un 401, on tente une seule fois de rafraîchir le token
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) {
      response = await sendRequest(nouveauToken);
    }
  }
  
  return response;
}