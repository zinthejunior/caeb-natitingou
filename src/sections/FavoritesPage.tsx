// Page des favoris — CAEB Design System
import { Heart, ChevronLeft, Star } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { useBooks } from '@/hooks/useData';
import { useState } from 'react';

interface FavoritesPageProps {
  user: User | null;
  onNavigate: (view: string, params?: any) => void;
  onToggleFavorite?: (bookId: string) => void;
}

// ── EMPTY STATE — Cœur illustré ────────────────────────────────────────
function EmptyFavorites({ onNavigate }: { onNavigate: (v: string) => void }) {
  return (
    <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      {/* SVG cœur avec étagère */}
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Étagère */}
        <rect x="15" y="90" width="90" height="5" rx="2.5" fill="currentColor" className="text-red-400 opacity-15" />
        {/* Deux livres ternes */}
        <rect x="25" y="65" width="16" height="25" rx="2" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        <rect x="80" y="70" width="14" height="20" rx="2" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        {/* Grand cœur central creux */}
        <path d="M60 78 L35 58 C28 51 28 40 38 37 C44 35 50 38 54 43 L60 50 L66 43 C70 38 76 35 82 37 C92 40 92 51 85 58 Z"
          stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="text-red-400 opacity-30" fill="none" />
        {/* Petit plus au centre */}
        <line x1="60" y1="56" x2="60" y2="68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 opacity-40" />
        <line x1="54" y1="62" x2="66" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 opacity-40" />
      </svg>
      <h3 className="text-xl font-semibold text-primary">Pas encore de favoris</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Mettez de côté vos futurs coups de cœur. Touchez le petit ❤ sur un livre et gardez-le précieusement ici !
      </p>
      <Button onClick={() => onNavigate('catalog')} className="btn-solid gap-2 shadow-medium hover:shadow-elevated transition-all font-bold mt-2 tap-feedback">
        <ChevronLeft className="w-4 h-4" />Explorer le catalogue
      </Button>
    </div>
  );
}

export function FavoritesPage({ user, onNavigate, onToggleFavorite }: FavoritesPageProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'title'>('recent');
  const { books } = useBooks();

  if (!user) {
    return (
      <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Veuillez vous connecter pour voir vos favoris</p>
          </div>
        </main>
      </div>
    );
  }

  const favoriteBooks = books.filter(book => user.favorites?.includes(book.id));
  const sortedFavorites = [...favoriteBooks].sort((a, b) => {
    if (sortBy === 'rating') return b.note - a.note;
    if (sortBy === 'title') return a.titre.localeCompare(b.titre);
    return 0;
  });

  const sortOptions = [
    { key: 'recent', label: 'Récent' },
    { key: 'rating', label: 'Note' },
    { key: 'title', label: 'Titre' },
  ] as const;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-500 fill-current" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary">Mes Favoris</h1>
          </div>
          <p className="text-muted pl-1">
            <span className="font-semibold text-accent">{sortedFavorites.length}</span>{' '}
            livre{sortedFavorites.length !== 1 ? 's' : ''} dans votre liste de favoris
          </p>
        </div>

        {/* Tri */}
        {sortedFavorites.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {sortOptions.map(opt => (
              <button key={opt.key} onClick={() => setSortBy(opt.key)}
                aria-pressed={sortBy === opt.key}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] focus:ring-offset-0 tap-feedback ${sortBy === opt.key
                  ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] shadow-soft'
                  : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30'
                  }`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Grille ou état vide illustré */}
        {sortedFavorites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedFavorites.map((book) => (
              <div key={book.id}
                className="surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 book-card-3d transition-all duration-300 flex flex-col group cursor-pointer"
                onClick={() => onNavigate('book-detail', { bookId: book.id })}>

                {/* Couverture */}
                <div className="relative aspect-[2/3] w-full overflow-hidden surface-alt flex-shrink-0">
                  <ApiImage src={book.couverture} alt={book.titre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(book.id); }}
                    className="absolute top-2 right-2 p-2 rounded-full surface shadow-medium hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-red-500/50 z-10"
                    style={{ transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    aria-label="Retirer des favoris">
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                  </button>

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {!book.estDisponible && <Badge variant="destructive" className="text-[10px]">Indisponible</Badge>}
                    {book.estNouveau && <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-[10px]">Nouveau</Badge>}
                  </div>
                </div>

                {/* Détails */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-sm text-primary line-clamp-2 mb-1 group-hover:text-accent transition-colors">{book.titre}</h3>
                  <p className="text-xs text-muted line-clamp-1 mb-2">{book.auteur}</p>
                  {/* Étoiles cascade */}
                  <div className="flex items-center gap-0.5 mb-3 star-cascade">
                    {[1, 2, 3, 4, 5].map(n => (
                      <Star key={n} className={`star w-3.5 h-3.5 ${n <= Math.round(book.note) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
                    ))}
                    <span className="text-xs font-bold text-accent ml-1">{book.note}</span>
                    {book.nbAvis && <span className="text-xs text-muted">({book.nbAvis})</span>}
                  </div>
                  <Badge variant="outline" className="text-xs w-fit mb-3 border-[var(--border-color)] text-muted">{book.genre}</Badge>
                  <Button onClick={(e) => { e.stopPropagation(); onNavigate('book-detail', { bookId: book.id }); }}
                    size="sm" className="btn-solid w-full mt-auto font-semibold tap-feedback">
                    Voir les détails
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyFavorites onNavigate={onNavigate} />
        )}
      </main>
    </div>
  );
}
