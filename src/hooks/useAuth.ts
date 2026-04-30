import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';

const API_BASE_URL = 'http://localhost:8000/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Normalise un objet User reçu de Django vers la structure TS */
function normalizeUser(raw: any): User {
  return {
    ...raw,
    firstName: raw.firstName ?? raw.first_name ?? '',
    lastName:  raw.lastName  ?? raw.last_name  ?? '',
    isMember:  raw.type_compte === 'membre',
    date_inscription: raw.date_inscription ?? raw.createdAt ?? '',
    date_naissance:   raw.date_naissance   ?? raw.birthDate ?? '',
    educationLevel:   raw.niveau_etude,
    preferredGenres:  raw.genre_prefere
      ? (Array.isArray(raw.genre_prefere) ? raw.genre_prefere : raw.genre_prefere.split(',').filter(Boolean))
      : [],
    sous_genre_prefere: raw.sous_genre_prefere
      ? (Array.isArray(raw.sous_genre_prefere) ? raw.sous_genre_prefere : raw.sous_genre_prefere.split(',').filter(Boolean))
      : [],
    favorites:    raw.favorites    ?? [],
    intentions:   raw.intentions   ?? [],
    followedClubs: raw.followedClubs ?? [],
    stats: raw.stats ?? { booksRead: 0, reviewsPosted: 0, clubsJoined: 0, eventsAttended: 0 },
  };
}

/** Normalise les updates TS → champs Django avant envoi PATCH */
function denormalizeUpdates(updates: Partial<User & Record<string, any>>): Record<string, any> {
  const out: Record<string, any> = { ...updates };

  if ('firstName' in updates)      { out['first_name']  = updates.firstName; }
  if ('lastName'  in updates)      { out['last_name']   = updates.lastName;  }
  if ('educationLevel' in updates) { out['niveau_etude'] = updates.educationLevel; }

  if ('preferredGenres' in updates && Array.isArray(updates.preferredGenres)) {
    out['genre_prefere'] = updates.preferredGenres.join(',');
  }
  if ('sous_genre_prefere' in updates && Array.isArray(updates.sous_genre_prefere)) {
    out['sous_genre_prefere'] = (updates.sous_genre_prefere as string[]).join(',');
  }

  // Supprimer les clés camelCase non comprises par Django
  delete out['firstName']; delete out['lastName'];
  delete out['educationLevel']; delete out['preferredGenres'];
  delete out['isMember']; delete out['createdAt']; delete out['birthDate'];
  delete out['stats']; delete out['followedClubs'];

  return out;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const fetchUser = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const raw = await response.json();
        setState({ user: normalizeUser(raw), isAuthenticated: true, isLoading: false });
        return true;
      }
    } catch (error) {
      console.error('Échec de la récupération de l\'utilisateur:', error);
    }
    return false;
  }, []);

  // Vérifie s'il existe une session au montage du composant
  useEffect(() => {
    const token = localStorage.getItem('caeb_token');
    if (token) {
      void fetchUser(token).then(success => {
        if (!success) {
          localStorage.removeItem('caeb_token');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('caeb_token',   data.access);
        localStorage.setItem('caeb_refresh', data.refresh);
        return await fetchUser(data.access);
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
    }
    setState(prev => ({ ...prev, isLoading: false }));
    return false;
  }, [fetchUser]);

  const register = useCallback(async (data: any): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const payload = {
        username:          data.email,
        email:             data.email,
        password:          data.password,
        firstName:         data.firstName,
        lastName:          data.lastName,
        type_compte:       'non_membre',
        date_naissance:    data.birthDate || null,
        niveau_etude:      data.educationLevel || null,
        classe:            data.classe || null,
        genre_prefere:     Array.isArray(data.genres) ? data.genres.join(',') : '',
        sous_genre_prefere: Array.isArray(data.sous_genres) ? data.sous_genres.join(',') : '',
        intentions:        data.intentions || [],
        profil_complet:    true,
      };
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await login(data.email, data.password);
      } else {
        const errData = await response.json();
        console.error('Erreur inscription:', errData);
      }
    } catch (err) {
      console.error('Erreur lors de l\'inscription:', err);
    }
    setState(prev => ({ ...prev, isLoading: false }));
    return false;
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('caeb_token');
    localStorage.removeItem('caeb_refresh');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    if (!state.user) return;
    const token = localStorage.getItem('caeb_token');
    try {
      const body = denormalizeUpdates(updates as any);
      const response = await fetch(`${API_BASE_URL}/users/me/update/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const raw = await response.json();
        setState(prev => ({ ...prev, user: normalizeUser(raw) }));
      } else {
        console.error('Erreur PATCH user:', await response.text());
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
    }
  }, [state.user]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
    const token = localStorage.getItem('caeb_token');
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/change-password/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      return response.ok;
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      return false;
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    updateUser,
    changePassword,
  };
}
