import { useState, useEffect } from 'react';
import type { Livre, ClubLecture, Evenement, Actualite, Avis, Emprunt, Reservation } from '@/types';
import { fetchWithAuth } from '@/lib/api';

/**
 * Utilitaire central pour effectuer des appels HTTP vers le backend.
 * Gère automatiquement le rafraîchissement du jeton via fetchWithAuth.
 */
export async function appelAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetchWithAuth(endpoint, options);
  
  if (!response.ok) {
    const texteErreur = await response.text();
    throw new Error(`Erreur API ${response.status}: ${texteErreur}`);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

// ── HOOKS DE LECTURE (Récupération des données) ──────────────────────────

/**
 * Récupère la liste de tous les livres.
 */
export function useLivres() {
  const [livres, setLivres] = useState<Livre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/livres/');
        setLivres(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des livres'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { livres, chargement, erreur };
}

/**
 * Récupère les détails d'un livre spécifique par son ID.
 */
export function useLivre(id?: string) {
  const [livre, setLivre] = useState<Livre | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/livres/${id}/`);
        setLivre(donnees);
      } catch { 
        setErreur('Erreur lors du chargement du livre'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, [id]);

  return { livre, chargement, erreur };
}

/**
 * Récupère la liste des clubs de lecture.
 */
export function useClubs() {
  const [clubs, setClubs] = useState<ClubLecture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/clubs/');
        setClubs(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des clubs'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { clubs, chargement, erreur };
}

/**
 * Récupère les détails d'un club spécifique.
 */
export function useClub(id?: string) {
  const [club, setClub] = useState<ClubLecture | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/clubs/${id}/`);
        setClub(donnees);
      } catch { 
        setErreur('Erreur lors du chargement du club'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, [id]);

  return { club, chargement, erreur };
}

/**
 * Récupère la liste des événements.
 */
export function useEvenements() {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/evenements/');
        setEvenements(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des événements'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { evenements, chargement, erreur };
}

/**
 * Récupère les détails d'un événement spécifique.
 */
export function useEvenement(id?: string) {
  const [evenement, setEvenement] = useState<Evenement | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/evenements/${id}/`);
        setEvenement(donnees);
      } catch { 
        setErreur('Erreur lors du chargement de l\'événement'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, [id]);

  return { evenement, chargement, erreur };
}

/**
 * Récupère la liste des actualités.
 */
export function useActualites() {
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/actualites/');
        setActualites(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des actualités'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { actualites, chargement, erreur };
}

/**
 * Récupère un article d'actualité spécifique.
 */
export function useArticleActualite(id?: string) {
  const [article, setArticle] = useState<Actualite | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/actualites/${id}/`);
        setArticle(donnees);
      } catch { 
        setErreur('Erreur lors du chargement de l\'actualité'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, [id]);

  return { article, chargement, erreur };
}

/**
 * Récupère les avis (commentaires) d'un livre ou tous les avis.
 */
export function useAvis(livreId?: string) {
  const [avis, setAvis] = useState<Avis[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recupererAvis = async () => {
    try {
      setChargement(true);
      const pointEntree = livreId ? `/avis/?book=${livreId}` : '/avis/';
      const donnees = await appelAPI(pointEntree);
      setAvis(donnees.results || donnees);
    } catch { 
      setErreur('Erreur lors du chargement des avis'); 
    } finally { 
      setChargement(false); 
    }
  };

  useEffect(() => { void recupererAvis(); }, [livreId]);

  return { avis, chargement, erreur, recharger: recupererAvis };
}

/**
 * Récupère les emprunts de l'utilisateur.
 */
export function useEmprunts() {
  const [emprunts, setEmprunts] = useState<Emprunt[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/emprunts/');
        setEmprunts(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des emprunts'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { emprunts, chargement, erreur };
}

/**
 * Récupère les réservations de l'utilisateur.
 */
export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/reservations/');
        setReservations(donnees.results || donnees);
      } catch { 
        setErreur('Erreur lors du chargement des réservations'); 
      } finally { 
        setChargement(false); 
      }
    })();
  }, []);

  return { reservations, chargement, erreur };
}

/**
 * Récupère les recommandations personnalisées.
 */
export function useRecommandations(humeur = 'neutre') {
  const [recommandations, setRecommandations] = useState<any>(null);
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

// ── SESSIONS DE CHAT (IA Kossi) ──────────────────────────────────────────

export interface DonneesSessionChat {
  id: number;
  titre: string;
  created_at: string;
  messages: { id: number; role: 'user' | 'assistant'; content: string; created_at: string }[];
}

/**
 * Récupère l'historique des conversations avec Kossi.
 */
export function useSessionsChat() {
  const [sessions, setSessions] = useState<DonneesSessionChat[]>([]);
  const [chargement, setChargement] = useState(true);

  const recupererSessions = async () => {
    try {
      setChargement(true);
      const donnees = await appelAPI('/chat/');
      setSessions(donnees.results || donnees);
    } finally { 
      setChargement(false); 
    }
  };

  useEffect(() => { void recupererSessions(); }, []);

  return { sessions, chargement, recharger: recupererSessions };
}

// ── ACTIONS D'ÉCRITURE (Envoi de données) ────────────────────────────────

/**
 * Publie un nouvel avis sur un livre.
 * Envoie les champs attendus par le backend Django (book, note, commentaire).
 */
export async function publierAvis(livreId: string, note: number, commentaire: string) {
  if (!livreId) throw new Error('ID du livre requis');
  if (note < 1 || note > 5) throw new Error('La note doit être entre 1 et 5');

  const res = await appelAPI('/avis/', {
    method: 'POST',
    body: JSON.stringify({
      book: livreId,       // champ principal
      bookId: livreId,     // alias de compatibilité
      note: note,          // champ principal
      rating: note,        // alias de compatibilité
      commentaire: commentaire,
      comment: commentaire,
    }),
  });

  if (res?.error || res?.detail) {
    const msg = res.error || res.detail || 'Erreur lors de la publication';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return res;
}

/**
 * Réserve un livre.
 */
export async function reserverLivre(livreId: string) {
  return appelAPI('/reservations/', {
    method: 'POST',
    body: JSON.stringify({ book: livreId }),
  });
}

/**
 * Rejoindre un club de lecture.
 */
export async function rejoindreClub(clubId: string) {
  return appelAPI(`/clubs/${clubId}/join/`, { method: 'POST' });
}

/**
 * Quitter un club de lecture.
 */
export async function quitterClub(clubId: string) {
  return appelAPI(`/clubs/${clubId}/leave/`, { method: 'POST' });
}

/**
 * S'inscrire à un événement.
 */
export async function sinscrireEvenement(evenementId: string) {
  return appelAPI(`/evenements/${evenementId}/register/`, { method: 'POST' });
}

/**
 * Se désinscrire d'un événement.
 */
export async function desinscrireEvenement(evenementId: string) {
  return appelAPI(`/evenements/${evenementId}/unregister/`, { method: 'POST' });
}

/**
 * Inscrit l'utilisateur à un événement avec des détails supplémentaires.
 */
export async function sinscrireEvenementDetaillee(evenementId: string, donnees: { nom_complet: string, email: string, telephone: string, motivations: string }) {
  return appelAPI('/participations-evenements/', {
    method: 'POST',
    body: JSON.stringify({
      event: evenementId,
      ...donnees
    })
  });
}

/**
 * Récupère les participations de l'utilisateur aux événements.
 */
export function useParticipationsEvenements() {
  const [participations, setParticipations] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    appelAPI('/participations-evenements/')
      .then(data => setParticipations(data))
      .catch(err => console.error('Erreur participations:', err))
      .finally(() => setChargement(false));
  }, []);

  return { participations, chargement };
}

/**
 * Ajouter ou retirer un livre des favoris (persistance BDD via POST /livres/{id}/favorite/).
 */
export async function inverserFavori(livreId: string): Promise<{ isFavorite: boolean; favorites: string[] }> {
  return appelAPI(`/livres/${livreId}/favorite/`, { method: 'POST' });
}

/**
 * Marque un livre comme lu (persisté dans Interaction.livre_lu en BDD).
 */
export async function marquerCommeLu(livreId: string, estLu = true) {
  return appelAPI(`/livres/${livreId}/mark_read/`, {
    method: 'POST',
    body: JSON.stringify({ is_read: estLu }),
  });
}

/**
 * Récupère les livres marqués comme lus par l'utilisateur (depuis Interaction).
 */
export function useLivresLus() {
  const [livresLus, setLivresLus] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  const recharger = async () => {
    try {
      setChargement(true);
      const data = await appelAPI('/interactions/?type_action=marquage&livre_lu=true');
      const liste = data.results || data;
      setLivresLus(Array.isArray(liste) ? liste : []);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { void recharger(); }, []);
  return { livresLus, chargement, recharger };
}

/**
 * Récupère l'historique complet des interactions utilisateur.
 */
export function useHistorique() {
  const [historique, setHistorique] = useState<any[]>([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    appelAPI('/interactions/')
      .then(data => {
        const liste = data.results || data;
        setHistorique(Array.isArray(liste) ? liste : []);
      })
      .catch(() => setHistorique([]))
      .finally(() => setChargement(false));
  }, []);

  return { historique, chargement };
}

/**
 * Envoyer un message de contact à un club.
 */
export async function envoyerMessageClub(clubId: string, nom: string, email: string, message: string) {
  return appelAPI(`/clubs/${clubId}/contact/`, {
    method: 'POST',
    body: JSON.stringify({ nom, email, message }),
  });
}

/**
 * Créer une nouvelle session de chat avec Kossi.
 */
export async function creerSessionChat(titre = 'Nouvelle conversation'): Promise<DonneesSessionChat> {
  return appelAPI('/chat/', {
    method: 'POST',
    body: JSON.stringify({ titre }),
  });
}

/**
 * Ajoute un message à une session de chat et récupère la réponse de l'IA.
 */
export async function ajouterMessageChat(sessionId: number, contenu: string) {
  return appelAPI(`/chat/${sessionId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content: contenu }),
  });
}

/**
 * Récupère les détails d'une session de chat (incluant les messages).
 */
export async function recupererSessionChat(sessionId: number): Promise<DonneesSessionChat> {
  return appelAPI(`/chat/${sessionId}/`);
}

/**
 * Crée une réservation pour le laboratoire.
 */
export async function creerReservationLab(donnees: { station: number, date: string, start_time: string, end_time: string, purpose?: string }) {
  return appelAPI('/lab-reservations/', {
    method: 'POST',
    body: JSON.stringify(donnees)
  });
}

// ── ALIASES ANGLAIS (compatibilité UI) ──────────────────────────────────

export function useBooks() {
  const { livres, chargement, erreur } = useLivres();
  return { books: livres, isLoading: chargement, error: erreur };
}

export function useBook(id?: string) {
  const { livre, chargement, erreur } = useLivre(id);
  return { book: livre, isLoading: chargement, error: erreur };
}

export function useEvents() {
  const { evenements, chargement, erreur } = useEvenements();
  return { events: evenements, isLoading: chargement, error: erreur };
}

export function useEvent(id?: string) {
  const { evenement, chargement, erreur } = useEvenement(id);
  return { event: evenement, isLoading: chargement, error: erreur };
}

export function useNews() {
  const { actualites, chargement, erreur } = useActualites();
  return { news: actualites, isLoading: chargement, error: erreur };
}

export function useNewsItem(id?: string) {
  const { article, chargement, erreur } = useArticleActualite(id);
  return { news: article, isLoading: chargement, error: erreur };
}

export function useReviews(livreId?: string) {
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

/**
 * Récupère les statistiques globales de la bibliothèque.
 */
export function useGlobalStats() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await appelAPI('/stats/').catch(() => ({
          books_count: 12000,
          members_count: 5000,
          events_count: 50,
          news_count: 20,
          clubs_count: 3,
          lab_count: 1,
          years: 25
        }));
        setStats(data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { stats, isLoading };
}
