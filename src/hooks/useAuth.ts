import { useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';

const API_BASE_URL = 'http://localhost:8000/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Commence par le chargement pour vérifier la session
  });

  const fetchUser = useCallback(async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const user = await response.json();
        setState({ user, isAuthenticated: true, isLoading: false });
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
        localStorage.setItem('caeb_token', data.access);
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
      // Inscription via l'endpoint users/ (si autorisé)
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.email,
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
          type_compte: 'non_membre',
          date_naissance: data.birthDate,
          niveau_etude: data.educationLevel,
          genre_prefere: data.preferredGenres.join(','),
          profil_complet: true,
        }),
      });

      if (response.ok) {
        return await login(data.email, data.password);
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
      const response = await fetch(`${API_BASE_URL}/users/${state.user.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setState(prev => ({ ...prev, user: updatedUser }));
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
    }
  }, [state.user]);


  return {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };
}

