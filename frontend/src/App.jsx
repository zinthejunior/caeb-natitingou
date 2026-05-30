/**
 * =============================================================================
 * FICHIER PRINCIPAL DE L'APPLICATION (App.jsx)
 * =============================================================================
 * 
 * Ce fichier est le point d'entrée principal de l'application React.
 * Il définit toutes les routes (URLs) et gère l'authentification globale.
 * 
 * QU'EST-CE QU'UN FICHIER APP.JSX ?
 * - C'est le "chef d'orchestre" de votre application React
 * - Il décide quelle page afficher selon l'URL dans le navigateur
 * - Il gère les données partagées entre toutes les pages (ex: utilisateur connecté)
 * 
 * ARCHITECTURE DE L'APPLICATION :
 * 
 * 1. ROUTES PUBLIQUES (accessibles sans connexion) :
 *    - / : Page d'accueil (Landing Page) - première page vue par les visiteurs
 *    - /login : Page de connexion - pour les utilisateurs existants
 *    - /register : Page d'inscription - pour créer un nouveau compte
 * 
 * 2. ROUTES PROTÉGÉES (nécessitent une connexion) :
 *    - /home : Tableau de bord utilisateur - page d'accueil après connexion
 *    - /catalog : Catalogue des livres - parcourir tous les livres
 *    - /clubs : Clubs culturels - rejoindre des clubs de lecture
 *    - /events : Agenda des événements - voir les événements à venir
 *    - /news : Actualités - lire les dernières nouvelles
 *    - /favorites : Livres favoris - voir ses livres préférés
 *    - /borrows : Emprunts en cours - gérer ses emprunts
 *    - /profile : Profil utilisateur - modifier ses informations
 *    - /settings : Paramètres - configurer l'application
 *    - /search : Recherche - chercher dans le catalogue
 *    - /chat : Assistant IA - discuter avec l'assistant
 * 
 * CONCEPTS REACT UTILISÉS :
 * - React Router : bibliothèque qui gère les URLs et la navigation
 * - Routes imbriquées : Layout commun (AppLayout) pour les pages protégées
 * - Protection des routes : redirection automatique si non authentifié
 * - State lifting : les données utilisateur sont gérées ici et passées aux enfants via "props"
 * 
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION IMPORTS - Chargement des dépendances et composants nécessaires
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IMPORT : react-router-dom
 * 
 * C'est une bibliothèque qui permet de créer une navigation dans l'application.
 * Sans elle, changer d'URL rechargerait la page entière !
 * 
 * - Routes : Conteneur qui englobe toutes les routes de l'application
 * - Route : Définit une correspondance entre une URL et un composant à afficher
 * - Navigate : Composant qui redirige automatiquement vers une autre URL
 * - useLocation : Hook qui donne accès à l'URL actuelle (utile pour les redirections)
 */
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";

/**
 * IMPORT : sonner (Toaster)
 * 
 * Bibliothèque pour afficher des notifications "toast" (petits messages temporaires).
 * Exemple : "Connexion réussie !" ou "Erreur lors de l'enregistrement"
 * Le Toaster est le conteneur qui affiche ces messages en haut de l'écran.
 */
import { Toaster } from "sonner";

// ─── IMPORT DES PAGES ────────────────────────────────────────────────────────
// Chaque page est un composant React dans le dossier sections/
// Un composant = un fichier qui retourne du JSX (HTML + JavaScript)

/**
 * LandingPage : Page d'accueil publique
 * C'est la première page que voient les visiteurs non connectés.
 * Elle présente la bibliothèque et incite à s'inscrire.
 */
import { LandingPage } from "@/sections/LandingPage";

/**
 * LoginPage : Page de connexion
 * Formulaire email + mot de passe pour les utilisateurs existants.
 */
import { LoginPage } from "@/sections/LoginPage";

/**
 * RegisterPage : Page d'inscription
 * Formulaire multi-étapes pour créer un nouveau compte.
 */
import { RegisterPage } from "@/sections/RegisterPage";

/**
 * HomePage : Tableau de bord utilisateur
 * Page d'accueil personnalisée après connexion avec recommandations.
 */
import { HomePage } from "@/sections/HomePage";

/**
 * CatalogPage : Catalogue des livres
 * Liste tous les livres avec recherche, filtres et tri.
 */
import { CatalogPage } from "@/sections/CatalogPage";

/**
 * BookDetailPage : Détail d'un livre
 * Affiche toutes les informations d'un livre spécifique.
 */
import { BookDetailPage } from "@/sections/BookDetailPage";
import { RecommendationsPage } from "@/sections/RecommendationsPage";
import { toggleFavorite } from "@/hooks/useData";

/**
 * ClubsPage : Liste des clubs culturels
 * Affiche tous les clubs disponibles (lecture, danse, IA, etc.)
 */
import { ClubsPage } from "@/sections/ClubsPage";

/**
 * ClubDetailPage : Détail d'un club
 * Informations détaillées sur un club spécifique.
 */
import { ClubDetailPage } from "@/sections/ClubDetailPage";

/**
 * EventsPage : Agenda des événements
 * Liste les événements à venir (conférences, ateliers, etc.)
 */
import { EventsPage } from "@/sections/EventsPage";

/**
 * EventDetailPage : Détail d'un événement
 * Informations complètes sur un événement spécifique.
 */
import { EventDetailPage } from "@/sections/EventDetailPage";

/**
 * NewsPage : Page des actualités
 * Affiche les dernières nouvelles de la bibliothèque.
 */
import { NewsPage } from "@/sections/NewsPage";

/**
 * NewsDetailPage : Détail d'une actualité
 * Contenu complet d'un article d'actualité.
 */
import { NewsDetailPage } from "@/sections/NewsDetailPage";

/**
 * FavoritesPage : Livres favoris
 * Liste des livres marqués comme favoris par l'utilisateur.
 */
import { FavoritesPage } from "@/sections/FavoritesPage"; 

/**
 * BorrowsPage : Emprunts en cours
 * Gestion des livres actuellement empruntés.
 */
import { BorrowsPage } from "@/sections/BorrowsPage";

/**
 * ProfilePage : Profil utilisateur
 * Permet de voir et modifier ses informations personnelles.
 */
import { ProfilePage } from "@/sections/ProfilePage";

/**
 * SettingsPage : Paramètres de l'application
 * Configuration du compte, thème, notifications, etc.
 */
import { SettingsPage } from "@/sections/SettingsPage";

/**
 * SearchPage : Page de recherche
 * Recherche avancée dans tout le catalogue.
 */
import { SearchPage } from "@/sections/SearchPage";

/**
 * AIChatPage : Assistant IA
 * Interface de discussion avec l'assistant virtuel.
 */
import { AIChatPage } from "@/sections/AIChatPage";

/**
 * NotFoundPage : Page 404
 * Affichée quand l'URL demandée n'existe pas.
 */
import { NotFoundPage } from "@/sections/NotFoundPage";

// ─── COMPOSANTS PARTAGÉS ─────────────────────────────────────────────────────
// Ces composants sont utilisés dans plusieurs pages

/**
 * BottomNavigation : Barre de navigation en bas de l'écran
 * Permet de naviguer rapidement entre les pages principales (mobile-first design).
 */
import { BottomNavigation } from "@/components/BottomNavigation";

/**
 * useAuthentification : Hook personnalisé pour gérer l'authentification
 * 
 * Un "hook" est une fonction spéciale React qui commence par "use".
 * Ce hook fournit :
 * - utilisateur : les données de l'utilisateur connecté (ou null si non connecté)
 * - estAuthentifie : booléen indiquant si quelqu'un est connecté
 * - connexion/deconnexion : fonctions pour se connecter/déconnecter
 * - mettreAJourUtilisateur : fonction pour modifier le profil
 */
import { AuthProvider, useAuthentification } from "@/hooks/useAuthentification";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT : ProtectedRoute
 * ─────────────────────────────────────────────────────────────────────────────
 * Protège les routes qui nécessitent une authentification.
 * Si l'utilisateur n'est pas connecté, il est redirigé vers la page d'accueil.
 * 
 * @param {ReactNode} children - Le contenu à afficher si authentifié
 * 
 * FONCTIONNEMENT :
 * 1. Vérifie si l'utilisateur est authentifié via useAuthentification()
 * 2. Pendant le chargement : affiche un spinner
 * 3. Si non authentifié : redirige vers "/"
 * 4. Si authentifié : affiche le contenu demandé
 */
function ProtectedRoute({ children }) {
  const { estAuthentifie, chargement } = useAuthentification();
  const location = useLocation();
  
  // Affichage du spinner pendant la vérification de l'authentification
  if (chargement) {
    return <div className="min-h-screen bg-library-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>;
  }
  
  // Redirection si non authentifié (avec sauvegarde de l'URL d'origine)
  if (!estAuthentifie) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT : PublicRoute
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère les routes publiques (login, register).
 * Si l'utilisateur est déjà connecté, il est redirigé vers /home.
 * Évite qu'un utilisateur connecté accède aux pages de connexion.
 */
function PublicRoute({ children }) {
  const { estAuthentifie, chargement } = useAuthentification();
  
  if (chargement) {
    return <div className="min-h-screen bg-library-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>;
  }
  
  // Redirection si déjà connecté
  if (estAuthentifie) {
    return <Navigate to="/home" replace />;
  }
  
  return <>{children}</>;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT : AppLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Layout commun pour toutes les pages protégées.
 * Ajoute automatiquement la barre de navigation en bas de l'écran.
 * Le padding-bottom (pb-20) laisse de l'espace pour la navigation.
 */
function AppLayout({ children }) {
  return <>
      <div className="pb-20">{children}</div>
      <BottomNavigation />
    </>;
}
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPOSANT PRINCIPAL : App
 * ─────────────────────────────────────────────────────────────────────────────
 * Point d'entrée de l'application. Définit toutes les routes et gère
 * les données utilisateur partagées entre les pages.
 */
function AppRoutes() {
  // ─── RÉCUPÉRATION DES DONNÉES D'AUTHENTIFICATION ───────────────────────────
  // useAuthentification() est un hook personnalisé qui gère :
  // - L'état de connexion (utilisateur, tokens JWT)
  // - Les fonctions de connexion/déconnexion
  // - La mise à jour du profil
  const { utilisateur: user, mettreAJourUtilisateur: updateUser, changerMotDePasse: changePassword, deconnexion: logout, recupererUtilisateur } = useAuthentification();
  
  /**
   * Gère l'ajout/suppression d'un livre des favoris
   * Cette fonction est passée aux composants enfants via props
   */
  const handleToggleFavorite = async (bookId) => {
    if (!user) return;
    try {
      await toggleFavorite(bookId);
      if (recupererUtilisateur) {
        await recupererUtilisateur();
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour des favoris");
    }
  };
  
  /**
   * Wrapper pour la mise à jour du profil utilisateur
   */
  const handleUpdateUser = async (updates) => {
    return await updateUser(updates);
  };
  
  const navigate = useNavigate();

  const handleBookClick = (bookId) => {
    if (!bookId) return;
    navigate(`/catalog/${bookId}`);
  };

  const handleClubClick = (clubId) => {
    if (!clubId) return;
    navigate(`/clubs/${clubId}`);
  };

  const handleEventClick = (eventId) => {
    if (!eventId) return;
    navigate(`/events/${eventId}`);
  };

  const handleNewsClick = (newsId) => {
    if (!newsId) return;
    navigate(`/news/${newsId}`);
  };

  const handleNavigate = (view, params = {}) => {
    switch (view) {
      case "home":
        return navigate("/home");
      case "catalog":
        return navigate("/catalog");
      case "book-detail":
        return params.bookId ? navigate(`/catalog/${params.bookId}`) : null;
      case "club-detail":
        return params.clubId ? navigate(`/clubs/${params.clubId}`) : null;
      case "event-detail":
        return params.eventId ? navigate(`/events/${params.eventId}`) : null;
      case "news-detail":
        return params.newsId ? navigate(`/news/${params.newsId}`) : null;
      case "recommendations":
        return navigate("/recommendations");
      default:
        return typeof view === "string" ? navigate(view) : null;
    }
  };

  // ─── RENDU DES ROUTES ──────────────────────────────────────────────────────
  return <>
      {/* Routes : définit quelle page afficher selon l'URL */}
      <Routes>
        {/* ══════════════════════════════════════════════════════════════════
            ROUTES PUBLIQUES (accessibles sans connexion)
            ══════════════════════════════════════════════════════════════════ */}
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* ══════════════════════════════════════════════════════════════════
            ROUTES PROTÉGÉES (nécessitent une connexion)
            Chaque route est enveloppée dans ProtectedRoute et AppLayout
            ══════════════════════════════════════════════════════════════════ */}
        
        {/* Page d'accueil utilisateur */}
        <Route path="/home" element={<ProtectedRoute>
            <AppLayout><HomePage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* Catalogue des livres */}
        <Route path="/catalog" element={<ProtectedRoute>
            <AppLayout><CatalogPage user={user} onBookClick={handleBookClick} /></AppLayout>
          </ProtectedRoute>} />

        {/* Recommandations */}
        <Route path="/recommendations" element={<ProtectedRoute>
            <AppLayout><RecommendationsPage user={user} onNavigate={handleNavigate} /></AppLayout>
          </ProtectedRoute>} />

        {/* Détail d'un livre (URL dynamique avec :bookId) */}
        <Route path="/catalog/:bookId" element={<ProtectedRoute>
            <AppLayout>
              <BookDetailPage user={user} onToggleFavorite={handleToggleFavorite} />
            </AppLayout>
          </ProtectedRoute>} />

        {/* Clubs culturels */}
        <Route path="/clubs" element={<ProtectedRoute>
            <AppLayout><ClubsPage user={user} onClubClick={handleClubClick} /></AppLayout>
          </ProtectedRoute>} />

        <Route path="/clubs/:clubId" element={<ProtectedRoute>
            <AppLayout><ClubDetailPage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* Événements */}
        <Route path="/events" element={<ProtectedRoute>
            <AppLayout><EventsPage user={user} onEventClick={handleEventClick} /></AppLayout>
          </ProtectedRoute>} />

        <Route path="/events/:eventId" element={<ProtectedRoute>
            <AppLayout><EventDetailPage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* Actualités */}
        <Route path="/news" element={<ProtectedRoute>
            <AppLayout><NewsPage user={user} onNewsClick={handleNewsClick} /></AppLayout>
          </ProtectedRoute>} />

        <Route path="/news/:newsId" element={<ProtectedRoute>
            <AppLayout><NewsDetailPage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* Favoris et Emprunts */}
        <Route path="/favorites" element={<ProtectedRoute>
            <AppLayout>
              <FavoritesPage user={user} onToggleFavorite={handleToggleFavorite} />
            </AppLayout>
          </ProtectedRoute>} />

        <Route path="/borrows" element={<ProtectedRoute>
            <AppLayout><BorrowsPage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* Profil et Paramètres utilisateur */}
        <Route path="/profile" element={<ProtectedRoute>
            <AppLayout>
              <ProfilePage
    user={user}
    onLogout={logout}
    onUpdateUser={handleUpdateUser}
  />
            </AppLayout>
          </ProtectedRoute>} />

        <Route path="/settings" element={<ProtectedRoute>
            <AppLayout>
              <SettingsPage
    user={user}
    onLogout={logout}
    onChangePassword={changePassword}
  />
            </AppLayout>
          </ProtectedRoute>} />

        {/* Recherche et Assistant IA */}
        <Route path="/search" element={<ProtectedRoute>
            <AppLayout><SearchPage user={user} onNavigate={handleNavigate} /></AppLayout>
          </ProtectedRoute>} />

        <Route path="/chat" element={<ProtectedRoute>
            <AppLayout><AIChatPage user={user} /></AppLayout>
          </ProtectedRoute>} />

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 404 - Route catch-all pour les URLs non reconnues
            ══════════════════════════════════════════════════════════════════ */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* ─── SYSTÈME DE NOTIFICATIONS ─────────────────────────────────────────
          Toaster de Sonner : affiche les messages toast (succès, erreurs, etc.)
          Position en haut au centre, avec bouton de fermeture */}
      <Toaster position="top-center" richColors closeButton duration={3e3} />
    </>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
