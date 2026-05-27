import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/api";
export async function appelAPI(endpoint, options = {}) {
  const response = await fetchWithAuth(endpoint, options);
  if (!response.ok) {
    const texteErreur = await response.text();
    throw new Error(`Erreur API ${response.status}: ${texteErreur}`);
  }
  if (response.status === 204) return null;
  return response.json();
}
export function useLivres() {
  const [livres, setLivres] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/livres/");
        setLivres(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des livres");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { livres, chargement, erreur };
}
export function useLivre(id) {
  const [livre, setLivre] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/livres/${id}/`);
        setLivre(donnees);
      } catch {
        setErreur("Erreur lors du chargement du livre");
      } finally {
        setChargement(false);
      }
    })();
  }, [id]);
  return { livre, chargement, erreur };
}
export function useClubs() {
  const [clubs, setClubs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/clubs/");
        setClubs(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des clubs");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { clubs, chargement, erreur };
}
export function useClub(id) {
  const [club, setClub] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/clubs/${id}/`);
        setClub(donnees);
      } catch {
        setErreur("Erreur lors du chargement du club");
      } finally {
        setChargement(false);
      }
    })();
  }, [id]);
  return { club, chargement, erreur };
}
export function useEvenements() {
  const [evenements, setEvenements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/evenements/");
        setEvenements(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des événements");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { evenements, chargement, erreur };
}
export function useEvenement(id) {
  const [evenement, setEvenement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/evenements/${id}/`);
        setEvenement(donnees);
      } catch {
        setErreur("Erreur lors du chargement de l'événement");
      } finally {
        setChargement(false);
      }
    })();
  }, [id]);
  return { evenement, chargement, erreur };
}
export function useActualites() {
  const [actualites, setActualites] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/actualites/");
        setActualites(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des actualités");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { actualites, chargement, erreur };
}
export function useArticleActualite(id) {
  const [article, setArticle] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/actualites/${id}/`);
        setArticle(donnees);
      } catch {
        setErreur("Erreur lors du chargement de l'actualité");
      } finally {
        setChargement(false);
      }
    })();
  }, [id]);
  return { article, chargement, erreur };
}
export function useAvis(livreId) {
  const [avis, setAvis] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const recupererAvis = async () => {
    try {
      setChargement(true);
      const pointEntree = livreId ? `/avis/?book=${livreId}` : "/avis/";
      const donnees = await appelAPI(pointEntree);
      setAvis(donnees.results || donnees);
    } catch {
      setErreur("Erreur lors du chargement des avis");
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => {
    void recupererAvis();
  }, [livreId]);
  return { avis, chargement, erreur, recharger: recupererAvis };
}
export function useEmprunts() {
  const [emprunts, setEmprunts] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/emprunts/");
        setEmprunts(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des emprunts");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { emprunts, chargement, erreur };
}
export function useReservations() {
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI("/reservations/");
        setReservations(donnees.results || donnees);
      } catch {
        setErreur("Erreur lors du chargement des réservations");
      } finally {
        setChargement(false);
      }
    })();
  }, []);
  return { reservations, chargement, erreur };
}
export function useRecommandations(humeur = "neutre") {
  const [recommandations, setRecommandations] = useState(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/recommandations/?humeur=${humeur}`);
        setRecommandations(donnees);
      } finally {
        setChargement(false);
      }
    })();
  }, [humeur]);
  return { recommandations, chargement };
}
export function useSessionsChat() {
  const [sessions, setSessions] = useState([]);
  const [chargement, setChargement] = useState(true);
  const recupererSessions = async () => {
    try {
      setChargement(true);
      const donnees = await appelAPI("/chat/");
      setSessions(donnees.results || donnees);
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => {
    void recupererSessions();
  }, []);
  return { sessions, chargement, recharger: recupererSessions };
}
export async function publierAvis(livreId, note, commentaire) {
  if (!livreId) throw new Error("ID du livre requis");
  if (note < 1 || note > 5) throw new Error("La note doit être entre 1 et 5");
  const res = await appelAPI("/avis/", {
    method: "POST",
    body: JSON.stringify({
      book: livreId,
      // champ principal
      bookId: livreId,
      // alias de compatibilité
      note,
      // champ principal
      rating: note,
      // alias de compatibilité
      commentaire,
      comment: commentaire
    })
  });
  if (res?.error || res?.detail) {
    const msg = res.error || res.detail || "Erreur lors de la publication";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res;
}
export async function reserverLivre(livreId) {
  return appelAPI("/reservations/", {
    method: "POST",
    body: JSON.stringify({ book: livreId })
  });
}
export async function rejoindreClub(clubId) {
  return appelAPI(`/clubs/${clubId}/join/`, { method: "POST" });
}
export async function quitterClub(clubId) {
  return appelAPI(`/clubs/${clubId}/leave/`, { method: "POST" });
}
export async function sinscrireEvenement(evenementId) {
  return appelAPI(`/evenements/${evenementId}/register/`, { method: "POST" });
}
export async function desinscrireEvenement(evenementId) {
  return appelAPI(`/evenements/${evenementId}/unregister/`, { method: "POST" });
}
export async function sinscrireEvenementDetaillee(evenementId, donnees) {
  return appelAPI("/participations-evenements/", {
    method: "POST",
    body: JSON.stringify({
      event: evenementId,
      ...donnees
    })
  });
}
export function useParticipationsEvenements() {
  const [participations, setParticipations] = useState([]);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    appelAPI("/participations-evenements/").then((data) => setParticipations(data)).catch((err) => console.error("Erreur participations:", err)).finally(() => setChargement(false));
  }, []);
  return { participations, chargement };
}
export async function inverserFavori(livreId) {
  return appelAPI(`/livres/${livreId}/favorite/`, { method: "POST" });
}
export async function marquerCommeLu(livreId, estLu = true) {
  return appelAPI(`/livres/${livreId}/mark_read/`, {
    method: "POST",
    body: JSON.stringify({ is_read: estLu })
  });
}
export function useLivresLus() {
  const [livresLus, setLivresLus] = useState([]);
  const [chargement, setChargement] = useState(true);
  const recharger = async () => {
    try {
      setChargement(true);
      const data = await appelAPI("/interactions/?type_action=marquage&livre_lu=true");
      const liste = data.results || data;
      setLivresLus(Array.isArray(liste) ? liste : []);
    } finally {
      setChargement(false);
    }
  };
  useEffect(() => {
    void recharger();
  }, []);
  return { livresLus, chargement, recharger };
}
export function useHistorique() {
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    appelAPI("/interactions/").then((data) => {
      const liste = data.results || data;
      setHistorique(Array.isArray(liste) ? liste : []);
    }).catch(() => setHistorique([])).finally(() => setChargement(false));
  }, []);
  return { historique, chargement };
}
export async function envoyerMessageClub(clubId, nom, email, message) {
  return appelAPI(`/clubs/${clubId}/contact/`, {
    method: "POST",
    body: JSON.stringify({ nom, email, message })
  });
}
export async function creerSessionChat(titre = "Nouvelle conversation") {
  return appelAPI("/chat/", {
    method: "POST",
    body: JSON.stringify({ titre })
  });
}
export async function ajouterMessageChat(sessionId, contenu) {
  return appelAPI(`/chat/${sessionId}/messages/`, {
    method: "POST",
    body: JSON.stringify({ content: contenu })
  });
}
export async function recupererSessionChat(sessionId) {
  return appelAPI(`/chat/${sessionId}/`);
}
export function useBooks() {
  const { livres, chargement, erreur } = useLivres();
  return { books: livres, isLoading: chargement, error: erreur };
}
export function useBook(id) {
  const { livre, chargement, erreur } = useLivre(id);
  return { book: livre, isLoading: chargement, error: erreur };
}
export function useEvents() {
  const { evenements, chargement, erreur } = useEvenements();
  return { events: evenements, isLoading: chargement, error: erreur };
}
export function useEvent(id) {
  const { evenement, chargement, erreur } = useEvenement(id);
  return { event: evenement, isLoading: chargement, error: erreur };
}
export function useNews() {
  const { actualites, chargement, erreur } = useActualites();
  return { news: actualites, isLoading: chargement, error: erreur };
}
export function useNewsItem(id) {
  const { article, chargement, erreur } = useArticleActualite(id);
  return { news: article, isLoading: chargement, error: erreur };
}
export function useReviews(livreId) {
  const { avis, chargement, erreur, recharger } = useAvis(livreId);
  return { data: avis, isLoading: chargement, error: erreur, reload: recharger };
}
export function useBorrows() {
  const { emprunts, chargement, erreur } = useEmprunts();
  return { borrows: emprunts, isLoading: chargement, error: erreur };
}
export function useLabStations() {
  return { stations: [], isLoading: false, error: null };
}
export const postReview = publierAvis;
export const registerEvent = sinscrireEvenement;
export const unregisterEvent = desinscrireEvenement;
export const sendClubContact = envoyerMessageClub;
export const toggleFavorite = inverserFavori;
export function useGlobalStats() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const rawData = await appelAPI("/stats/").catch(() => ({}));
        setStats({
          books_count: rawData.books_count ?? rawData.total_books ?? 0,
          members_count: rawData.members_count ?? rawData.total_users ?? 0,
          events_count: rawData.events_count ?? rawData.total_events ?? 0,
          news_count: rawData.news_count ?? rawData.total_news ?? 0,
          clubs_count: rawData.clubs_count ?? rawData.total_clubs ?? 0,
          lab_count: rawData.lab_count ?? rawData.total_labs ?? rawData.total_lab_stations ?? 0,
          years: rawData.years ?? rawData.expertise_years ?? null,
          active_readers: rawData.active_readers ?? rawData.members_count ?? rawData.total_users ?? 0
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  return { stats, isLoading };
}
