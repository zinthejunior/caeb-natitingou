import { useState, useCallback, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
function normaliserUtilisateur(raw) {
  return {
    ...raw,
    prenom: raw.prenom || raw.firstName || "",
    nom: raw.nom || raw.lastName || "",
    firstName: raw.firstName || raw.prenom || "",
    lastName: raw.lastName || raw.nom || "",
    estMembre: raw.estMembre ?? raw.isMember ?? raw.type_compte === "membre",
    isMember: raw.isMember ?? raw.estMembre ?? raw.type_compte === "membre",
    estEnAttente: raw.type_compte === "en_attente",
    date_inscription: raw.date_inscription || raw.createdAt || "",
    createdAt: raw.createdAt || raw.date_inscription || "",
    date_naissance: raw.date_naissance || "",
    genresPreferes: raw.preferredGenres || (raw.genre_prefere ? Array.isArray(raw.genre_prefere) ? raw.genre_prefere : raw.genre_prefere.split(",").filter(Boolean) : []),
    preferredGenres: raw.preferredGenres || (raw.genre_prefere ? Array.isArray(raw.genre_prefere) ? raw.genre_prefere : raw.genre_prefere.split(",").filter(Boolean) : []),
    favoris: raw.favorites ?? [],
    intentions: raw.intentions ?? [],
    clubsSuivis: raw.followedClubs ?? [],
    stats: raw.stats ?? { livresLus: 0, avisPublies: 0, clubsRejoints: 0, evenementsParticipes: 0 }
  };
}
function denormaliserMisesAJour(updates) {
  const out = { ...updates };
  if ("prenom" in updates) {
    out["first_name"] = updates.prenom;
  }
  if ("nom" in updates) {
    out["last_name"] = updates.nom;
  }
  if ("genresPreferes" in updates && Array.isArray(updates.genresPreferes)) {
    out["genre_prefere"] = updates.genresPreferes.join(",");
  }
  delete out["prenom"];
  delete out["nom"];
  delete out["genresPreferes"];
  delete out["estMembre"];
  delete out["stats"];
  delete out["clubsSuivis"];
  delete out["favoris"];
  return out;
}
export function useAuthentification() {
  const [etat, setEtat] = useState({
    utilisateur: null,
    estAuthentifie: false,
    chargement: true
  });
  const deconnexion = useCallback(() => {
    localStorage.removeItem("caeb_token");
    localStorage.removeItem("caeb_refresh");
    setEtat({ utilisateur: null, estAuthentifie: false, chargement: false });
  }, []);
  const recupererUtilisateur = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/utilisateurs/me/");
      if (response.ok) {
        const raw = await response.json();
        setEtat({ utilisateur: normaliserUtilisateur(raw), estAuthentifie: true, chargement: false });
        return true;
      }
    } catch (erreur) {
      console.error("Échec de la récupération de l'utilisateur:", erreur);
    }
    setEtat((prev) => ({ ...prev, chargement: false }));
    return false;
  }, []);
  useEffect(() => {
    const token = localStorage.getItem("caeb_token");
    if (token) {
      void recupererUtilisateur();
    } else {
      setEtat((prev) => ({ ...prev, chargement: false }));
    }
    const handleLogout = () => deconnexion();
    window.addEventListener("app:logout", handleLogout);
    return () => window.removeEventListener("app:logout", handleLogout);
  }, [recupererUtilisateur, deconnexion]);
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
        body: JSON.stringify({ username: email, password: motDePasse })
      });
      if (response.ok) {
        console.log("[useAuth] API /token/ a répondu avec succès (200 OK). Jetons reçus.");
        const data = await response.json();
        localStorage.setItem("caeb_token", data.access);
        localStorage.setItem("caeb_refresh", data.refresh);
        return await recupererUtilisateur();
      } else {
        console.log(`[useAuth] Échec de la connexion. Statut HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error("Erreur de connexion:", err);
    }
    setEtat((prev) => ({ ...prev, chargement: false }));
    return false;
  }, [recupererUtilisateur]);
  const inscription = useCallback(async (donnees) => {
    console.log("[useAuth] Lancement du processus d'inscription...");
    setEtat((prev) => ({ ...prev, chargement: true }));
    try {
      const payload = {
        username: donnees.email,
        email: donnees.email,
        password: donnees.password,
        prenom: donnees.firstName,
        nom: donnees.lastName,
        type_compte: "non_membre",
        date_naissance: donnees.birthDate || null,
        niveau_etude: donnees.educationLevel || null,
        classe: donnees.classe || null,
        genre_prefere: Array.isArray(donnees.preferredGenres) ? donnees.preferredGenres.join(",") : "",
        intentions: donnees.intentions || [],
        profil_complet: true
      };
      const response = await fetch(`${API_BASE_URL}/utilisateurs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        console.log("[useAuth] Inscription réussie côté backend (201 Created). Connexion automatique...");
        await connexion(donnees.email, donnees.password);
        return { success: true };
      } else {
        const errData = await response.json();
        console.warn("[useAuth] Le backend a refusé l'inscription (Ex: email/username déjà pris). Erreurs:", errData);
        setEtat((prev) => ({ ...prev, chargement: false }));
        return { success: false, errors: errData };
      }
    } catch (err) {
      console.error("Erreur lors de l'inscription:", err);
      setEtat((prev) => ({ ...prev, chargement: false }));
      return { success: false, errors: { detail: err.message } };
    }
  }, [connexion]);

  const verifierEmail = useCallback(async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/utilisateurs/check-email/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        const data = await response.json();
        return data.exists;
      }
      return false;
    } catch (err) {
      console.error("Erreur lors de la vérification de l'email:", err);
      return false;
    }
  }, []);

  const mettreAJourUtilisateur = useCallback(async (updates) => {
    if (!etat.utilisateur) return false;
    try {
      const body = denormaliserMisesAJour(updates);
      const response = await fetchWithAuth("/utilisateurs/me/update/", {
        method: "PATCH",
        body: JSON.stringify(body)
      });
      if (response.ok) {
        const raw = await response.json();
        setEtat((prev) => ({ ...prev, utilisateur: normaliserUtilisateur(raw) }));
        return true;
      } else {
        const errText = await response.text();
        console.error("Erreur PATCH user:", errText);
        return false;
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", err);
      return false;
    }
  }, [etat.utilisateur]);
  const changerMotDePasse = useCallback(async (ancienMotDePasse, nouveauMotDePasse) => {
    try {
      const response = await fetchWithAuth("/utilisateurs/me/change-password/", {
        method: "POST",
        body: JSON.stringify({ old_password: ancienMotDePasse, new_password: nouveauMotDePasse })
      });
      return response.ok;
    } catch (err) {
      console.error("Erreur changement mot de passe:", err);
      return false;
    }
  }, []);
  return {
    ...etat,
    connexion,
    inscription,
    verifierEmail,
    deconnexion,
    mettreAJourUtilisateur,
    changerMotDePasse
  };
}
export const useAuth = useAuthentification;
