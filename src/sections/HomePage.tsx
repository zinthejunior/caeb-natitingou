/**
 * HomePage.tsx
 *
 * Cette page sert de tableau de bord principal pour l'utilisateur connecté.
 * Elle affiche un message personnalisé, des sections de recommandations,
 * des nouveautés, des livres populaires et un aperçu des événements.
 * Les données sont rafraîchies depuis les hooks partagés et le SEO est mis à jour.
 */
import { useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Calendar, Star, ChevronRight, Flame, Sparkles, TrendingUp, Lock, Newspaper, Heart, BookOpen } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Button } from '@/components/ui/button';
import type { View, User, Book, Event, News } from '@/types';
import { useLivres, useEvenements, useActualites, useRecommandations, useGlobalStats } from '@/hooks/useData';
import { useSEO } from '@/lib/utils';

interface HomePageProps {
  user: User;
  onNavigate: (view: View, params?: { bookId?: string; clubId?: string; eventId?: string; newsId?: string }) => void;
}

// ── SQUELETTES ─────────────────────────────────────────────────────────

function SkeletonBookCard() {
  return (
    <div className="flex flex-col h-full">
      <div className="skeleton skeleton-book-cover mb-3" />
      <div className="space-y-2">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text w-3/4" />
        <div className="skeleton skeleton-badge w-12 mt-1" />
      </div>
    </div>
  );
}

function SkeletonEventCard() {
  return (
    <div className="surface rounded-xl p-3 border border-[var(--border-color)] flex items-center gap-4">
      <div className="skeleton w-14 h-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton skeleton-text w-4/5" />
        <div className="skeleton skeleton-text-sm w-2/3" />
      </div>
    </div>
  );
}

function SkeletonNewsCard() {
  return (
    <div className="surface rounded-2xl overflow-hidden border border-[var(--border-color)]">
      <div className="skeleton w-full" style={{ aspectRatio: '16/9', borderRadius: 0 }} />
      <div className="p-4 space-y-3">
        <div className="skeleton skeleton-badge w-16" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text w-4/5" />
      </div>
    </div>
  );
}

// ── PAGE ──────────────────────────────────────────────────────────────

export function HomePage({ user, onNavigate }: HomePageProps) {
  // Définit un message de salutation selon l'heure actuelle.
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  });

  // Statistiques globales utilisées pour personnaliser le titre et le méta-description.
  const { stats } = useGlobalStats();
  const bookCount = stats?.books_count?.toLocaleString() ?? '...';

  useSEO(
    "Accueil",
    `Découvrez la collection de ${bookCount} ouvrages de la Bibliothèque CAEB de Natitingou, réservez vos livres et participez à nos événements.`
  );

  const [dataReady, setDataReady] = useState(false);
  const { livres: books } = useLivres();
  const { evenements: events } = useEvenements();
  const { actualites: news } = useActualites();
  const { recommandations } = useRecommandations();
  const [iaBooks, setIaBooks] = useState<Book[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDataReady(true), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (recommandations?.recommendations) {
      setIaBooks(recommandations.recommendations);
    }
  }, [recommandations]);

  // Choix de livres recommandés : priorité aux recommandations IA, sinon aux genres préférés, sinon sélection globale.
  const recommendedBooks = iaBooks.length > 0
    ? iaBooks.slice(0, 4)
    : (user?.genresPreferes && user.genresPreferes.length > 0)
      ? books.filter((b: any) => user.genresPreferes?.includes(b.genre || '')).slice(0, 4)
      : books.slice(0, 4);

  // Nouvelles parution détectées par l'attribut estNouveau dans les données du livre.
  const newBooks = books.filter((b: any) => Boolean((b as unknown as Record<string, unknown>).estNouveau)).slice(0, 4);
  const latestNews = news.slice(0, 3);
  const popularBooks = books.filter((b: any) => Boolean((b as unknown as Record<string, unknown>).estPopulaire)).slice(0, 4);
  const upcomingEvents = events
    .filter((event: any) => new Date(event.date) >= new Date())
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-library-bg pb-24 transition-colors duration-300">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── COLONNE PRINCIPALE ── */}
          <div className="lg:col-span-8 space-y-10">

            {/* Hero card avec Mesh Gradient */}
            <header className="relative overflow-hidden rounded-[2rem] mesh-gradient-light dark:mesh-gradient-dark border border-[var(--border-color)] shadow-elevated transition-all duration-500 hover:shadow-glow animate-flow-in">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--library-accent)]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-float" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--library-accent)]/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none animate-float" style={{ animationDelay: '2s' }} />

              <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                <div className="flex-1">
                  <p className="text-muted font-medium mb-1 opacity-80">{greeting},</p>
                  <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 text-primary tracking-tight">
                    <span className="text-gradient">{user?.prenom || 'Utilisateur'}</span> !
                  </h1>
                  <p className="text-lg text-muted max-w-lg leading-relaxed font-medium">
                    {newBooks.length > 0 ? (
                      <>
                        <span className="text-accent font-bold">{newBooks.length} nouveautés</span> captivantes vous attendent aujourd'hui. Prêt pour l'aventure ?
                      </>
                    ) : (
                      <>Découvrez notre sélection exclusive de <span className="text-accent font-bold">{bookCount} ouvrages</span> à la Bibliothèque CAEB.</>
                    )}
                  </p>

                  {!user?.estMembre && (
                    <div className="mt-8 flex flex-wrap gap-4">
                      <Button onClick={() => onNavigate('profile')} className="btn-solid px-8 py-6 rounded-2xl shadow-glow hover:shadow-elevated transition-all font-bold text-lg group">
                        Devenir Membre
                      </Button>
                    </div>
                  )}
                </div>

                {/* Visual element for hero (optional image or graphic) */}
                <div className="hidden md:block relative w-48 h-48 animate-float">
                  <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl" />
                  <BookOpen className="w-full h-full text-accent/20 relative z-10" />
                </div>
              </div>
            </header>

            {/* Actualités */}
            <section className="animate-slide-up">
              <SectionHeader title="Actualités" icon={Newspaper} onSeeAll={() => onNavigate('news')} />
              {!dataReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[0, 1, 2].map(i => <SkeletonNewsCard key={i} />)}
                </div>
              ) : latestNews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {latestNews.map((newsItem) => (
                    <div key={newsItem.id} className="list-item-fade">
                      <NewsCard news={newsItem} onClick={() => onNavigate('news-detail', { newsId: newsItem.id })} />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Recommandés */}
            <section className="animate-slide-up">
              <SectionHeader title="Recommandé pour vous" icon={Sparkles} onSeeAll={() => onNavigate('catalog')} />
              {!dataReady ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {[0, 1, 2, 3].map(i => <SkeletonBookCard key={i} />)}
                </div>
              ) : recommendedBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {recommendedBooks.map((book) => (
                    <div key={book.id} className="list-item-fade">
                      <BookCard book={book} user={user} onClick={() => onNavigate('book-detail', { bookId: book.id })}
                        onToggleFavorite={(id) => user.favoris?.includes(id) ? user.favoris = user.favoris.filter((f: any) => f !== id) : user.favoris = [...(user.favoris || []), id]} />
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Nouveautés */}
            <section className="animate-slide-up" style={{ animationDelay: '100ms' }}>
              <SectionHeader title="Nouveautés" icon={TrendingUp} onSeeAll={() => onNavigate('catalog')} />
              {!dataReady ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {[0, 1, 2, 3].map(i => <SkeletonBookCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {newBooks.map((book) => (
                    <div key={book.id} className="list-item-fade">
                      <BookCard book={book} user={user} onClick={() => onNavigate('book-detail', { bookId: book.id })}
                        onToggleFavorite={(id) => user.favoris?.includes(id) ? user.favoris = user.favoris.filter((f: any) => f !== id) : user.favoris = [...(user.favoris || []), id]} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Populaires */}
            <section className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <SectionHeader title="Les plus populaires" icon={Flame} onSeeAll={() => onNavigate('catalog')} />
              {!dataReady ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {[0, 1, 2, 3].map(i => <SkeletonBookCard key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
                  {popularBooks.map((book) => (
                    <div key={book.id} className="list-item-fade">
                      <BookCard book={book} user={user} onClick={() => onNavigate('book-detail', { bookId: book.id })}
                        onToggleFavorite={(id) => user.favoris?.includes(id) ? user.favoris = user.favoris.filter((f: any) => f !== id) : user.favoris = [...(user.favoris || []), id]} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── BARRE LATÉRALE ── */}
          <div className="lg:col-span-4 space-y-8">
            <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
              <SectionHeader title="Agenda" icon={Calendar} onSeeAll={() => onNavigate('events')} />
              {!dataReady ? (
                <div className="space-y-3">
                  {[0, 1, 2].map(i => <SkeletonEventCard key={i} />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} user={user} onClick={() => onNavigate('event-detail', { eventId: event.id })} />
                  ))}
                </div>
              )}
            </section>


          </div>
        </div>
      </main>
      {/* BottomNavigation supprimé car rendu dans App.tsx */}
    </div>

  );
}

// ── SOUS-COMPOSANTS ──────────────────────────────────────────────────

function SectionHeader({ title, icon: Icon, onSeeAll }: { title: string; icon: React.ElementType; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-5 px-1">
      <h2 className="font-display font-semibold text-xl text-primary flex items-center gap-2.5">
        <div className="p-1.5 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-lg">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        {title}
      </h2>
      {onSeeAll && (
        <button onClick={onSeeAll}
          className="text-sm font-semibold text-accent hover:opacity-75 flex items-center gap-1 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] focus:ring-offset-0 rounded px-2 py-1 tap-feedback">
          <span className="hidden sm:inline">Voir tout</span>
          <span className="sm:hidden">Plus</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function BookCard({ book, user, onClick, onToggleFavorite }: { book: Book; user: User; onClick: () => void; onToggleFavorite?: (id: string) => void }) {
  const isFavorited = user.favoris?.includes(book.id) || false;
  const [heartPop, setHeartPop] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  };

  const handleFavorite = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400);
    onToggleFavorite?.(book.id);
  };

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={handleKeyDown}
      className="w-full text-left group relative flex flex-col h-full book-card-3d cursor-pointer">
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-card mb-3 surface-weak">
        <ApiImage src={book.couverture} alt={book.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

        {/* Favoris avec pop */}
        <button onClick={handleFavorite}
          className="absolute top-2 right-2 p-2 rounded-full surface shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
          style={{ transform: heartPop ? 'scale(1.35)' : 'scale(1)', transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          aria-label={isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
          <Heart className={`w-4 h-4 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted'}`} />
        </button>

        {/* Overlay de verrouillage */}
        {!user?.estMembre && book.exemplaires <= 0 && (
          <div className="absolute inset-0 surface/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="surface p-2 rounded-full shadow-medium">
              <Lock className="w-4 h-4 text-accent" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors text-base">{book.titre}</h3>
        <p className="text-sm text-muted line-clamp-1 mb-1">{book.auteur}</p>
        {/* Étoiles cascade */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-0.5 star-cascade">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n}
                className={`star w-3 h-3 ${n <= Math.round(book.note || 4.5) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
            ))}
            <span className="text-xs font-semibold text-accent ml-1">{book.note || '4.5'}</span>
          </div>
          {!user?.estMembre && (
            <span className="text-[10px] font-bold text-accent bg-[var(--library-accent)]/10 px-2 py-0.5 rounded-full">PREMIUM</span>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, user, onClick }: { event: Event; user: User; onClick: () => void }) {
  const eventDate = new Date(event.date);
  return (
    <button onClick={onClick}
      className="w-full surface rounded-xl p-3 shadow-card border border-[var(--border-color)] hover:shadow-card-hover hover:border-[var(--library-accent)]/25 transition-all duration-300 text-left flex items-center gap-4 group tap-feedback">
      <div className="w-14 h-14 surface-alt rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-[var(--library-accent)]/10 group-hover:border-[var(--library-accent)]/30 transition-all">
        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
          {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
        </span>
        <span className="text-xl font-bold text-primary group-hover:text-accent transition-colors">
          {eventDate.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors">{event.titre}</h3>
          {!user.estMembre && event.type === 'conference' && <Lock className="w-3 h-3 text-muted flex-shrink-0" />}
        </div>
        <div className="flex items-center text-xs text-muted gap-2">
          <span>{event.heure}</span>
          <span className="w-1 h-1 bg-[var(--border-color)] rounded-full" />
          <span className="truncate max-w-[100px]">{event.lieu}</span>
        </div>
      </div>
    </button>
  );
}

function NewsCard({ news, onClick }: { news: News; onClick: () => void }) {
  const newsDate = new Date(news.date);

  const categoryConfig: Record<string, { label: string; class: string }> = {
    announcement: { label: 'Annonce', class: 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20' },
    event: { label: 'Événement', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    course: { label: 'Formation', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    visit: { label: 'Visite', class: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    closure: { label: 'Fermeture', class: 'bg-red-500/10 text-red-500 border-red-500/20' },
    general: { label: 'Actualité', class: 'surface-weak text-muted border-[var(--border-color)]' },
  };

  const currentConfig = categoryConfig[news.categorie] || categoryConfig.general;

  return (
    <button onClick={onClick} className="w-full text-left group flex flex-col h-full tap-feedback">
      <div className={`surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-300 flex flex-col h-full`}>
        {news.image && (
          <div className="relative w-full aspect-video overflow-hidden bg-[var(--library-surface-alt)]">
            <ApiImage src={news.image} alt={news.titre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="flex flex-col flex-1 p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${currentConfig.class}`}>
              {currentConfig.label}
            </span>
            <span className="text-xs font-medium text-muted whitespace-nowrap ml-auto">
              {newsDate.getDate()} {newsDate.toLocaleDateString('fr-FR', { month: 'short' })}
            </span>
          </div>
          <h3 className="font-bold text-primary line-clamp-2 group-hover:text-accent transition-colors mb-2 text-base">{news.titre}</h3>
          <p className="text-sm text-muted line-clamp-3 mb-4 flex-1">{news.resume}</p>
          <div className="flex items-center text-sm font-semibold text-accent gap-0.5 hover:gap-1 transition-all">
            En savoir plus <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );

}
