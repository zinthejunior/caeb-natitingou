const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
let authToken = null;
let refreshToken = null;

export function setAuthTokens(access, refresh) {
  authToken = access;
  refreshToken = refresh;
}

export function clearAuthTokens() {
  authToken = null;
  refreshToken = null;
}

export function getAuthToken() {
  return authToken;
}

async function rafraichirToken() {
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken })
    });
    if (response.ok) {
      const data = await response.json();
      setAuthTokens(data.access, refreshToken);
      return data.access;
    }
  } catch (err) {
    console.error("Erreur rafraîchissement token:", err);
  }
  clearAuthTokens();
  window.dispatchEvent(new CustomEvent("app:logout"));
  return null;
}

export async function fetchWithAuth(endpoint, options = {}, retries = 1) {
  const token = authToken;
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const sendRequest = async (tokenActuel) => {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...tokenActuel ? { "Authorization": `Bearer ${tokenActuel}` } : {}
    };
    try {
      return await fetch(url, { ...options, headers });
    } catch (error) {
      if (retries > 0) {
        console.warn(`Erreur réseau détectée, nouvelle tentative dans 1s (${retries} essai(s) restant(s))...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithAuth(endpoint, options, retries - 1);
      }
      throw error;
    }
  };

  let response;
  try {
    response = await sendRequest(token);
  } catch (error) {
    throw error;
  }

  if (response && response.status === 401) {
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) {
      return fetchWithAuth(endpoint, { ...options }, 1);
    }
  }
  return response;
}
