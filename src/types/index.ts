// ── Navigation ────────────────────────────────────────────────────────────────

export type View =
  | 'landing' | 'login'       | 'register'
  | 'home'    | 'catalog'     | 'book-detail'
  | 'clubs'   | 'club-detail'
  | 'events'  | 'event-detail'
  | 'news'    | 'news-detail'
  | 'favorites' | 'borrows'
  | 'profile' | 'settings'   | 'search'
  | 'ai-chat' | 'not-found';


// ── Utilisateur ───────────────────────────────────────────────────────────────

export interface UserStats {
  booksRead:      number;
  reviewsPosted:  number;
  clubsJoined:    number;
  eventsAttended: number;
}



export interface User {
  // Identité
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  type_compte : 'membre'|'non-membre'|'anonyme';
  pseudo?:   string;
  username?: string; // Ajouté pour compatibilité avec certains composants
  bio?:      string;
  avatar?:   string;

  // Statut & adhésion
  isMember:  boolean;
  date_inscription: string;          // date — date d'inscription
  createdAt?: string;                // Alias pour date_inscription utilisé dans certains composants
  date_naissance: string;
  birthDate?: string;                // Alias pour date_naissance

  // Profil démographique
  niveau_etude?:      string;   // 'Primaire' | 'Collège' | 'Lycée' | 'Université' | 'Professionnel' | 'Autre'
  educationLevel?:    string;   // Alias pour niveau_etude
  classe?:            string;   // ex. 'MI L2', 'Tle', 'Médecine 3'

  // Préférences littéraires (conformes au schéma recommandation)
  preferredGenres:    string[];
  genre_prefere?:     string[];   // genre unique déclaré (système reco)
  sous_genre_prefere?: string[];  // sous-genre déclaré (système reco)

  // Score de confiance (calculé par le système de recommandation)
  score_confiance?: number;     // 0–1
  profil_complet?:  boolean

  // Contenu personnel
  favorites:      string[];     // IDs de livres
  stats:          UserStats;
  followedClubs:  string[];     // IDs de clubs
}


// ── Livre ─────────────────────────────────────────────────────────────────────

export type TargetAudience = 'enfant' | 'ado' | 'adulte' | 'all';

export interface Book {
  id:          string;
  title:       string;
  author:      string;
  cover?:      string;

  genre:        string;
  year?:        number;
  pages?:       number;
  langue?:    string;
  synopsis?:    string;

  rating:      number;
  reviewCount: number;

  isAvailable: boolean;
  isNew?:      boolean;
  isPopular?:  boolean;

  targetAudience?: TargetAudience;

  // Données système recommandation
  mots_cles?:      string[];
  sous_genre?:     string;
  vecteur_livre?:  Record<string, unknown>;
  nb_emprunts?:    number;
  popularite?:     number;
}


// ── Avis / Interaction ────────────────────────────────────────────────────────

export interface Review {
  id:        string;
  bookId:    string;
  userId:    string;
  user:      Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  rating:    number;           // 1–5
  comment:   string;
  likes:     number;
  createdAt: string;           // ISO date
}

export interface ReviewComment {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  likes: number;
  isUserReview?: boolean;
}

// ── Emprunt & Réservation ─────────────────────────────────────────────────────

export type BorrowStatus = 'en_cours' | 'rendu' | 'perdu';

export interface BorrowBook {
  id:     string;
  title:  string;
  author: string;
  cover?: string;
}

export interface Borrow {
  id:         string;
  userId:  string;
  book:       BorrowBook;
  borrowDate: string;          // ISO date — date_prise
  returnDate: string;          // ISO date — date_retour_prevue
  returnedAt?: string;         // ISO date — date_retour_reelle
  renouvele: boolean;         // renouvele
  statut:     BorrowStatus;
  isExtended: boolean;         // prolongé
  poids?:     number;          // poids dans le système de recommandation
}

export type ReservationStatus = 'pending' | 'available' | 'expired';

export interface Reservation {
  id:         string;
  userId: string;
  book:       BorrowBook;
  reservedAt: string;          // ISO date
  status:     ReservationStatus;
}


// ── Club de lecture ───────────────────────────────────────────────────────────

export type ClubAudience = 'children' | 'teen' | 'adult' | 'all';

export interface ClubManager {
  name:   string;
  role:   string;
  email:  string;
}

export interface ClubCourse {
  id:          string;
  title:       string;
  level:       string;
  frequency:   string;
  description: string;
}

export interface ClubActivity {
  id:       string;
  userName: string;
  activity: string;
  date:     string;            // ISO date
}

export interface ClubMeeting {
  id:       string;
  date:     string;            // ISO date
  time:     string;
  location: string;
}

export interface ReadingClub {
  id:           string;
  name:         string;
  description:  string;
  image?:       string;
  targetAudience: ClubAudience;
  memberCount:  number;
  isJoined?:    boolean;
  externalLink?: string;

  // Champs détaillés (ClubDetailPage)
  manager?:       ClubManager;
  courses?:       ClubCourse[];
  recentActivity?: ClubActivity[];
  nextMeetings?:  ClubMeeting[];
}


// ── Événement ─────────────────────────────────────────────────────────────────

export type EventType = 'club' | 'conference' | 'workshop';

export interface Event {
  id:               string;
  title:            string;
  description:      string;
  type:             EventType;
  date:             string;    // date
  time:             string;    // ex. '14h00'
  location:         string;
  participantCount: number;
  isParticipating?: boolean;
  clubId?:          string;    // FK vers ReadingClub
}


// ── Actualité ─────────────────────────────────────────────────────────────────

export type NewsCategory =
  | 'announcement'
  | 'event'
  | 'course'
  | 'visit'
  | 'closure'
  | 'general';

export interface News {
  id:        string;
  title:     string;
  excerpt:   string;
  content?:  string;
  image?:    string;
  date:      string;           // date
  category:  NewsCategory;
  featured?: boolean;
}


// ── Notification ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'livre_disponible'
  | 'nouvelle_recommandation'
  | 'rappel_retour'
  | 'retard';

export interface Notification {
  id:        string;
  userId:    string;
  livreId?:  string;
  type:      NotificationType;
  message:   string;
  lu:        boolean;
  createdAt: string;           // date
}


// ── Session IA ────────────────────────────────────────────────────────────────

export type Humeur =
  | 'léger' | 'intense' | 'évasion' | 'neutre'
  | 'triste' | 'aventurier' | 'romantique' | 'curieux'
  | 'nostalgique' | 'stressé' | 'détendu';

export interface SessionIA {
  id:              string;
  userId:          string;
  humeurDetectee?: Humeur;
  livresAcceptes:  string[];   // IDs
  livresRejetes:   string[];   // IDs
  vecteurIntention?: Record<string, unknown>;
  createdAt:       string;     // date
  closedAt?:       string;     // date
}


// ── Livre similaire (précalculé) ──────────────────────────────────────────────

export interface LivreSimilaire {
  livreSourceId:  string;
  livreCibleId:   string;
  scoreSimilarite: number;    // 0–1
  dateCalcul:     string;     // date
}