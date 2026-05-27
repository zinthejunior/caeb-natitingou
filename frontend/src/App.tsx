import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// ── Route protégée ──────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { estAuthentifie, chargement } = useAuthentification();
  const location = useLocation();

  if (chargement) {
    return (
      <div className="min-h-screen bg-library-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!estAuthentifie) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// ── Route publique (redirige si déjà connecté) ──────────────────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { estAuthentifie, chargement } = useAuthentification();

  if (chargement) {
    return (
      <div className="min-h-screen bg-library-bg flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (estAuthentifie) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

// ── Layout avec navigation du bas ─────────────────────────────────────
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-20">{children}</div>
      <BottomNavigation />
    </>
  );
}

// ── App ────────────────────────────────────────────────────────────────
export default function App() {
  const { utilisateur: user, mettreAJourUtilisateur: updateUser, changerMotDePasse: changePassword, deconnexion: logout } = useAuthentification();

  const handleToggleFavorite = async (bookId: string) => {
    if (!user) return;
    const favoris = user.favoris || [];
    const newFavoris = favoris.includes(bookId)
      ? favoris.filter((id: string) => id !== bookId)
      : [...favoris, bookId];
    await updateUser({ favoris: newFavoris });
  };

  const handleUpdateUser = async (updates: any) => {
    return await updateUser(updates);
  };

  return (
    <>
      <Routes>
        {/* ── Authentification (publiques) ── */}
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* ── Pages protégées (avec bottom nav) ── */}
        <Route path="/home" element={
          <ProtectedRoute>
            <AppLayout><HomePage user={user!} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/catalog" element={
          <ProtectedRoute>
            <AppLayout><CatalogPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/catalog/:bookId" element={
          <ProtectedRoute>
            <AppLayout>
              <BookDetailPage user={user!} onToggleFavorite={handleToggleFavorite} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/clubs" element={
          <ProtectedRoute>
            <AppLayout><ClubsPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/clubs/:clubId" element={
          <ProtectedRoute>
            <AppLayout><ClubDetailPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/events" element={
          <ProtectedRoute>
            <AppLayout><EventsPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/events/:eventId" element={
          <ProtectedRoute>
            <AppLayout><EventDetailPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/news" element={
          <ProtectedRoute>
            <AppLayout><NewsPage user={user!} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/news/:newsId" element={
          <ProtectedRoute>
            <AppLayout><NewsDetailPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/favorites" element={
          <ProtectedRoute>
            <AppLayout>
              <FavoritesPage user={user} onToggleFavorite={handleToggleFavorite} />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/borrows" element={
          <ProtectedRoute>
            <AppLayout><BorrowsPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage
                user={user}
                onLogout={logout}
                onUpdateUser={handleUpdateUser}
              />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage
                user={user}
                onLogout={logout}
                onChangePassword={changePassword}
              />
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/search" element={
          <ProtectedRoute>
            <AppLayout><SearchPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <AppLayout><AIChatPage user={user} /></AppLayout>
          </ProtectedRoute>
        } />

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster position="top-center" richColors closeButton duration={3000} />
    </>
  );
}