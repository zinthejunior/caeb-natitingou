import { useState, useCallback, useEffect } from 'react';
// Correction : le nom correct de la fonction importée est `appelAPI`
import { appelAPI } from './useData';

// Forme d'un objet notification reçu de l'API
interface FormeNotification {
  id: string;
  userId?: string;
  title?: string;      // titre affiché
  message?: string;    // corps du message
  type?: string;       // type de notification (rappel_retour, retard, livre_disponible…)
  body?: string;       // alias de message pour l'affichage
  date?: string;       // date de création (format ISO)
  createdAt?: string;  // même chose, selon le champ renvoyé par l'API
  read?: boolean;      // true = déjà lue (anglais, pour compatibilité)
  lu?: boolean;        // true = déjà lue (français, champ Django)
}

/**
 * Hook de notifications — connecté au backend API Django.
 * Récupère automatiquement les notifications de l'utilisateur connecté.
 *
 * @param _intervalleSondage - Intervalle en ms entre deux rechargements (optionnel, non utilisé)
 */
export function useNotifications(_intervalleSondage = 30000) {
  const [listeNotifications, setListeNotifications] = useState<FormeNotification[]>([]);
  const [chargement, setChargement] = useState(true);

  // Fonction qui va chercher les notifications auprès du serveur
  const recupererNotifications = useCallback(async () => {
    try {
      const donnees = await appelAPI('/notifications/').catch(() => []);
      const resultats = donnees.results || donnees;

      // Transformation des champs API vers la forme attendue par le composant
      const transformees = resultats.map((notif: any) => ({
        id: notif.id,
        userId: notif.userId,
        type: notif.type,
        // Génère un titre lisible à partir du type de notification
        title:
          notif.type === 'rappel_retour'    ? 'Rappel de retour'   :
          notif.type === 'livre_disponible' ? 'Livre disponible'   :
          notif.type === 'retard'           ? 'Retard'             :
          'Notification',
        body: notif.message,
        message: notif.message,
        date: notif.createdAt,
        createdAt: notif.createdAt,
        read: notif.lu,   // compatibilité anglais
        lu: notif.lu,     // champ Django
      }));

      setListeNotifications(transformees);
    } catch (erreur) {
      console.error('Erreur de chargement des notifications', erreur);
    } finally {
      setChargement(false);
    }
  }, []);

  // Chargement initial au montage du composant
  useEffect(() => {
    void recupererNotifications();
    // Optionnel : utiliser setInterval avec _intervalleSondage pour actualiser périodiquement
  }, [recupererNotifications]);

  /**
   * Marque toutes les notifications comme lues localement.
   * À améliorer : appeler une route API pour la persistance côté serveur.
   */
  const marquerToutLu = useCallback(async () => {
    // Pour l'instant, pas de route API en masse — on met à jour l'état local uniquement
    setListeNotifications(precedentes =>
      precedentes.map(notif => ({ ...notif, read: true, lu: true }))
    );
  }, []);

  /**
   * Vide la liste des notifications localement.
   */
  const toutEffacer = useCallback(() => {
    setListeNotifications([]);
  }, []);

  /**
   * Marque une notification spécifique comme lue ou non lue via l'API.
   * @param id  - Identifiant de la notification
   * @param lue - true pour marquer comme lue, false pour non lue
   */
  const marquerLu = useCallback(async (id: string, lue: boolean) => {
    try {
      await appelAPI(`/notifications/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ lu: lue }),
      });
      // Mise à jour locale après confirmation du serveur
      setListeNotifications(precedentes =>
        precedentes.map(notif => (notif.id === id ? { ...notif, read: lue, lu: lue } : notif))
      );
    } catch (erreur) {
      console.error('Erreur lors de la mise à jour de la notification', erreur);
    }
  }, []);

  return {
    notifications: listeNotifications,  // liste des notifications
    chargement,                          // true pendant le chargement
    recharger: recupererNotifications,   // fonction pour recharger manuellement
    marquerToutLu,                       // marquer toutes les notifs comme lues
    toutEffacer,                         // vider la liste
    marquerLu,                           // marquer une notif spécifique
  } as const;
}

export default useNotifications;
