// ══════════════════════════════════════════════════════════════════════════════
// TYPES POUR L'APPLICATION KOSSI AI
// Definitions TypeScript pour les messages, utilisateurs et reponses API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Metadata associee a un message de l'assistant.
 */
export interface Source {
  /** Titre ou libellé de la source */
  title: string;
  /** Lien direct vers la source */
  url: string;
  /** Extrait ou résumé court de la source */
  snippet?: string;
}

export interface MessageMetadata {
  /** Agent qui a genere la reponse */
  agent?: string;
  /** Sources utilisees */
  sources?: Source[];
  /** Indique si la reponse vient du cache */
  cached?: boolean;
  /** Temps de traitement en ms */
  processingTime?: number;
}

/**
 * Represente un message dans la conversation.
 * Utilise par le composant ChatContainer.
 */
export interface Message {
  /** Identifiant unique du message */
  id: string;
  /** Role de l'auteur: 'user' pour l'utilisateur, 'assistant' pour Kossi */
  role: "user" | "assistant";
  /** Contenu textuel du message */
  content: string;
  /** Date d'envoi du message */
  timestamp: Date;
  /** Metadata optionnelle (pour les messages assistant) */
  metadata?: MessageMetadata;
  /** Feedback utilisateur */
  feedback?: "helpful" | "not_helpful";
}

/**
 * Alias pour compatibilite avec l'ancien nom.
 */
export type ChatMessage = Message;

export interface Conversation {
  /** Identifiant unique de la conversation */
  id: string;
  /** Identifiant de session stocké */
  session_id: string;
  /** Titre affiché dans l'historique */
  title: string;
  /** Date de la dernière mise à jour */
  updatedAt: Date;
  /** Messages de la conversation */
  messages: Message[];
}

/**
 * Profil utilisateur pour la personnalisation des recommandations.
 * Version utilisee par le composant ChatContainer.
 */
export interface UserProfile {
  /** Type d'utilisateur */
  type: "etudiant" | "enseignant" | "chercheur" | "autre";
  /** Centres d'interet */
  interests: string[];
  /** Langue preferee */
  language: "fr" | "en";
  /** Prenom de l'utilisateur */
  prenom?: string;
  /** Nom de l'utilisateur */
  nom?: string;
  /** Niveau d'etudes (primaire, college, lycee, universite, etc.) */
  niveau_etude?: string;
  /** Date de naissance au format ISO (YYYY-MM-DD) */
  date_naissance?: string;
  /** Genres litteraires preferes */
  genres_preferes?: string[];
  /** Courte biographie ou description */
  bio?: string;
}

/**
 * Etat du chat (utilise comme type string dans les composants).
 */
export type ChatState = "idle" | "loading" | "streaming" | "error";

/**
 * Requete envoyee a l'API /chat.
 */
export interface ChatRequest {
  /** Message de l'utilisateur */
  message: string;
  /** Historique des messages precedents */
  history: Array<{ role: string; content: string }>;
  /** Format compatible avec certains backend : liste complète des messages */
  messages?: Array<{ role: string; content: string }>;
  /** Profil utilisateur optionnel */
  user?: UserProfile | null;
  /** ID de session unique */
  session_id?: string;
  /** Profil utilisateur (format alternatif) */
  user_profile?: UserProfile;
  /** Nom de la fonction demandée (optionnel) */
  function_name?: string;
  /** Activer le streaming */
  stream?: boolean;
}

/**
 * Représente une conversation sauvegardée dans l'interface.
 */
export interface ChatResponse {
  /** Reponse textuelle de Kossi */
  reply: string;
  /** Intention detectee (pour debug) */
  intent?: string;
  /** Sources consultées pour générer la réponse */
  sources?: Source[];
}

/**
 * Evenement SSE pour le streaming.
 */
export interface StreamEvent {
  /** Fragment de texte */
  chunk?: string;
  /** Indique la fin du stream */
  done?: boolean;
  /** Longueur totale de la reponse */
  total_length?: number;
  /** Agent ayant généré l'événement (optionnel) */
  agent?: string;
  /** Sources renvoyées en top-level ou via metadata */
  sources?: Source[];
  /** Indique si la réponse vient du cache */
  cached?: boolean;
  /** Temps de traitement en ms */
  processing_time?: number;
  /** Message d'erreur */
  error?: string;
  /** Metadata de la reponse */
  metadata?: {
    agent?: string;
    sources?: Source[];
    cached?: boolean;
    processing_time?: number;
  };
}

/**
 * Etat global du chat (version objet pour usage interne).
 */
export interface ChatStateObject {
  /** Liste des messages */
  messages: Message[];
  /** Indique si un message est en cours de generation */
  isGenerating: boolean;
  /** Message d'erreur eventuel */
  error: string | null;
}

/**
 * Suggestion de question predefinies.
 */
export interface QuickSuggestion {
  /** Texte affiche sur le bouton */
  label: string;
  /** Message envoye quand on clique */
  message: string;
  /** Icone optionnelle */
  icon?: string;
}
