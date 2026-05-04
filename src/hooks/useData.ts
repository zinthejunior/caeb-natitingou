import { useState, useEffect } from 'react';
import type { Book, ReadingClub, Event, News, Review, Borrow, Reservation } from '@/types';

// URL de base de l'API Django
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Utilitaire central pour effectuer des appels HTTP vers le backend.
 * Gère automatiquement le jeton d'authentification (token).
 */
export async function appelAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('caeb_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    // Si le jeton est invalide ou expiré, on le supprime
    if (response.status === 401) localStorage.removeItem('caeb_token');
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
  const [livres, setLivres] = useState<Book[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/books/');
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
  const [livre, setLivre] = useState<Book | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/books/${id}/`);
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
  const [clubs, setClubs] = useState<ReadingClub[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/clubs/').catch(() => []);
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
  const [club, setClub] = useState<ReadingClub | null>(null);
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
  const [evenements, setEvenements] = useState<Event[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/events/').catch(() => []);
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
  const [evenement, setEvenement] = useState<Event | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/events/${id}/`);
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
  const [actualites, setActualites] = useState<News[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/news/').catch(() => []);
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
  const [article, setArticle] = useState<News | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI(`/news/${id}/`);
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
  const [avis, setAvis] = useState<Review[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const recupererAvis = async () => {
    try {
      setChargement(true);
      const pointEntree = livreId ? `/reviews/?book=${livreId}` : '/reviews/';
      const donnees = await appelAPI(pointEntree).catch(() => []);
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
  const [emprunts, setEmprunts] = useState<Borrow[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setChargement(true);
        const donnees = await appelAPI('/borrows/').catch(() => []);
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
        const donnees = await appelAPI('/reservations/').catch(() => []);
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
      const donnees = await appelAPI('/chat/').catch(() => []);
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
 */
export async function publierAvis(livreId: string, note: number, commentaire: string) {
  return appelAPI('/reviews/', {
    method: 'POST',
    body: JSON.stringify({ bookId: livreId, rating: note, comment: commentaire }),
  });
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
 * S'inscrire à un événement.
 */
export async function sinscrireEvenement(evenementId: string) {
  return appelAPI(`/events/${evenementId}/register/`, { method: 'POST' });
}

/**
 * Ajouter ou retirer un livre des favoris.
 */
export async function inverserFavori(livreId: string) {
  return appelAPI(`/books/${livreId}/favorite/`, { method: 'POST' });
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
 * Ajouter un message à une session de chat.
 */
export async function ajouterMessageChat(sessionId: number, role: 'user' | 'assistant', contenu: string) {
  return appelAPI(`/chat/${sessionId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ role, content: contenu }),
  });
}

/**
 * Récupère les détails d'une session de chat (incluant les messages).
 */
export async function recupererSessionChat(sessionId: number): Promise<DonneesSessionChat> {
  return appelAPI(`/chat/${sessionId}/`);
}

