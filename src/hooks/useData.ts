import { useState, useEffect } from 'react';
import type { Book, ReadingClub, Event, News, Review, Borrow, Reservation } from '@/types';

const API_BASE_URL = 'http://localhost:8000/api';

// ── Utilitaire fetch ─────────────────────────────────────────────────────
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('caeb_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem('caeb_token');
    const errText = await response.text();
    throw new Error(`Erreur API ${response.status}: ${errText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ── Hooks de lecture ────────────────────────────────────────────────────

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/books/');
        setBooks(data.results || data);
      } catch { setError('Erreur lors du chargement des livres'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { books, isLoading, error };
}

export function useBook(id?: string) {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch(`/books/${id}/`);
        setBook(data);
      } catch { setError('Erreur lors du chargement du livre'); }
      finally { setIsLoading(false); }
    })();
  }, [id]);
  return { book, isLoading, error };
}

export function useClubs() {
  const [clubs, setClubs] = useState<ReadingClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/clubs/').catch(() => []);
        setClubs(data.results || data);
      } catch { setError('Erreur lors du chargement des clubs'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { clubs, isLoading, error };
}

export function useClub(id?: string) {
  const [club, setClub] = useState<ReadingClub | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch(`/clubs/${id}/`);
        setClub(data);
      } catch { setError('Erreur lors du chargement du club'); }
      finally { setIsLoading(false); }
    })();
  }, [id]);
  return { club, isLoading, error };
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/events/').catch(() => []);
        setEvents(data.results || data);
      } catch { setError('Erreur lors du chargement des événements'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { events, isLoading, error };
}

export function useEvent(id?: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch(`/events/${id}/`);
        setEvent(data);
      } catch { setError('Erreur lors du chargement de l\'événement'); }
      finally { setIsLoading(false); }
    })();
  }, [id]);
  return { event, isLoading, error };
}

export function useNews() {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/news/').catch(() => []);
        setNews(data.results || data);
      } catch { setError('Erreur lors du chargement des actualités'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { news, isLoading, error };
}

export function useNewsItem(id?: string) {
  const [item, setItem] = useState<News | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch(`/news/${id}/`);
        setItem(data);
      } catch { setError('Erreur lors du chargement de l\'actualité'); }
      finally { setIsLoading(false); }
    })();
  }, [id]);
  return { news: item, isLoading, error };
}

export function useReviews(bookId?: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const endpoint = bookId ? `/reviews/?book=${bookId}` : '/reviews/';
      const data = await apiFetch(endpoint).catch(() => []);
      setReviews(data.results || data);
    } catch { setError('Erreur lors du chargement des avis'); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { void fetchReviews(); }, [bookId]);
  return { data: reviews, isLoading, error, reload: fetchReviews };
}

export function useBorrows() {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/borrows/').catch(() => []);
        setBorrows(data.results || data);
      } catch { setError('Erreur lors du chargement des emprunts'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { borrows, isLoading, error };
}

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch('/reservations/').catch(() => []);
        setReservations(data.results || data);
      } catch { setError('Erreur lors du chargement des réservations'); }
      finally { setIsLoading(false); }
    })();
  }, []);
  return { reservations, isLoading, error };
}

// ── Hook Chat ─────────────────────────────────────────────────────────────

export interface ChatSessionData {
  id: number;
  titre: string;
  created_at: string;
  messages: { id: number; role: 'user' | 'assistant'; content: string; created_at: string }[];
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch('/chat/').catch(() => []);
      setSessions(data.results || data);
    } finally { setIsLoading(false); }
  };

  useEffect(() => { void fetchSessions(); }, []);
  return { sessions, isLoading, reload: fetchSessions };
}

// ── Actions d'écriture ────────────────────────────────────────────────────

export async function postReview(bookId: string, rating: number, comment: string) {
  return apiFetch('/reviews/', {
    method: 'POST',
    body: JSON.stringify({ bookId, rating, comment }),
  });
}

export async function reserveBook(bookId: string) {
  return apiFetch('/reservations/', {
    method: 'POST',
    body: JSON.stringify({ book: bookId }),
  });
}

export async function joinClub(clubId: string) {
  return apiFetch(`/clubs/${clubId}/join/`, { method: 'POST' });
}

export async function registerEvent(eventId: string) {
  return apiFetch(`/events/${eventId}/register/`, { method: 'POST' });
}

export async function toggleFavorite(bookId: string) {
  return apiFetch(`/books/${bookId}/favorite/`, { method: 'POST' });
}

export async function sendClubContact(clubId: string, nom: string, email: string, message: string) {
  return apiFetch(`/clubs/${clubId}/contact/`, {
    method: 'POST',
    body: JSON.stringify({ nom, email, message }),
  });
}

export async function createChatSession(titre = 'Nouvelle conversation'): Promise<ChatSessionData> {
  return apiFetch('/chat/', {
    method: 'POST',
    body: JSON.stringify({ titre }),
  });
}

export async function addChatMessage(sessionId: number, role: 'user' | 'assistant', content: string) {
  return apiFetch(`/chat/${sessionId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ role, content }),
  });
}

export async function getChatSession(sessionId: number): Promise<ChatSessionData> {
  return apiFetch(`/chat/${sessionId}/`);
}
