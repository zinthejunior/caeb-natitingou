import { X, Clock } from 'lucide-react';

import useNotifications from '@/hooks/useNotifications';

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, loading, markAllRead, clearAll, markRead } = useNotifications();

  const toggleRead = (id: string, current: boolean) => {
    void markRead(id, !current);
  };

  return (
    <div className="surface rounded-lg shadow-lg p-3 border border-muted">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Notifications</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void markAllRead()}
            className="text-xs sm:text-sm text-muted hover:text-primary dark:hover:text-library-dark-accent focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 rounded px-2 py-1 transition-colors"
            title="Marquer toutes les notifications comme lues"
          >
            Marquer lu
          </button>
          <button
            onClick={() => void clearAll()}
            className="text-xs sm:text-sm text-muted hover:text-primary dark:hover:text-library-dark-accent focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 rounded px-2 py-1 transition-colors"
            title="Supprimer toutes les notifications"
          >
            <span className="hidden sm:inline">Tout supprimer</span>
            <span className="sm:hidden">Vider</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-weak dark:hover:bg-library-dark-secondary focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 transition-colors"
            title="Fermer les notifications"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {loading && <div className="py-4 text-center text-sm text-muted">Chargement…</div>}
        {!loading && notifications.length === 0 && (
          <div className="py-6 text-center text-sm text-muted">Aucune notification</div>
        )}

        {notifications.map(n => (
          <div key={n.id} className={`p-3 rounded-lg transition-colors ${n.read ? 'bg-surface' : 'bg-library-accent/5'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-xs text-muted">{n.body}</div>
                <div className="text-[10px] text-muted mt-2 flex items-center gap-1"><Clock className="w-3 h-3" />{n.date}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => toggleRead(n.id, !!n.read)}
                  className="p-1 rounded hover:bg-surface-weak dark:hover:bg-library-dark-secondary text-xs sm:text-sm text-muted focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 transition-colors"
                  title={n.read ? 'Marquer comme non lu' : 'Marquer comme lu'}
                >
                  {n.read ? 'Non lu' : 'Lu'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
