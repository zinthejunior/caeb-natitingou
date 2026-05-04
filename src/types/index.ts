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
}

// Alias pour compatibilité
export type UserStats = StatistiquesUtilisateur;

export interface Utilisateur {
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
}


// ── Club de lecture ───────────────────────────────────────────────────────────

export type AudienceClub = 'children' | 'teen' | 'adult' | 'all';
export type ClubAudience = AudienceClub;

export interface ResponsableClub {
  nom:    string;
  role:   string;
  email:  string;
}
export type ClubManager = ResponsableClub;

export interface CoursClub {
  id:          string;
  titre:       string;
  niveau:      string;
  frequence:   string;
  description: string;
}
export type ClubCourse = CoursClub;

export interface ActiviteClub {
  id:             string;
  nomUtilisateur: string;
  activite:       string;
  date:           string;
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