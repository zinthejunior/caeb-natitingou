const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
async function rafraichirToken() {
  const refreshToken = localStorage.getItem("caeb_refresh");
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken })
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("caeb_token", data.access);
      return data.access;
    }
  } catch (err) {
    console.error("Erreur rafraîchissement token:", err);
  }
  localStorage.removeItem("caeb_token");
  localStorage.removeItem("caeb_refresh");
  window.dispatchEvent(new CustomEvent("app:logout"));
  return null;
}
export async function fetchWithAuth(endpoint, options = {}, retries = 1) {
  let token = localStorage.getItem("caeb_token");
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
      // Si une erreur réseau se produit (ex: ERR_NETWORK_CHANGED)
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
    throw error; // L'erreur finale après les réessais
  }

  if (response && response.status === 401) {
    const nouveauToken = await rafraichirToken();
    if (nouveauToken) {
      // Pour la tentative avec le nouveau token, on repart avec 1 retry
      return fetchWithAuth(endpoint, { ...options }, 1);
    }
  }
  return response;
}
