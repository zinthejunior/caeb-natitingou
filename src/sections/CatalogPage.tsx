// CatalogPage.tsx — Page du catalogue de la bibliothèque
import { useState, useMemo, useEffect } from 'react';
import { Search, Star, X, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import type { Book, User } from '@/types';
import { useLivres } from '@/hooks/useData';

/**
 * Composant affiché quand aucun livre ne correspond à la recherche.
 */
function EtagereVide({ aDesFiltres }: { aDesFiltres: boolean }) {
  return (
    <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      {/* Illustration SVG d'une étagère */}
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="85" width="100" height="6" rx="3" fill="currentColor" className="text-[var(--library-accent)] opacity-20" />
        <rect x="18" y="55" width="18" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="40" y="62" width="14" height="23" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        <rect x="58" y="50" width="20" height="35" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="82" y="60" width="16" height="25" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        {aDesFiltres && (
          <>
            <circle cx="60" cy="30" r="14" stroke="currentColor" strokeWidth="2" className="text-[var(--library-accent)] opacity-40" fill="none" />
            <line x1="70" y1="40" x2="78" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--library-accent)] opacity-40" />
          </>
        )}
        {!aDesFiltres && (
          <text x="60" y="38" textAnchor="middle" fontSize="20" fill="currentColor" className="text-[var(--library-accent)] opacity-25">?</text>
        )}
      </svg>
      <h3 className="text-lg font-semibold text-primary">
        {aDesFiltres ? 'Aucun résultat trouvé' : 'Le catalogue est en cours de rangement'}
      </h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        {aDesFiltres
          ? 'Il semble que ce livre joue à cache-cache. Essayez avec un autre titre, auteur ou genre !'
          : 'Nos bibliothécaires préparent de belles découvertes pour vous. Revenez jeter un œil très bientôt.'}
      </p>
    </div>
  );
}

// ── COMPOSANTS DE CHARGEMENT (Skeletons) ────────────────────────────────

function SkeletonGrille() {
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

function SkeletonListe() {
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

// ── PAGE PRINCIPALE DU CATALOGUE ──────────────────────────────────────────

export function CatalogPage({ onBookClick, user }: { onBookClick: (idLivre: string) => void; user: User | null }) {
  const { livres, chargement } = useLivres();
  const [recherche, setRecherche] = useState('');
  const [modeAffichage, setModeAffichage] = useState<'grid' | 'list'>('grid');
  const [genresSelectionnes, setGenresSelectionnes] = useState<string[]>([]);
  const [publicSelectionne, setPublicSelectionne] = useState<string[]>([]);
  const [afficherDispoUniquement, setAfficherDispoUniquement] = useState(false);
  const [triPar, setTriPar] = useState<'popular' | 'newest' | 'rating'>('popular');
  const [donneesPretes, setDonneesPretes] = useState(false);

  useEffect(() => {
    if (!chargement) setDonneesPretes(true);
  }, [chargement]);

  // Filtrage et tri des livres
  const livresFiltres = useMemo(() => {
    let resultat = [...livres];
    if (recherche) {
      const q = recherche.toLowerCase();
      resultat = resultat.filter(l => 
        l.titre.toLowerCase().includes(q) || 
        l.auteur.toLowerCase().includes(q) || 
        l.genre.toLowerCase().includes(q)
      );
    }
    if (genresSelectionnes.length > 0) resultat = resultat.filter(l => genresSelectionnes.includes(l.genre));
    if (publicSelectionne.length > 0) resultat = resultat.filter(l => publicSelectionne.includes(l.publicCible || ''));
    if (afficherDispoUniquement) resultat = resultat.filter(l => l.estDisponible);
    
    switch (triPar) {
      case 'newest': resultat.sort((a, b) => (b.annee || 0) - (a.annee || 0)); break;
      case 'rating': resultat.sort((a, b) => b.note - a.note); break;
      default: resultat.sort((a, b) => (b.estPopulaire ? 1 : 0) - (a.estPopulaire ? 1 : 0));
    }
    return resultat;
  }, [recherche, genresSelectionnes, publicSelectionne, afficherDispoUniquement, triPar, livres]);

  // Extraction des genres et publics pour les filtres
  const tousLesGenres = useMemo(() => Array.from(new Set(livres.map((l) => l.genre))).sort(), [livres]);
  const tousLesPublics = useMemo(() => Array.from(new Set(livres.map((l) => l.publicCible || ''))).sort(), [livres]);

  const basculerGenre = (genre: string) => {
    setGenresSelectionnes((precedents) => precedents.includes(genre) ? precedents.filter((g) => g !== genre) : [...precedents, genre]);
  };

  const basculerPublic = (publicCible: string) => {
    setPublicSelectionne((precedents) => precedents.includes(publicCible) ? precedents.filter((p) => p !== publicCible) : [...precedents, publicCible]);
  };

  const effacerFiltres = () => { setGenresSelectionnes([]); setPublicSelectionne([]); setAfficherDispoUniquement(false); };
  const nbFiltresActifs = genresSelectionnes.length + publicSelectionne.length + (afficherDispoUniquement ? 1 : 0);
  const aDesFiltres = nbFiltresActifs > 0 || recherche.length > 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar utilisateur={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Titre de la page */}
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-1">Le catalogue</h1>
          <p className="text-muted pl-1">Près de 7 000 ouvrages à explorer — romans, essais, jeunesse et bien plus.</p>
        </div>

        {/* Barre de recherche & filtres */}
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none" />
                <Input
                  placeholder="Rechercher par titre, auteur, genre..."
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-12 h-12 surface border-[var(--border-color)] focus:ring-2 focus:ring-[var(--library-accent)]/20 focus:border-[var(--library-accent)] rounded-xl text-primary placeholder:text-muted"
                />
                {recherche && (
                  <button onClick={() => setRecherche('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors tap-feedback">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <select value={triPar} onChange={(e) => setTriPar(e.target.value as 'popular' | 'newest' | 'rating')}
                className="flex-1 h-12 px-4 surface border border-[var(--border-color)] rounded-xl text-sm text-primary focus:outline-none focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 cursor-pointer">
                <option value="popular">Les plus populaires</option>
                <option value="newest">Les plus récents</option>
                <option value="rating">Les mieux notés</option>
              </select>

              <div className="flex surface border border-[var(--border-color)] rounded-xl p-1 gap-1">
                <button onClick={() => setModeAffichage('grid')}
                  className={`p-2.5 rounded-lg transition-colors tap-feedback ${modeAffichage === 'grid' ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'text-muted hover:text-accent'}`}
                  title="Affichage en grille">
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setModeAffichage('list')}
                  className={`p-2.5 rounded-lg transition-colors tap-feedback ${modeAffichage === 'list' ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'text-muted hover:text-accent'}`}
                  title="Affichage en liste">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtres par genre et public */}
          <div className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-primary">Genres</span>
              {tousLesGenres.slice(0, 15).map((genre) => { // Limité aux 15 premiers pour l'UI
                const actif = genresSelectionnes.includes(genre);
                return (
                  <button key={genre} type="button" onClick={() => basculerGenre(genre)}
                    className={`text-sm rounded-full px-3 py-1 transition-all ${actif ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                    {genre}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-primary">Public</span>
              {tousLesPublics.map((publicCible) => {
                const actif = publicSelectionne.includes(publicCible);
                return (
                  <button key={publicCible} type="button" onClick={() => basculerPublic(publicCible)}
                    className={`text-sm rounded-full px-3 py-1 transition-all ${actif ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                    {publicCible || 'Général'}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button type="button" onClick={() => setAfficherDispoUniquement((prev) => !prev)}
                className={`text-sm rounded-full px-3 py-1 transition-all ${afficherDispoUniquement ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)]' : 'surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                {afficherDispoUniquement ? 'Uniquement disponibles' : 'Afficher tout (même empruntés)'}
              </button>
              {aDesFiltres && (
                <span className="text-sm text-muted">{nbFiltresActifs} filtre{nbFiltresActifs > 1 ? 's' : ''} actif{nbFiltresActifs > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {/* Résumé des résultats */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {donneesPretes
                ? <><span className="font-semibold text-primary">{livresFiltres.length}</span> livre{livresFiltres.length !== 1 ? 's' : ''}</>
                : <span className="skeleton skeleton-text w-20 inline-block" />
              }
            </p>
            {nbFiltresActifs > 0 && (
              <button onClick={effacerFiltres}
                className="text-sm text-accent font-semibold hover:opacity-75 flex items-center gap-1 transition-opacity tap-feedback">
                <X className="w-4 h-4" />
                Effacer les {nbFiltresActifs} filtre{nbFiltresActifs > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Liste des résultats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {!donneesPretes ? (
          /* Affichage du chargement */
          modeAffichage === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonGrille key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonListe key={i} />)}
            </div>
          )
        ) : livresFiltres.length === 0 ? (
          <EtagereVide aDesFiltres={aDesFiltres} />
        ) : modeAffichage === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {livresFiltres.map((livre) => (
              <CarteLivreGrille key={livre.id} livre={livre} onClick={() => onBookClick(livre.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {livresFiltres.map((livre) => (
              <CarteLivreListe key={livre.id} livre={livre} onClick={() => onBookClick(livre.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMPOSANTS DE CARTE (Livre seul) ──────────────────────────────────────────

function CarteLivreGrille({ livre, onClick }: { livre: Book; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left group flex flex-col h-full book-card-3d tap-feedback">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-card mb-3 surface-weak">
        <img src={livre.couverture} alt={livre.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {!livre.estDisponible && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">Indisponible</span>
          </div>
        )}
        {livre.estNouveau && (
          <Badge className="absolute top-2 left-2 bg-[var(--library-accent)] text-[var(--library-on-accent)] text-[10px] font-bold">Nouveau</Badge>
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors text-sm">{livre.titre}</h3>
        <p className="text-xs text-muted line-clamp-1 mb-auto">{livre.auteur}</p>
        <div className="flex items-center gap-0.5 mt-2 star-cascade">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`star w-3 h-3 ${n <= Math.round(livre.note) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
          ))}
          <span className="text-xs font-semibold text-accent ml-1">{livre.note}</span>
          <span className="text-xs text-muted">({livre.nbAvis})</span>
        </div>
      </div>
    </button>
  );
}

function CarteLivreListe({ livre, onClick }: { livre: Book; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-300 text-left flex gap-4 group tap-feedback">
      <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 surface-weak">
        <img src={livre.couverture} alt={livre.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {!livre.estDisponible && (
          <div className="absolute inset-0 surface-weak/90 flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted px-1 py-0.5 surface rounded">Indisponible</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors">{livre.titre}</h3>
            <p className="text-sm text-muted">{livre.auteur}</p>
          </div>
          {livre.estNouveau && (
            <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-xs flex-shrink-0 font-bold">Nouveau</Badge>
          )}
        </div>
        <p className="text-xs text-muted mb-2">{livre.genre}</p>
        <div className="flex items-center gap-0.5 star-cascade">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`star w-3.5 h-3.5 ${n <= Math.round(livre.note) ? 'fill-[var(--library-accent)] text-[var(--library-accent)]' : 'text-[var(--border-color)]'}`} />
          ))}
          <span className="text-sm text-accent font-semibold ml-1">{livre.note}</span>
          <span className="text-xs text-muted">({livre.nbAvis} avis)</span>
        </div>
      </div>
    </button>
  );
}
