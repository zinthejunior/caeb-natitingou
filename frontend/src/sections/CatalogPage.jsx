/**
 * =============================================================================
 * PAGE CATALOGUE (CatalogPage) — Version Optimisée
 * =============================================================================
 * Interface compacte et performante avec système de filtres multi-critères.
 * Optimisé pour Android (tailles compactes, touch feedback, performance).
 * =============================================================================
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Star, X, Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApiImage } from "@/components/ApiImage";
import { Navbar } from "@/components/Navbar";
import { AdvancedFilters } from "@/components/AdvancedFilters";
import { useLivres, useGlobalStats } from "@/hooks/useData";
import { useSEO } from "@/lib/utils";

/* ── Composant : Catalogue vide ───────────────────────────────────────────── */
function EtagereVide({ aDesFiltres }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{aDesFiltres ? "🔍" : "📚"}</div>
      <h3 className="font-bold text-lg text-primary mb-2">
        {aDesFiltres ? "Aucun résultat trouvé" : "Le catalogue est en cours de rangement"}
      </h3>
      <p className="text-sm text-muted max-w-xs">
        {aDesFiltres
          ? "Essayez avec un autre titre, auteur ou genre !"
          : "Nos bibliothécaires préparent de belles découvertes. Revenez bientôt."}
      </p>
    </div>
  );
}

/* ── Squelettes de chargement ─────────────────────────────────────────────── */
function SkeletonGrille() {
  return (
    <div className="flex flex-col h-full">
      <div className="skeleton skeleton-book-cover mb-2" />
      <div className="space-y-1.5">
        <div className="skeleton skeleton-text w-5/6" />
        <div className="skeleton skeleton-text-sm w-2/3" />
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton w-3 h-3 rounded-sm" />)}
        </div>
      </div>
    </div>
  );
}

function SkeletonListe() {
  return (
    <div className="surface rounded-xl p-3 border border-[var(--border-color)] flex gap-3">
      <div className="skeleton w-14 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton skeleton-title w-3/4" />
        <div className="skeleton skeleton-text w-1/2" />
        <div className="skeleton skeleton-text-sm w-1/3 mt-2" />
        <div className="skeleton skeleton-badge w-12 mt-1" />
      </div>
    </div>
  );
}

/* ── Carte livre — Vue Grille ─────────────────────────────────────────────── */
function CarteLivreGrille({ livre, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left group flex flex-col h-full tap-feedback animate-flow-in w-full"
    >
      <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-card mb-2 glass-effect border border-white/5 group-hover:border-accent/30 transition-all duration-300">
        <ApiImage
          src={livre.couverture}
          alt={livre.titre}
          fallback="/default_cover.png"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {livre.exemplaires <= 0 && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-2">
            <span className="text-white text-[9px] font-black px-2 py-1 bg-red-500/80 rounded-full uppercase tracking-wider">
              Indisponible
            </span>
          </div>
        )}
        {livre.estNouveau && (
          <Badge className="absolute top-2 left-2 bg-accent text-white text-[9px] font-black uppercase tracking-wider border-none px-2 py-0.5">
            Nouveau
          </Badge>
        )}
      </div>
      <div className="flex-1 flex flex-col px-0.5">
        <h3 className="font-semibold text-primary line-clamp-2 group-hover:text-accent transition-colors text-sm mb-0.5 leading-tight">
          {livre.titre}
        </h3>
        <p className="text-xs text-muted font-medium line-clamp-1 mb-auto">{livre.auteur}</p>
        <div className="flex items-center gap-0.5 mt-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`w-3 h-3 ${n <= Math.round(livre.note) ? "fill-accent text-accent" : "text-white/10"}`} />
          ))}
          <span className="text-xs font-bold text-accent ml-1">{livre.note}</span>
        </div>
      </div>
    </button>
  );
}

/* ── Carte livre — Vue Liste ──────────────────────────────────────────────── */
function CarteLivreListe({ livre, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full surface rounded-xl p-3 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-200 text-left flex gap-3 group tap-feedback"
    >
      <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 surface-weak">
        <ApiImage
          src={livre.couverture}
          alt={livre.titre}
          fallback="/default_cover.png"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {livre.exemplaires <= 0 && (
          <div className="absolute inset-0 surface-weak/90 flex items-center justify-center">
            <span className="text-[8px] font-bold text-muted px-1 py-0.5 surface rounded">Indispo</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="min-w-0">
            <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors text-sm">
              {livre.titre}
            </h3>
            <p className="text-xs text-muted line-clamp-1">{livre.auteur}</p>
          </div>
          {livre.estNouveau && (
            <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-[9px] flex-shrink-0 font-bold">
              Nouveau
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted mb-1.5">{livre.genre}</p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`w-3 h-3 ${n <= Math.round(livre.note) ? "fill-[var(--library-accent)] text-[var(--library-accent)]" : "text-[var(--border-color)]"}`} />
          ))}
          <span className="text-xs text-accent font-semibold ml-1">{livre.note}</span>
          <span className="text-xs text-muted ml-1">({livre.nbAvis})</span>
        </div>
      </div>
    </button>
  );
}

/* ── Composant Principal CatalogPage ──────────────────────────────────────── */
export function CatalogPage({ onBookClick, user }) {
  const { livres, chargement } = useLivres();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const [recherche, setRecherche] = useState(() => searchParams.get("search") || "");
  const [modeAffichage, setModeAffichage] = useState("grid");
  const [triPar, setTriPar] = useState(view === "new" ? "newest" : "popular");
  const [donneesPretes, setDonneesPretes] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  // Filtres multi-critères unifié
  const [activeFilters, setActiveFilters] = useState({
    genre: [],
    auteur: [],
    annee: [],
    edition: [],
    categorie_age: [],
    disponible: false,
  });

  useEffect(() => {
    if (!chargement) setDonneesPretes(true);
  }, [chargement]);

  useEffect(() => {
    if (view === "new") setTriPar("newest");
    else if (view === "popular") setTriPar("popular");
  }, [view]);

  useEffect(() => {
    const params = {};
    if (view) params.view = view;
    if (recherche) params.search = recherche;
    setSearchParams(params, { replace: true });
  }, [recherche, view, setSearchParams]);

  const { stats } = useGlobalStats();
  const bookCount = stats?.books_count?.toLocaleString() ?? "...";
  const viewLabel = view === "new" ? "Nouveautés" : view === "popular" ? "Les plus populaires" : "";
  useSEO(
    `Catalogue${viewLabel ? ` • ${viewLabel}` : ""}`,
    viewLabel
      ? `Retrouvez toutes les ${viewLabel.toLowerCase()} de notre catalogue.`
      : `Explorez notre catalogue de ${bookCount} ouvrages : romans, essais, jeunesse, et bien plus.`
  );

  // Calcul du nombre de filtres actifs
  const nbFiltresActifs = useMemo(() => {
    return Object.entries(activeFilters).reduce((acc, [key, val]) => {
      if (key === "disponible") return acc + (val ? 1 : 0);
      return acc + (Array.isArray(val) ? val.length : 0);
    }, 0);
  }, [activeFilters]);

  const effacerFiltres = useCallback(() => {
    setActiveFilters({ genre: [], auteur: [], annee: [], edition: [], categorie_age: [], disponible: false });
    setRecherche("");
  }, []);

  // Filtrage et tri des livres (mémoïsé)
  const livresFiltres = useMemo(() => {
    let resultat = [...livres];

    // 1. Filtre par recherche textuelle
    if (recherche) {
      const q = recherche.toLowerCase();
      resultat = resultat.filter((l) => {
        const titre = String(l.titre || "").toLowerCase();
        const auteur = String(l.auteur || "").toLowerCase();
        const genre = String(l.genre || "").toLowerCase();
        const sousGenre = String(l.sous_genre || "").toLowerCase();
        return titre.includes(q) || auteur.includes(q) || genre.includes(q) || sousGenre.includes(q);
      });
    }

    // 2. Filtre par vue catégorie
    if (view === "new") resultat = resultat.filter((l) => l.estNouveau);
    if (view === "popular") resultat = resultat.filter((l) => l.estPopulaire);

    // 3. Filtres multi-critères
    if (activeFilters.genre?.length > 0)
      resultat = resultat.filter((l) => activeFilters.genre.includes(l.genre));
    if (activeFilters.auteur?.length > 0)
      resultat = resultat.filter((l) => activeFilters.auteur.includes(l.auteur));
    if (activeFilters.annee?.length > 0)
      resultat = resultat.filter((l) => activeFilters.annee.includes(String(l.annee)));
    if (activeFilters.categorie_age?.length > 0)
      resultat = resultat.filter((l) => activeFilters.categorie_age.includes(l.categorie_age));
    if (activeFilters.disponible)
      resultat = resultat.filter((l) => l.exemplaires > 0);

    // 4. Tri
    switch (triPar) {
      case "newest":
        resultat.sort((a, b) => (b.annee || 0) - (a.annee || 0));
        break;
      case "rating":
        resultat.sort((a, b) => (b.note || 0) - (a.note || 0));
        break;
      default:
        resultat.sort((a, b) => (b.estPopulaire ? 1 : 0) - (a.estPopulaire ? 1 : 0));
    }

    return resultat;
  }, [recherche, activeFilters, triPar, livres, view]);

  const aDesFiltres = nbFiltresActifs > 0 || recherche.length > 0;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pt-20">

        {/* En-tête compact Android */}
        <div className="mb-5">
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-bold mb-1.5">
            <span className="text-gradient">Le Catalogue</span>
            {viewLabel && <span className="text-base text-accent font-semibold"> • {viewLabel}</span>}
          </h1>
          <p className="text-muted text-sm sm:text-base pl-0.5 font-medium">
            {viewLabel
              ? `Retrouvez toutes les ${viewLabel.toLowerCase()} de notre collection.`
              : `Explorez nos ${bookCount} trésors littéraires — romans, essais et découvertes.`}
          </p>
        </div>

        {/* Barre de recherche & contrôles */}
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            {/* Barre de recherche */}
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent pointer-events-none" />
              <form onSubmit={(e) => e.preventDefault()}>
                <Input
                  type="search"
                  autoComplete="off"
                  placeholder="Titre, auteur, genre..."
                  aria-label="Rechercher dans le catalogue"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  className="pl-9 h-10 sm:h-12 glass-effect border-white/10 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 rounded-xl text-sm text-primary placeholder:text-muted font-medium transition-all"
                />
              </form>
              {recherche && (
                <button
                  type="button"
                  onClick={() => setRecherche("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors tap-feedback"
                  aria-label="Effacer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Bouton Filtres */}
            <button
              onClick={() => setFiltresOuverts(true)}
              className={`flex items-center gap-1.5 px-3 h-10 sm:h-12 rounded-xl text-sm font-semibold transition-all tap-feedback border ${
                nbFiltresActifs > 0
                  ? "bg-accent text-white border-accent shadow-glow"
                  : "glass-effect border-white/10 text-primary hover:border-accent/30"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres</span>
              {nbFiltresActifs > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-black bg-white/20 rounded-full">
                  {nbFiltresActifs}
                </span>
              )}
            </button>

            {/* Tri */}
            <select
              value={triPar}
              onChange={(e) => setTriPar(e.target.value)}
              className="h-10 sm:h-12 px-2 sm:px-3 glass-effect border border-white/10 rounded-xl text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:border-accent/40 cursor-pointer transition-all"
            >
              <option value="popular">Popularité</option>
              <option value="newest">Nouveautés</option>
              <option value="rating">Notes</option>
            </select>

            {/* Mode d'affichage */}
            <div className="flex glass-effect border border-white/10 rounded-xl p-1 gap-1">
              <button
                onClick={() => setModeAffichage("grid")}
                className={`p-2 rounded-lg transition-all tap-feedback ${modeAffichage === "grid" ? "bg-accent text-white" : "text-muted hover:text-accent"}`}
                title="Grille"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setModeAffichage("list")}
                className={`p-2 rounded-lg transition-all tap-feedback ${modeAffichage === "list" ? "bg-accent text-white" : "text-muted hover:text-accent"}`}
                title="Liste"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Résumé et filtres actifs */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              {donneesPretes ? (
                <>
                  <span className="font-semibold text-primary">{livresFiltres.length}</span>
                  {" "}livre{livresFiltres.length !== 1 ? "s" : ""}
                  {aDesFiltres && " trouvé" + (livresFiltres.length !== 1 ? "s" : "")}
                </>
              ) : (
                <span className="skeleton skeleton-text w-20 inline-block" />
              )}
            </p>
            {aDesFiltres && (
              <button
                onClick={effacerFiltres}
                className="text-xs text-accent font-semibold hover:opacity-75 flex items-center gap-1 transition-opacity tap-feedback"
              >
                <X className="w-3.5 h-3.5" />
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Grille / Liste des livres */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-8">
        {!donneesPretes ? (
          modeAffichage === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonGrille key={i} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonListe key={i} />)}
            </div>
          )
        ) : livresFiltres.length === 0 ? (
          <EtagereVide aDesFiltres={aDesFiltres} />
        ) : modeAffichage === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {livresFiltres.map((livre) => (
              <CarteLivreGrille key={livre.id} livre={livre} onClick={() => onBookClick?.(livre.id)} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {livresFiltres.map((livre) => (
              <CarteLivreListe key={livre.id} livre={livre} onClick={() => onBookClick?.(livre.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Panneau de filtres avancés */}
      <AdvancedFilters
        books={livres}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        isOpen={filtresOuverts}
        onClose={() => setFiltresOuverts(false)}
      />
    </div>
  );
}
