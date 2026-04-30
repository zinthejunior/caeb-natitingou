import { useState, useCallback } from 'react';

interface NotificationShape {
  id: string;
  title: string;
  body?: string;
  date?: string;
  read?: boolean;
}

// Notifications fictives initiales
const mockNotifications: NotificationShape[] = [
  {
    id: '1',
    title: 'Bienvenue sur la bibliothèque !',
    body: 'Découvrez tous nos livres et clubs de lecture.',
    date: new Date().toISOString().split('T')[0],
    read: false,
  },
  {
    id: '2',
    title: 'Nouvel événement disponible',
    body: 'Rencontre avec Céline Dubois le 22 février.',
    date: new Date().toISOString().split('T')[0],
    read: false,
  },
  {
    id: '3',
    title: 'Défi "Février Fantastique"',
    body: 'Rejoignez le défi collectif et gagnez des récompenses !',
    date: new Date().toISOString().split('T')[0],
    read: true,
  },
];

/**
 * Hook de notifications - Version mock (sans backend)
 * Gère les notifications en mémoire locale.
 */
export function useNotifications(_pollInterval = 30000) {
  const [items, setItems] = useState<NotificationShape[]>(mockNotifications);

  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const markRead = useCallback((id: string, read: boolean) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read } : n)));
  }, []);

  // reload est un no-op en mode mock
  const reload = useCallback(() => Promise.resolve(), []);

  return {
    notifications: items,
    loading: false,
    reload,
    markAllRead,
    clearAll,
    markRead,
  } as const;
}

export default useNotifications;
