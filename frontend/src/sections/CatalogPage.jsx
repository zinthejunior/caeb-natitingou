/**
 * =============================================================================
 * PAGE CATALOGUE (CatalogPage)
 * =============================================================================
 * 
 * Cette page affiche tous les livres de la bibliothèque avec des options de
 * recherche, tri et filtrage.
 * 
 * FONCTIONNALITÉS :
 * - Recherche par titre, auteur ou genre
 * - Filtrage par genre littéraire et public cible
 * - Tri par popularité, nouveautés ou notes
 * - Affichage en grille ou en liste
 * - Affichage de la disponibilité des livres
 * 
 * CONCEPTS REACT UTILISÉS :
 * - useMemo : optimisation pour éviter les recalculs inutiles
 * - useState : gestion de l'état local (recherche, filtres, tri)
 * - useEffect : effets de bord (ex: marquer les données comme prêtes)
 * 
 * HOOKS PERSONNALISÉS :
 * - useLivres : récupère la liste des livres depuis l'API
 * - useGlobalStats : récupère les statistiques (nombre total de livres)
 * =============================================================================
 */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Star, X, Grid3X3, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ApiImage } from "@/components/ApiImage";
import { Navbar } from "@/components/Navbar";
import { useLivres, useGlobalStats } from "@/hooks/useData";
import { useSEO } from "@/lib/utils";

/**
 * Composant d'affichage quand aucun livre n'est trouvé
 * Montre une illustration et un message adapté selon si des filtres sont actifs
 */
function EtagereVide({ aDesFiltres }) {
  return <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      {/* Illustration SVG d'une étagère vide */}
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="85" width="100" height="6" rx="3" fill="currentColor" className="text-[var(--library-accent)] opacity-20" />
        <rect x="18" y="55" width="18" height="30" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="40" y="62" width="14" height="23" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        <rect x="58" y="50" width="20" height="35" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-30" fill="none" />
        <rect x="82" y="60" width="16" height="25" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--library-accent)] opacity-20" fill="none" />
        {/* Affiche une loupe si des filtres sont actifs, sinon un point d'interrogation */}
        {aDesFiltres && <>
            <circle cx="60" cy="30" r="14" stroke="currentColor" strokeWidth="2" className="text-[var(--library-accent)] opacity-40" fill="none" />
            <line x1="70" y1="40" x2="78" y2="48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[var(--library-accent)] opacity-40" />
          </>}
        {!aDesFiltres && <text x="60" y="38" textAnchor="middle" fontSize="20" fill="currentColor" className="text-[var(--library-accent)] opacity-25">?</text>}
      </svg>
      <h3 className="text-lg font-semibold text-primary">
        {aDesFiltres ? "Aucun résultat trouvé" : "Le catalogue est en cours de rangement"}
      </h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        {aDesFiltres ? "Il semble que ce livre joue à cache-cache. Essayez avec un autre titre, auteur ou genre !" : "Nos bibliothécaires préparent de belles découvertes pour vous. Revenez jeter un œil très bientôt."}
      </p>
    </div>;
}

/**
 * Squelette de chargement pour l'affichage en grille
 * Affiché pendant que les données sont récupérées
 */
function SkeletonGrille() {
  return <div className="flex flex-col h-full">
      <div className="skeleton skeleton-book-cover mb-3" />
      <div className="space-y-2">
        <div className="skeleton skeleton-text w-5/6" />
        <div className="skeleton skeleton-text-sm w-2/3" />
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton w-3 h-3 rounded-sm" />)}
        </div>
      </div>
    </div>;
}

/**
 * Squelette de chargement pour l'affichage en liste
 */
function SkeletonListe() {
  return <div className="surface rounded-xl p-4 border border-[var(--border-color)] flex gap-4">
      <div className="skeleton w-20 h-28 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="skeleton skeleton-title w-3/4" />
        <div className="skeleton skeleton-text w-1/2" />
        <div className="skeleton skeleton-text-sm w-1/3 mt-2" />
        <div className="skeleton skeleton-badge w-12 mt-1" />
      </div>
    </div>;
}

/**
 * Composant principal de la page Catalogue
 * @param {function} onBookClick - Fonction appelée quand on clique sur un livre
 * @param {object} user - Informations de l'utilisateur connecté
 */
export function CatalogPage({ onBookClick, user }) {
  // ─── RÉCUPÉRATION DES DONNÉES ──────────────────────────────────────────────
  // useLivres() est un hook personnalisé qui récupère les livres depuis l'API
  const { livres, chargement } = useLivres();
  
  // ─── ÉTAT LOCAL POUR LA RECHERCHE ET LES FILTRES ───────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const [recherche, setRecherche] = useState(() => searchParams.get("search") || "");           // Texte de recherche
  const [modeAffichage, setModeAffichage] = useState("grid"); // "grid" ou "list"
  const [genresSelectionnes, setGenresSelectionnes] = useState([]);    // Filtres genre
  const [publicSelectionne, setPublicSelectionne] = useState([]);      // Filtres public
  const [afficherDispoUniquement, setAfficherDispoUniquement] = useState(false);
  const [triPar, setTriPar] = useState(view === "new" ? "newest" : view === "popular" ? "popular" : "popular");          // Critère de tri
  const [donneesPretes, setDonneesPretes] = useState(false);
  
  // Marquer les données comme prêtes quand le chargement est terminé
  useEffect(() => {
    if (!chargement) setDonneesPretes(true);
  }, [chargement]);

  // Synchroniser le tri avec la vue de catégorie (si on arrive depuis la home)
  useEffect(() => {
    if (view === "new") setTriPar("newest");
    else if (view === "popular") setTriPar("popular");
  }, [view]);

  // Synchroniser le texte de recherche avec l'URL pour pouvoir partager l'état
  useEffect(() => {
    const params = {};
    if (view) params.view = view;
    if (recherche) params.search = recherche;
    setSearchParams(params, { replace: true });
  }, [recherche, view, setSearchParams]);
  
  // Récupération des statistiques globales pour le SEO
  const { stats } = useGlobalStats();
  const bookCount = stats?.books_count?.toLocaleString() ?? "...";
  const viewLabel = view === "new" ? "Nouveautés" : view === "popular" ? "Les plus populaires" : "";
  useSEO(
    `Catalogue${viewLabel ? ` • ${viewLabel}` : ""}`,
    viewLabel
      ? `Retrouvez toutes les ${viewLabel.toLowerCase()} de notre catalogue.`
      : `Explorez notre catalogue de ${bookCount} ouvrages : romans, essais, jeunesse, et bien plus encore.`
  );
  
  // ─── FILTRAGE ET TRI DES LIVRES (avec useMemo pour optimiser) ──────────────
  // useMemo mémorise le résultat et ne recalcule que si les dépendances changent
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
    
    // 2. Filtre par vue spécifique (nouvelles / populaires depuis la page d'accueil)
    if (view === "new") resultat = resultat.filter((l) => l.estNouveau);
    if (view === "popular") resultat = resultat.filter((l) => l.estPopulaire);

    // 3. Filtre par genre
    if (genresSelectionnes.length > 0) resultat = resultat.filter((l) => genresSelectionnes.includes(l.genre));
    
    // 4. Filtre par public cible
    if (publicSelectionne.length > 0) resultat = resultat.filter((l) => publicSelectionne.includes(l.publicCible || ""));
    
    // 4. Filtre disponibilité
    if (afficherDispoUniquement) resultat = resultat.filter((l) => l.exemplaires > 0);
    
    // 5. Tri selon le critère sélectionné
    switch (triPar) {
      case "newest":
        resultat.sort((a, b) => (b.annee || 0) - (a.annee || 0));
        break;
      case "rating":
        resultat.sort((a, b) => (b.note || 0) - (a.note || 0));
        break;
      default: // "popular"
        resultat.sort((a, b) => (b.estPopulaire ? 1 : 0) - (a.estPopulaire ? 1 : 0));
    }
    
    return resultat;
  }, [recherche, genresSelectionnes, publicSelectionne, afficherDispoUniquement, triPar, livres]);
  
  // ─── EXTRACTION DES GENRES ET PUBLICS DISPONIBLES ──────────────────────────
  const tousLesGenres = useMemo(
    () => Array.from(new Set(livres.map((l) => l.genre || "").filter(Boolean))).sort(),
    [livres]
  );
  const tousLesPublics = useMemo(
    () => Array.from(new Set(livres.map((l) => String(l.publicCible || "")))).sort(),
    [livres]
  );
  
  // ─── FONCTIONS DE GESTION DES FILTRES ──────────────────────────────────────
  const basculerGenre = (genre) => {
    setGenresSelectionnes((precedents) => precedents.includes(genre) ? precedents.filter((g) => g !== genre) : [...precedents, genre]);
  };
  const basculerPublic = (publicCible) => {
    setPublicSelectionne((precedents) => precedents.includes(publicCible) ? precedents.filter((p) => p !== publicCible) : [...precedents, publicCible]);
  };
  const effacerFiltres = () => {
    setGenresSelectionnes([]);
    setPublicSelectionne([]);
    setAfficherDispoUniquement(false);
  };
  
  // Calcul du nombre de filtres actifs
  const nbFiltresActifs = genresSelectionnes.length + publicSelectionne.length + (afficherDispoUniquement ? 1 : 0);
  const aDesFiltres = nbFiltresActifs > 0 || recherche.length > 0;
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {
    /* Titre de la page Modernisé */
  }
        <div className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
            <span className="text-gradient">Le Catalogue</span>
            {viewLabel && <span className="text-lg text-accent font-semibold"> • {viewLabel}</span>}
          </h1>
          <p className="text-muted text-lg pl-1 font-medium">
            {viewLabel
              ? `Retrouvez toutes les ${viewLabel.toLowerCase()} de notre collection.`
              : `Explorez nos ${bookCount} trésors littéraires — romans, essais et découvertes.`}
          </p>
        </div>

        {
    /* Barre de recherche & filtres */
  }
        <div className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <div className="lg:col-span-2">
              <div className="relative group">
              <form
    onSubmit={(e) => e.preventDefault()}
    className="relative"
  >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-accent pointer-events-none group-focus-within:scale-110 transition-transform duration-300" />
                <Input
    type="search"
    autoComplete="off"
    placeholder="Rechercher un titre, un auteur, un genre ou un sous-genre..."
    aria-label="Rechercher dans le catalogue"
    value={recherche}
    onChange={(e) => setRecherche(e.target.value)}
    className="pl-12 h-14 glass-effect border-white/10 focus:ring-4 focus:ring-accent/10 focus:border-accent/40 rounded-2xl text-primary placeholder:text-muted text-lg font-medium shadow-glow transition-all"
  />
                {recherche && <button
    type="button"
    onClick={() => setRecherche("")}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors tap-feedback"
    aria-label="Effacer la recherche"
  >
                    <X className="w-5 h-5" />
                  </button>}
              </form>
              <p className="mt-3 text-sm text-muted">Résultats instantanés pendant la saisie : titre, auteur, genre ou sous-genre.</p>
            </div>
          </div>

            <div className="flex gap-3">
              <select
    value={triPar}
    onChange={(e) => setTriPar(e.target.value)}
    className="flex-1 h-14 px-5 glass-effect border border-white/10 rounded-2xl text-sm font-bold text-primary focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/10 cursor-pointer transition-all"
  >
                <option value="popular">Trier par Popularité</option>
                <option value="newest">Trier par Nouveautés</option>
                <option value="rating">Trier par Notes</option>
              </select>

              <div className="flex glass-effect border border-white/10 rounded-2xl p-1.5 gap-1.5">
                <button
    onClick={() => setModeAffichage("grid")}
    className={`p-3 rounded-xl transition-all duration-300 tap-feedback ${modeAffichage === "grid" ? "bg-accent text-white shadow-glow" : "text-muted hover:text-accent"}`}
    title="Grille"
  >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
    onClick={() => setModeAffichage("list")}
    className={`p-3 rounded-xl transition-all duration-300 tap-feedback ${modeAffichage === "list" ? "bg-accent text-white shadow-glow" : "text-muted hover:text-accent"}`}
    title="Liste"
  >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {
    /* Filtres par genre et public */
  }
          <div className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-black text-muted uppercase tracking-[0.2em] mr-4">Genres</span>
              <div className="flex flex-wrap gap-2.5">
                {tousLesGenres.slice(0, 15).map((genre) => {
    const actif = genresSelectionnes.includes(genre);
    return <button
      key={genre}
      type="button"
      onClick={() => basculerGenre(genre)}
      className={`text-xs rounded-xl px-5 py-2.5 transition-all font-bold border ${actif ? "bg-accent text-white border-accent shadow-glow scale-105" : "glass-effect border-white/5 text-primary hover:border-accent/30 hover:text-accent"}`}
    >
                      {genre}
                    </button>;
  })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-semibold text-primary">Public</span>
              {tousLesPublics.map((publicCible) => {
    const actif = publicSelectionne.includes(publicCible);
    return <button
      key={publicCible}
      type="button"
      onClick={() => basculerPublic(publicCible)}
      className={`text-sm rounded-full px-3 py-1 transition-all ${actif ? "bg-[var(--library-accent)] text-[var(--library-on-accent)]" : "surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
    >
                    {publicCible || "Général"}
                  </button>;
  })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
    type="button"
    onClick={() => setAfficherDispoUniquement((prev) => !prev)}
    className={`text-sm rounded-full px-3 py-1 transition-all ${afficherDispoUniquement ? "bg-[var(--library-accent)] text-[var(--library-on-accent)]" : "surface border border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
  >
                {afficherDispoUniquement ? "Uniquement disponibles" : "Afficher tout (même empruntés)"}
              </button>
              {aDesFiltres && <span className="text-sm text-muted">{nbFiltresActifs} filtre{nbFiltresActifs > 1 ? "s" : ""} actif{nbFiltresActifs > 1 ? "s" : ""}</span>}
            </div>
          </div>

          {
    /* Résumé des résultats */
  }
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {donneesPretes ? <><span className="font-semibold text-primary">{livresFiltres.length}</span> livre{livresFiltres.length !== 1 ? "s" : ""}</> : <span className="skeleton skeleton-text w-20 inline-block" />}
            </p>
            {nbFiltresActifs > 0 && <button
    onClick={effacerFiltres}
    className="text-sm text-accent font-semibold hover:opacity-75 flex items-center gap-1 transition-opacity tap-feedback"
  >
                <X className="w-4 h-4" />
                Effacer les {nbFiltresActifs} filtre{nbFiltresActifs > 1 ? "s" : ""}
              </button>}
          </div>
        </div>
      </main>

      {
    /* Liste des résultats */
  }
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {!donneesPretes ? (
    /* Affichage du chargement */
    modeAffichage === "grid" ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonGrille key={i} />)}
            </div> : <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonListe key={i} />)}
            </div>
  ) : livresFiltres.length === 0 ? <EtagereVide aDesFiltres={aDesFiltres} /> : modeAffichage === "grid" ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {livresFiltres.map((livre) => <div key={livre.id} className="animate-flow-in">
                <CarteLivreGrille livre={livre} onClick={() => onBookClick?.(livre.id)} />
              </div>)}
          </div> : <div className="space-y-4">
            {livresFiltres.map((livre) => <div key={livre.id} className="animate-flow-in">
                <CarteLivreListe livre={livre} onClick={() => onBookClick?.(livre.id)} />
              </div>)}
          </div>}
      </div>
    </div>;
}
function CarteLivreGrille({ livre, onClick }) {
  return <button onClick={onClick} className="text-left group flex flex-col h-full tap-feedback animate-flow-in">
      <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden shadow-card mb-4 glass-effect border border-white/5 group-hover:border-accent/30 transition-all duration-500">
        <ApiImage
    src={livre.couverture}
    alt={livre.titre}
    fallback="/default_cover.png"
    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
  />
        {livre.exemplaires <= 0 && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4">
            <span className="text-white text-[10px] font-black px-3 py-1.5 bg-red-500/80 rounded-full uppercase tracking-widest shadow-glow-red">Indisponible</span>
          </div>}
        {livre.estNouveau && <Badge className="absolute top-4 left-4 bg-accent text-white text-[10px] font-black uppercase tracking-widest shadow-glow border-none px-3 py-1">Nouveau</Badge>}
      </div>
      <div className="flex-1 flex flex-col px-1">
        <h3 className="font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors text-base mb-1">{livre.titre}</h3>
        <p className="text-sm text-muted font-medium line-clamp-1 mb-auto">{livre.auteur}</p>
        <div className="flex items-center gap-1 mt-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-3.5 h-3.5 ${n <= Math.round(livre.note) ? "fill-accent text-accent" : "text-white/10"}`} />)}
          </div>
          <span className="text-xs font-black text-accent ml-2">{livre.note}</span>
        </div>
      </div>
    </button>;
}
function CarteLivreListe({ livre, onClick }) {
  return <button
    onClick={onClick}
    className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-300 text-left flex gap-4 group tap-feedback"
  >
      <div className="relative w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 surface-weak">
        <ApiImage
    src={livre.couverture}
    alt={livre.titre}
    fallback="/default_cover.png"
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
  />
        {livre.exemplaires <= 0 && <div className="absolute inset-0 surface-weak/90 flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted px-1 py-0.5 surface rounded">Indisponible</span>
          </div>}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-semibold text-primary line-clamp-1 group-hover:text-accent transition-colors">{livre.titre}</h3>
            <p className="text-sm text-muted">{livre.auteur}</p>
          </div>
          {livre.estNouveau && <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-xs flex-shrink-0 font-bold">Nouveau</Badge>}
        </div>
        <p className="text-xs text-muted mb-2">{livre.genre}</p>
        <div className="flex items-center gap-0.5 star-cascade">
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`star w-3.5 h-3.5 ${n <= Math.round(livre.note) ? "fill-[var(--library-accent)] text-[var(--library-accent)]" : "text-[var(--border-color)]"}`} />)}
          <span className="text-sm text-accent font-semibold ml-1">{livre.note}</span>
          <span className="text-xs text-muted">({livre.nbAvis} avis)</span>
        </div>
      </div>
    </button>;
}
