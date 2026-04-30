// Page du catalogue — CAEB Design System
import { useState, useMemo, useEffect } from 'react';
import { Search, Star, X, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import type { Book, User } from '@/types';
import { useBooks } from '@/hooks/useData';



// ── EMPTY STATE — Étagère illustrée ────────────────────────────────────
function EmptyShelf({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      {/* SVG étagère */}
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Étagère */}
        <rect x="10" y="85" width="100" height="6" rx="3" fill="currentColor" className="text-[var(--library-accent)] opacity-20" />
        {/* Livres vides (contours) */}
        <rect x="18" y="55" width="18" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="40" y="62" width="14" height="23" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        <rect x="58" y="50" width="20" height="35" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="82" y="60" width="16" height="25" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        {/* Loupe si recherche */}
        {hasFilters && (
          <>
            <circle cx="60" cy="30" r="14" stroke="currentColor" strokeWidth="2" className="text-[var(--library-accent)] opacity-40" fill="none" />
            <line x1="70" y1="40" x2="78" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--library-accent)] opacity-40" />
          </>
        )}
        {/* Point d'interrogation si pas de filtres */}
        {!hasFilters && (
          <text x="60" y="38" textAnchor="middle" fontSize="20" fill="currentColor" className="text-[var(--library-accent)] opacity-25">?</text>
        )}
      </svg>
      <h3 className="text-lg font-semibold text-primary">
        {hasFilters ? 'Aucun résultat trouvé' : 'Le catalogue est en cours de rangement'}
      </h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        {hasFilters
          ? 'Il semble que ce livre joue à cache-cache. Essayez avec un autre titre, auteur ou genre !'
          : 'Nos bibliothécaires préparent de belles découvertes pour vous. Revenez jeter un œil très bientôt.'}
      </p>
    </div>
  );
}

// ── SQUELETTES DE CHARGEMENT ────────────────────────────────────────

function SkeletonGridCard() {
  return (
    <div className="flex flex-col h-full">
      <div className="skeleton skeleton-book-cover mb-3" />
      <div className="space-y-2">
        <div className="skeleton skeleton-text w-5/6" />
        <div className="skeleton skeleton-text-sm w-2/3" />
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map(i => <div key={i} className="skeleton w-3 h-3 rounded-sm" />)}
        </div>
      </div>
    </div>
  );
}

function SkeletonListCard() {
  return (
    <div className="surface rounded-xl p-4 border border-[var(--border-color)] flex gap-4">
      <div className="skeleton w-20 h-28 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton skeleton-title w-3/4" />
        <div className="skeleton skeleton-text w-1/2" />
        <div className="skeleton skeleton-text-sm w-1/3 mt-2" />
        <div className="skeleton skeleton-badge w-12 mt-1" />
      </div>
    </div>
  );
}

export function CatalogPage({ onBookClick, user }: { onBookClick: (bookId: string) => void; user: User | null }) {
  const { books, isLoading } = useBooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular');
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!isLoading) setDataReady(true);
  }, [isLoading]);

  const filteredBooks = useMemo(() => {
    let result = [...books];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q));
    }
    if (selectedGenres.length > 0) result = result.filter(b => selectedGenres.includes(b.genre));
    if (selectedAudience.length > 0) result = result.filter(b => selectedAudience.includes(b.targetAudience || ''));
    if (showAvailableOnly) result = result.filter(b => b.isAvailable);
    switch (sortBy) {
      case 'newest': result.sort((a, b) => (b.year || 0) - (a.year || 0)); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      default: result.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
    }
    return result;
  }, [searchQuery, selectedGenres, selectedAudience, showAvailableOnly, sortBy]);

  const allGenres = useMemo(() => Array.from(new Set(books.map((book) => book.genre))).sort(), []);
  const allAudiences = useMemo(() => Array.from(new Set(books.map((book) => book.targetAudience || ''))).sort(), []);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]);
  };

  const toggleAudience = (audience: string) => {
    setSelectedAudience((prev) => prev.includes(audience) ? prev.filter((item) => item !== audience) : [...prev, audience]);
  };

  const clearFilters = () => { setSelectedGenres([]); setSelectedAudience([]); setShowAvailableOnly(false); };
  const activeFiltersCount = selectedGenres.length + selectedAudience.length + (showAvailableOnly ? 1 : 0);
  const hasFilters = activeFiltersCount > 0 || searchQuery.length > 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* En-tête */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-1">Le catalogue</h1>
          <p className="text-muted pl-1">12 000 ouvrages à explorer — romans, essais, jeunesse et bien plus.</p>
        </div>

        {/* Barre de recherche & filtres */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none" />
                <Input
                  placeholder="Titre, auteur, genre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 surface border-[var(--border-color)] focus:ring-2 focus:ring-[var(--library-accent)]/20 focus:border-[var(--library-accent)] rounded-xl text-primary placeholder:text-muted"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors tap-feedback">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'popular' | 'newest' | 'rating')}
                className="flex-1 h-12 px-4 surface border border-[var(--border-color)] rounded-xl text-sm text-primary focus:outline-none focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 cursor-pointer">
                <option value="popular">Populaires</option>
                <option value="newest">Plus récents</option>
                <option value="rating">Mieux notés</option>
              </select>

              <div className="flex surface border border-[var(--border-color)] rounded-xl p-1 gap-1">
                <button onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-colors tap-feedback ${viewMode === 'grid' ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'text-muted hover:text-accent'}`}
                  title="Grille">
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-colors tap-feedback ${viewMode === 'list' ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'text-muted hover:text-accent'}`}
                  title="Liste">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-primary">Genres</span>
              {allGenres.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button key={genre} type="button" onClick={() => toggleGenre(genre)}
                    className={`text-sm rounded-full px-3 py-1 transition-all ${active ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                    {genre}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-primary">Public</span>
              {allAudiences.map((audience) => {
                const active = selectedAudience.includes(audience);
                return (
                  <button key={audience} type="button" onClick={() => toggleAudience(audience)}
                    className={`text-sm rounded-full px-3 py-1 transition-all ${active ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                    {audience}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={() => setShowAvailableOnly((prev) => !prev)}
                className={`text-sm rounded-full px-3 py-1 transition-all ${showAvailableOnly ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                {showAvailableOnly ? 'Uniquement disponibles' : 'Afficher uniquement disponibles'}
              </button>
              {hasFilters && (
                <span className="text-sm text-muted">{activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {dataReady
                ? <><span className="font-semibold text-primary">{filteredBooks.length}</span> livre{filteredBooks.length !== 1 ? 's' : ''}</>
                : <span className="skeleton skeleton-text w-20 inline-block" />
              }
            </p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters}
                className="text-sm text-accent font-semibold hover:opacity-75 flex items-center gap-1 transition-opacity tap-feedback">
                <X className="w-4 h-4" />
                Effacer les {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Résultats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {!dataReady ? (
          /* Chargement des squelettes */
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonGridCard key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonListCard key={i} />)}
            </div>
          )
        ) : filteredBooks.length === 0 ? (
          <EmptyShelf hasFilters={hasFilters} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredBooks.map((book) => (
              <BookGridCard key={book.id} book={book} onClick={() => onBookClick(book.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <BookListCard key={book.id} book={book} onClick={() => onBookClick(book.id)} />
            ))}
          </div>
        )}
      </div>
      {/* BottomNavigation supprimé ici car rendu globalement dans App.tsx */}
    </div>
  );
}

function BookGridCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left group flex flex-col h-full book-card-3d tap-feedback">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-card mb-3 surface-weak">
        <img src={book.cover} alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {!book.isAvailable && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">Indisponible</span>
          </div>
        )}
        {book.isNew && (
          <Badge className="absolute top-2 left-2 bg-[var(--library-accent)] text-[var(--library-on-accent)] text-[10px] font-bold">Nouveau</Badge>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors text-sm">{book.title}</h3>
        <p className="text-xs text-muted line-clamp-1 mb-auto">{book.author}</p>
        {/* Étoiles cascade */}
        <div className="flex items-center gap-0.5 mt-2 star-cascade">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`star w-3 h-3 ${n <= Math.round(book.rating) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
          ))}
          <span className="text-xs font-semibold text-accent ml-1">{book.rating}</span>
          <span className="text-xs text-muted">({book.reviewCount})</span>
        </div>
      </div>
    </button>
  );
}

function BookListCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-300 text-left flex gap-4 group tap-feedback">
      <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 surface-weak">
        <img src={book.cover} alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {!book.isAvailable && (
          <div className="absolute inset-0 surface-weak/90 flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted px-1 py-0.5 surface rounded">Indisponible</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors">{book.title}</h3>
            <p className="text-sm text-muted">{book.author}</p>
          </div>
          {book.isNew && (
            <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-xs flex-shrink-0 font-bold">Nouveau</Badge>
          )}
        </div>
        <p className="text-xs text-muted mb-2">{book.genre}</p>
        <div className="flex items-center gap-0.5 star-cascade">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`star w-3.5 h-3.5 ${n <= Math.round(book.rating) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
          ))}
          <span className="text-sm text-accent font-semibold ml-1">{book.rating}</span>
          <span className="text-xs text-muted">({book.reviewCount} avis)</span>
        </div>
      </div>
    </button>
  );
}
