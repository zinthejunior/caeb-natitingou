// Composant Centre de Notifications — Affiche les notifications de l'utilisateur
import { X, Clock } from 'lucide-react';
import useNotifications from '@/hooks/useNotifications';

// Props du composant : fonction optionnelle pour fermer le panneau
interface PropsCentreNotifications {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: PropsCentreNotifications) {
  // Récupération des données et des actions depuis le hook
  const {
    notifications,
    chargement,
    marquerToutLu,
    toutEffacer,
    marquerLu,
  } = useNotifications();

  /**
   * Bascule l'état lu/non-lu d'une notification.
   * @param id     - Identifiant de la notification
   * @param estLue - État actuel (true = déjà lue)
   */
  const basculerLecture = (id: string, estLue: boolean) => {
    void marquerLu(id, !estLue);
  };

  return (
    <div className="surface rounded-lg shadow-lg p-3 border border-muted">
      {/* En-tête avec les boutons d'action */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Notifications</h4>
        <div className="flex items-center gap-2">

          {/* Bouton : tout marquer comme lu */}
          <button
            onClick={() => void marquerToutLu()}
            className="text-xs sm:text-sm text-muted hover:text-primary dark:hover:text-library-dark-accent focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 rounded px-2 py-1 transition-colors"
            title="Marquer toutes les notifications comme lues"
          >
            Marquer lu
          </button>

          {/* Bouton : tout supprimer */}
          <button
            onClick={() => void toutEffacer()}
            className="text-xs sm:text-sm text-muted hover:text-primary dark:hover:text-library-dark-accent focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 rounded px-2 py-1 transition-colors"
            title="Supprimer toutes les notifications"
          >
            <span className="hidden sm:inline">Tout supprimer</span>
            <span className="sm:hidden">Vider</span>
          </button>

          {/* Bouton : fermer le panneau */}
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

      {/* Liste des notifications */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {/* Indicateur de chargement */}
        {chargement && (
          <div className="py-4 text-center text-sm text-muted">Chargement…</div>
        )}

        {/* Message quand la liste est vide */}
        {!chargement && notifications.length === 0 && (
          <div className="py-6 text-center text-sm text-muted">Aucune notification</div>
        )}

        {/* Affichage de chaque notification */}
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-3 rounded-lg transition-colors ${notif.read ? 'bg-surface' : 'bg-library-accent/5'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {/* Titre de la notification */}
                <div className="font-medium text-sm">{notif.title}</div>
                {/* Corps du message */}
                <div className="text-xs text-muted">{notif.body}</div>
                {/* Date de la notification */}
                <div className="text-[10px] text-muted mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {notif.date}
                </div>
              </div>

              {/* Bouton lecture/non-lue */}
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => basculerLecture(notif.id, !!notif.read)}
                  className="p-1 rounded hover:bg-surface-weak dark:hover:bg-library-dark-secondary text-xs sm:text-sm text-muted focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0 transition-colors"
                  title={notif.read ? 'Marquer comme non lu' : 'Marquer comme lu'}
                >
                  {notif.read ? 'Non lu' : 'Lu'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
