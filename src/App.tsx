import { useState, useCallback, useEffect } from 'react';
import { Toaster } from 'sonner';

// ── Pages ──────────────────────────────────────────────────────────────
import { LandingPage }    from '@/sections/LandingPage';
import { LoginPage }      from '@/sections/LoginPage';
import { RegisterPage }   from '@/sections/RegisterPage';
import { HomePage }       from '@/sections/HomePage';
import { CatalogPage }    from '@/sections/CatalogPage';
import { BookDetailPage } from '@/sections/BookDetailPage';
import { ClubsPage }      from '@/sections/ClubsPage';
import { ClubDetailPage } from '@/sections/ClubDetailPage';
import { EventsPage }     from '@/sections/EventsPage';
import { EventDetailPage } from '@/sections/EventDetailPage';
import { NewsPage }       from '@/sections/NewsPage';
import { NewsDetailPage } from '@/sections/NewsDetailPage';
import { FavoritesPage }  from '@/sections/FavoritesPage';
import { BorrowsPage }    from '@/sections/BorrowsPage';
import { ProfilePage }    from '@/sections/ProfilePage';
import { SettingsPage }   from '@/sections/SettingsPage';
import { SearchPage }     from '@/sections/SearchPage';
import { AIChatPage }     from '@/sections/AIChatPage';
import { NotFoundPage }   from '@/sections/NotFoundPage';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useAuthentification } from '@/hooks/useAuthentification';


import type { Utilisateur as User } from '@/types';

// ── Types ──────────────────────────────────────────────────────────────

export type View =
  | 'landing' | 'login'      | 'register'
  | 'home'    | 'catalog'    | 'book-detail'
  | 'clubs'   | 'club-detail'
  | 'events'  | 'event-detail'
  | 'news'    | 'news-detail'
  | 'favorites' | 'borrows'
  | 'profile' | 'settings'   | 'search'
  | 'ai-chat' | 'not-found';

interface NavParams {
  bookId?:  string;
  clubId?:  string;
  eventId?: string;
  newsId?:  string;
}

// Vues protégées / publiques ─────────────────────────────────────────

const AUTH_VIEWS:      View[] = ['landing', 'login', 'register'];
const PROTECTED_VIEWS: View[] = [
  'home', 'catalog', 'book-detail',
  'clubs', 'club-detail',
  'events', 'event-detail',
  'news', 'news-detail',
  'favorites', 'borrows',
  'profile', 'settings', 'search', 'ai-chat',
];

// ── App ────────────────────────────────────────────────────────────────

export default function App() {

  // ── State ────────────────────────────────────────────────────────────

  const { 
    utilisateur: user, 
    estAuthentifie: isAuthenticated, 
    connexion: login, 
    inscription: register, 
    deconnexion: logout, 
    mettreAJourUtilisateur: updateUser, 
    changerMotDePasse: changePassword 
  } = useAuthentification();

  // ── Thème persisté ───────────────────────────────────────────────────
  useEffect(() => {
    const savedTheme = localStorage.getItem('caeb_theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const parseHash = () => {
    const hash = window.location.hash.slice(1);
    if (!hash) return { view: 'landing' as View, params: {} };
    
    const [viewPart, paramsPart] = hash.split('?');
    const params = paramsPart ? Object.fromEntries(new URLSearchParams(paramsPart)) : {};
    return { view: (viewPart || 'landing') as View, params };
  };

  const [currentView, setCurrentView] = useState<View>(() => parseHash().view);
  const [navParams, setNavParams] = useState<NavParams>(() => parseHash().params);

  useEffect(() => {
    const handleHashChange = () => {
      const { view, params } = parseHash();
      setCurrentView(view);
      setNavParams(params);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isAuthenticated && (currentView === 'landing' || currentView === 'login' || currentView === 'register')) {
      navigateTo('home', undefined, true);
    } else if (!isAuthenticated && PROTECTED_VIEWS.includes(currentView)) {
      navigateTo('landing', undefined, true);
    }
  }, [isAuthenticated, currentView]);

  // ── Vue résolue (pas de useEffect setState) ───────────────────────────
  // On calcule directement la vue à afficher sans passer par un effect.
  const resolvedView: View = (() => {
    if (!isAuthenticated && PROTECTED_VIEWS.includes(currentView)) return 'landing';
    if (isAuthenticated  && AUTH_VIEWS.includes(currentView))      return 'home';
    return currentView;
  })();

  // ── Navigation ───────────────────────────────────────────────────────

  const navigateTo = useCallback((view: View, params?: NavParams, replace = false) => {
    setCurrentView(view);
    setNavParams(params ?? {});
    
    let hash = `#${view}`;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params as Record<string, string>);
      hash += `?${searchParams.toString()}`;
    }
    
    if (window.location.hash !== hash) {
      if (replace) {
        window.history.replaceState(null, '', hash);
      } else {
        window.history.pushState(null, '', hash);
      }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Variante compatible avec les pages qui typent onNavigate en (string)
  const navigateLoose = navigateTo as (view: string, params?: NavParams) => void;

  // ── Auth handlers ────────────────────────────────────────────────────

  const handleLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    const success = await login(email, password);
    if (success) navigateTo('home');
    return success;
  }, [login]);

  const handleRegister = useCallback(async (data: any): Promise<boolean> => {
    const success = await register(data);
    if (success) navigateTo('home');
    return success;
  }, [register]);

  const handleLogout = useCallback(() => {
    logout();
    navigateTo('landing');
  }, [logout]);

  // ── Écouteurs d'événements globaux ───────────────────────────────────

  useEffect(() => {
    const handleNavigate = (e: any) => {
      const { view, params } = e.detail;
      navigateTo(view, params);
    };

    const handleLogoutEvent = () => {
      handleLogout();
    };

    window.addEventListener('app:navigate', handleNavigate as EventListener);
    window.addEventListener('app:logout', handleLogoutEvent as EventListener);

    return () => {
      window.removeEventListener('app:navigate', handleNavigate as EventListener);
      window.removeEventListener('app:logout', handleLogoutEvent as EventListener);
    };
  }, [navigateTo, handleLogout]);

  // ── Favoris (persistés) ──────────────────────────────────────────────

  const handleToggleMemberStatus = useCallback(() => {
    if (!user) return;
    void updateUser({ isMember: !user.isMember, type_compte: !user.isMember ? 'membre' : 'non_membre' });
  }, [user, updateUser]);

  const handleUpdateUser = useCallback(async (updates: Partial<User>) => {
    await updateUser(updates);
    return true;
  }, [updateUser]);

  const handleToggleFavorite = useCallback(async (bookId: string) => {
    if (!user) return;
    const favorites = user.favorites || [];
    const newFavorites = favorites.includes(bookId)
      ? favorites.filter(id => id !== bookId)
      : [...favorites, bookId];
    
    await updateUser({ favorites: newFavorites });
  }, [user, updateUser]);

  // ── Rendu ────────────────────────────────────────────────────────────

  const renderPage = () => {
    switch (resolvedView) {

      // ── Authentification ────────────────────────────────────────────

      case 'landing':
        return (
          <LandingPage
            onLoginClick={() => navigateTo('login')}
            onRegisterClick={() => navigateTo('register')}
          />
        );

      case 'login':
        return (
          <LoginPage
            onLogin={handleLogin}
            onBack={() => navigateTo('landing')}
            onRegisterClick={() => navigateTo('register')}
            isLoading={false}
          />
        );

      case 'register':
        return (
          <RegisterPage
            onRegister={handleRegister}
            onBack={() => navigateTo('landing')}
            onLoginClick={() => navigateTo('login')}
            isLoading={false}
          />
        );

      // ── Pages principales ───────────────────────────────────────────

      case 'home':
        return (
          <HomePage
            user={user!}
            onNavigate={navigateTo}
          />
        );

      case 'catalog':
        return (
          <CatalogPage
            user={user}
            onBookClick={(bookId) => navigateTo('book-detail', { bookId })}
          />
        );

      case 'book-detail':
        return navParams.bookId ? (
          <BookDetailPage
            bookId={navParams.bookId}
            user={user!}
            onBack={() => navigateTo('catalog')}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : <NotFoundPage user={user} onNavigate={navigateLoose as (view: string) => void} />;

      // ── Clubs ───────────────────────────────────────────────────────

      case 'clubs':
        return (
          <ClubsPage
            user={user}
            onClubClick={(clubId) => navigateTo('club-detail', { clubId })}
          />
        );

      case 'club-detail':
        return navParams.clubId ? (
          <ClubDetailPage
            clubId={navParams.clubId}
            user={user}
            onBack={() => navigateTo('clubs')}
          />
        ) : <NotFoundPage user={user} onNavigate={navigateLoose as (view: string) => void} />;

      // ── Événements ──────────────────────────────────────────────────

      case 'events':
        return (
          <EventsPage
            user={user}
            onEventClick={(eventId) => navigateTo('event-detail', { eventId })}
          />
        );

      case 'event-detail':
        return navParams.eventId ? (
          <EventDetailPage
            eventId={navParams.eventId}
            user={user}
            onBack={() => navigateTo('events')}
          />
        ) : <NotFoundPage user={user} onNavigate={navigateLoose as (view: string) => void} />;

      // ── Actualités ──────────────────────────────────────────────────

      case 'news':
        return (
          <NewsPage
            user={user!}  // NewsPage exige User non-null ; resolvedView garantit user !== null ici
            onNewsClick={(newsId) => navigateTo('news-detail', { newsId })}
          />
        );

      case 'news-detail':
        return navParams.newsId ? (
          <NewsDetailPage
            newsId={navParams.newsId}
            user={user}
            onBack={() => navigateTo('news')}
          />
        ) : <NotFoundPage user={user} onNavigate={navigateLoose as (view: string) => void} />;

      // ── Espace personnel ────────────────────────────────────────────

      case 'favorites':
        return (
          <FavoritesPage
            user={user}
            onNavigate={navigateLoose}
            onToggleFavorite={handleToggleFavorite}
          />
        );

      case 'borrows':
        return <BorrowsPage user={user} />;

      case 'profile':
        return (
          <ProfilePage
            user={user}
            onLogout={handleLogout}
            onToggleMemberStatus={handleToggleMemberStatus}
            onNavigate={navigateLoose}
            onUpdateUser={handleUpdateUser}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            user={user}
            onLogout={handleLogout}
            onChangePassword={changePassword}
          />
        );

      // ── Recherche & IA ──────────────────────────────────────────────

      case 'search':
        return (
          <SearchPage
            user={user}
            onNavigate={navigateLoose}
          />
        );

      case 'ai-chat':
        return (
          <AIChatPage
            user={user}
            onNavigate={navigateLoose}
          />
        );

      // ── 404 ─────────────────────────────────────────────────────────

      default:
        return (
          <NotFoundPage
            user={user}
            onNavigate={navigateLoose as (view: string) => void}
          />
        );
    }
  };

  return (
    <>
      <div className={!AUTH_VIEWS.includes(resolvedView) ? "pb-20" : ""}>
        {renderPage()}
      </div>
      {!AUTH_VIEWS.includes(resolvedView) && (
        <BottomNavigation 
          currentView={resolvedView} 
          onNavigate={navigateLoose as (view: View) => void} 
        />
      )}
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
      />
    </>
  );
}