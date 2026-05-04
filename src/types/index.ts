// ── Navigation ────────────────────────────────────────────────────────────────

export type Vue =
  | 'landing' | 'login'       | 'register'
  | 'home'    | 'catalog'     | 'book-detail'
  | 'clubs'   | 'club-detail'
  | 'events'  | 'event-detail'
  | 'news'    | 'news-detail'
  | 'favorites' | 'borrows'
  | 'profile' | 'settings'   | 'search'
  | 'ai-chat' | 'not-found';

// Alias pour compatibilité
export type View = Vue;


// ── Utilisateur ───────────────────────────────────────────────────────────────

export interface StatistiquesUtilisateur {
  livresLus:      number;
  avisPublies:    number;
  clubsRejoints:  number;
  evenementsParticipes: number;
  // Aliases anglais pour compatibilité UI
  booksRead?:        number;
  reviewsPosted?:    number;
  clubsJoined?:      number;
  eventsAttended?:   number;
}

// Alias pour compatibilité
export type UserStats = StatistiquesUtilisateur;

export interface Utilisateur {
  favorites: any;
  isMember: any;
  // Identité
  id:        string;
  prenom:    string;
  nom:       string;
  email:     string;
  type_compte : 'membre'|'non_membre'|'anonyme';
  pseudo?:   string;
  username?: string; // Pour compatibilité Django/Auth
  bio?:      string;
  avatar?:   string;

  // Aliases anglais (compatibilité UI)
  firstName?: string;
  lastName?:  string;
  educationLevel?: string;
  preferredGenres?: string[];
  createdAt?: string;
  sous_genre_prefere?: string[];

  // Statut & adhésion
  estMembre:  boolean;
  date_inscription: string;
  date_naissance:   string;

  // Profil démographique
  niveau_etude?:      string;   // 'Primaire' | 'Collège' | 'Lycée' | 'Université' | 'Professionnel' | 'Autre'
  classe?:            string;   // ex. 'MI L2', 'Tle', 'Médecine 3'

  // Préférences littéraires
  genresPreferes?:    string[];

  // Contenu personnel
  favoris:        string[];     // IDs de livres
  stats:          StatistiquesUtilisateur;
  clubsSuivis:    string[];     // IDs de clubs
  intentions?:    string[];     // Intentions de l'utilisateur
}

// Alias pour compatibilité
export type User = Utilisateur;


// ── Livre ─────────────────────────────────────────────────────────────────────

export type PublicCible = 'enfant' | 'ado' | 'adulte' | 'all';
export type TargetAudience = PublicCible;

export interface Livre {
  id:          string;
  titre:       string;
  auteur:      string;
  couverture?: string;

  genre:        string;
  annee?:       number;
  nbPages?:     number;
  langue?:      string;
  synopsis?:    string;

  note:        number;
  nbAvis:      number;

  estDisponible: boolean;
  estNouveau?:   boolean;
  estPopulaire?: boolean;

  publicCible?: PublicCible;
}

// Alias pour compatibilité
export type Book = Livre;


// ── Avis / Interaction ────────────────────────────────────────────────────────

export interface Avis {
  createdAt: string | number | Date;
  user: any;
  rating: number;
  comment: string;
  likes: number;
  id:           string;
  livreId:      string;
  utilisateurId: string;
  utilisateur:   Pick<Utilisateur, 'id' | 'prenom' | 'nom' | 'avatar'>;
  note:         number;           // 1–5
  commentaire:  string;
  mentionsJaime: number;
  dateCreation:  string;           // ISO date
}

// Alias pour compatibilité
export type Review = Avis;

export interface CommentaireAvis {
  id: string;
  nomUtilisateur: string;
  note: number;
  titre: string;
  commentaire: string;
  dateCreation: string;
  mentionsJaime: number;
  estAvisUtilisateur?: boolean;
  // Aliases anglais pour compatibilité UI
  userName?:       string;
  rating?:         number;
  title?:          string;
  comment?:        string;
  likes?:          number;
  createdAt?:      string;
  isUserReview?:   boolean;
}

// Alias pour compatibilité
export type ReviewComment = CommentaireAvis;


// ── Emprunt & Réservation ─────────────────────────────────────────────────────

export type StatutEmprunt = 'en_cours' | 'rendu' | 'perdu';
export type BorrowStatus = StatutEmprunt;

export interface LivreEmprunte {
  id:     string;
  titre:  string;
  auteur: string;
  couverture?: string;
  // Aliases anglais
  title?: string;
  author?: string;
  cover?: string;
}
export type BorrowBook = LivreEmprunte;

export interface Emprunt {
  id:                 string;
  utilisateurId:      string;
  livre:              LivreEmprunte;
  dateEmprunt:        string;          // date_prise
  dateRetourPrevue:   string;          // date_retour_prevue
  dateRetourReelle?:  string;          // date_retour_reelle
  renouvele:          boolean;
  statut:             StatutEmprunt;
  estProlonge:        boolean;         // prolongé
  // Aliases anglais
  book?:              LivreEmprunte;
  returnDate?:        string;
}

// Alias pour compatibilité
export type Borrow = Emprunt;

export type StatutReservation = 'pending' | 'available' | 'expired';
export type ReservationStatus = StatutReservation;

export interface Reservation {
  id:               string;
  utilisateurId:    string;
  livre:            LivreEmprunte;
  dateReservation:  string;          // ISO date
  statut:           StatutReservation;
  // Aliases anglais
  book?:            LivreEmprunte;
}


// ── Club de lecture ───────────────────────────────────────────────────────────

export type AudienceClub = 'children' | 'teen' | 'adult' | 'all';
export type ClubAudience = AudienceClub;

export interface ResponsableClub {
  nom:    string;
  role:   string;
  email:  string;
  name?:  string; // alias anglais
}
export type ClubManager = ResponsableClub;

export interface CoursClub {
  id:          string;
  titre:       string;
  niveau:      string;
  frequence:   string;
  description: string;
  // Aliases anglais
  title?:      string;
  level?:      string;
  frequency?:  string;
}
export type ClubCourse = CoursClub;

export interface ActiviteClub {
  id:             string;
  nomUtilisateur: string;
  activite:       string;
  date:           string;
  // Aliases anglais
  userName?:      string;
  activity?:      string;
}
export type ClubActivity = ActiviteClub;

export interface ReunionClub {
  id:       string;
  date:     string;
  heure:    string;
  lieu:     string;
}
export type ClubMeeting = ReunionClub;

export interface ClubLecture {
  id:             string;
  nom:            string;
  description:    string;
  image?:         string;
  publicCible:    AudienceClub;
  nbMembres:      number;
  estMembre?:     boolean;
  lienExterne?:   string;

  // Détails
  responsable?:    ResponsableClub;
  cours?:          CoursClub[];
  activiteRecente?: ActiviteClub[];
  prochainesReunions?: ReunionClub[];

  // Aliases anglais pour compatibilité UI
  name?:           string;
  targetAudience?: AudienceClub;
  memberCount?:    number;
  isJoined?:       boolean;
  externalLink?:   string;
  manager?:        ResponsableClub & { name?: string };
  courses?:        CoursClub[];
  recentActivity?: ActiviteClub[];
  nextMeetings?:   ReunionClub[];
}

// Alias pour compatibilité
export type ReadingClub = ClubLecture;


// ── Événement ─────────────────────────────────────────────────────────────────

export type TypeEvenement = 'club' | 'conference' | 'workshop';
export type EventType = TypeEvenement;

export interface Evenement {
  id:               string;
  titre:            string;
  description:      string;
  type:             TypeEvenement;
  date:             string;
  heure:            string;    // ex. '14h00'
  lieu:             string;
  nbParticipants:   number;
  participe?:       boolean;
  clubId?:          string;    // FK vers ClubLecture

  // Aliases anglais pour compatibilité UI
  title?:            string;
  time?:             string;
  location?:         string;
  participantCount?: number;
  isParticipating?:  boolean;
}

// Alias pour compatibilité
export type Event = Evenement;


// ── Actualité ─────────────────────────────────────────────────────────────────

export type CategorieActualite =
  | 'announcement'
  | 'event'
  | 'course'
  | 'visit'
  | 'closure'
  | 'general';
export type NewsCategory = CategorieActualite;

export interface Actualite {
  id:          string;
  titre:       string;
  resume:      string;
  contenu?:    string;
  image?:      string;
  date:        string;
  categorie:   CategorieActualite;
  misEnAvant?: boolean;

  // Aliases anglais
  category?:   CategorieActualite;
  title?:      string;
  featured?:   boolean;
  excerpt?:    string;
  content?:    string;
}

// Alias pour compatibilité
export type News = Actualite;


// ── Notification ──────────────────────────────────────────────────────────────

export type TypeNotification =
  | 'livre_disponible'
  | 'rappel_retour'
  | 'retard';
export type NotificationType = TypeNotification;

export interface Notification {
  id:            string;
  utilisateurId: string;
  livreId?:      string;
  type:          TypeNotification;
  message:       string;
  lu:            boolean;
  dateCreation:  string;
}


// ── Session IA ────────────────────────────────────────────────────────────────

export type Humeur =
  | 'léger' | 'intense' | 'évasion' | 'neutre'
  | 'triste' | 'aventurier' | 'romantique' | 'curieux'
  | 'nostalgique' | 'stressé' | 'détendu';

export interface SessionIA {
  id:                string;
  utilisateurId:     string;
  humeurDetectee?:   Humeur;
  livresAcceptes:    string[];   // IDs
  livresRejetes:     string[];   // IDs
  vecteurIntention?: Record<string, unknown>;
  dateCreation:      string;
  dateFermeture?:    string;
}


// ── Livre similaire (précalculé) ──────────────────────────────────────────────

export interface LivreSimilaire {
  livreSourceId:   string;
  livreCibleId:    string;
  scoreSimilarite: number;    // 0–1
  dateCalcul:      string;
}