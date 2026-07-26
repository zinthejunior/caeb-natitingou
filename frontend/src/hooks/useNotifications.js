import { useState, useCallback, useEffect } from "react";
import { appelAPI } from "./useData";
export function useNotifications(_intervalleSondage = 3e4) {
  const [listeNotifications, setListeNotifications] = useState([]);
  const [chargement, setChargement] = useState(true);
  const recupererNotifications = useCallback(async () => {
    try {
      const donnees = await appelAPI("/notifications/").catch(() => []);
      const resultats = donnees.results || donnees;
      const transformees = resultats.map((notif) => ({
        id: notif.id,
        userId: notif.userId,
        type: notif.type,
        // Génère un titre lisible à partir du type de notification
        title: notif.type === "rappel_retour" ? "Rappel de retour" : notif.type === "livre_disponible" ? "Livre disponible" : notif.type === "retard" ? "Retard" : notif.type === "demande_adhesion" ? "Demande d'adhésion" : notif.type === "adhesion_confirmee" ? "Adhésion confirmée" : notif.type === "inscription_evenement" ? "Inscription événement" : "Notification",
        body: notif.message,
        message: notif.message,
        date: notif.createdAt,
        createdAt: notif.createdAt,
        read: notif.lu,
        // compatibilité anglais
        lu: notif.lu
        // champ Django
      }));
      setListeNotifications(transformees);
    } catch (erreur) {
      console.error("Erreur de chargement des notifications", erreur);
    } finally {
      setChargement(false);
    }
  }, []);
  useEffect(() => {
    void recupererNotifications();
  }, [recupererNotifications]);
  const marquerToutLu = useCallback(async () => {
    setListeNotifications(
      (precedentes) => precedentes.map((notif) => ({ ...notif, read: true, lu: true }))
    );
  }, []);
  const toutEffacer = useCallback(() => {
    setListeNotifications([]);
  }, []);
  const marquerLu = useCallback(async (id, lue) => {
    try {
      await appelAPI(`/notifications/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ lu: lue })
      });
      setListeNotifications(
        (precedentes) => precedentes.map((notif) => notif.id === id ? { ...notif, read: lue, lu: lue } : notif)
      );
    } catch (erreur) {
      console.error("Erreur lors de la mise à jour de la notification", erreur);
    }
  }, []);
  return {
    notifications: listeNotifications,
    // liste des notifications
    chargement,
    // true pendant le chargement
    recharger: recupererNotifications,
    // fonction pour recharger manuellement
    marquerToutLu,
    // marquer toutes les notifs comme lues
    toutEffacer,
    // vider la liste
    marquerLu
    // marquer une notif spécifique
  };
}
export default useNotifications;
