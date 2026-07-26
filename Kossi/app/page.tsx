// =============================================================================
// PAGE D'ACCUEIL - Interface principale de chat avec Kossi
// =============================================================================
// Cette page affiche l'interface de chat avec l'assistant Kossi
// Elle utilise le composant ChatContainer qui gere toute la logique
// =============================================================================

import { ChatContainer } from "@/components/chat";

/**
 * Page principale de l'application
 * Affiche l'interface de chat avec Kossi, l'assistant bibliothecaire
 */
export default function HomePage() {
  return (
    <main className="h-screen bg-background">
      {/* 
        Le ChatContainer gere:
        - L'affichage des messages
        - L'envoi des requetes a l'API FastAPI
        - Le streaming des reponses
        - Le feedback utilisateur
      */}
      <ChatContainer />
    </main>
  );
}
