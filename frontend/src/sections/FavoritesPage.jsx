/**
 * =============================================================================
 * PAGE DES FAVORIS (FavoritesPage)
 * =============================================================================
 * 
 * Cette page affiche les livres que l'utilisateur a marqués comme favoris
 * (en cliquant sur le cœur dans les autres pages).
 * 
 * FONCTIONNALITÉS : 
 * - Affichage des livres favoris avec couverture, note et disponibilité
 * - Tri par date d'ajout, note ou titre
 * - Possibilité de retirer un livre des favoris
 * - Lien vers la page de détail du livre
 * 
 * CONCEPTS REACT UTILISÉS :
 * - useState : gestion du tri sélectionné
 * - filter() : filtrage des livres pour ne garder que les favoris
 * - sort() : tri des livres selon le critère choisi
 * 
 * STOCKAGE DES FAVORIS :
 * - Les IDs des favoris sont stockés dans user.favorites (tableau)
 * - La synchronisation se fait via le hook onToggleFavorite du parent
 * =============================================================================
 */

import { Heart, ChevronLeft, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ApiImage } from "@/components/ApiImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBooks } from "@/hooks/useData";
import { useState } from "react";
import { useSEO } from "@/lib/utils";

/**
 * Composant affiché quand il n'y a pas de favoris
 * Montre une illustration de cœur vide avec un bouton vers le catalogue
 */
function EmptyFavorites({ onNavigate }) {
  return <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      {/* SVG : cœur avec étagère */}
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Étagère */}
        <rect x="15" y="90" width="90" height="5" rx="2.5" fill="currentColor" className="text-red-400 opacity-15" />
        {/* Deux livres ternes */}
        <rect x="25" y="65" width="16" height="25" rx="2" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        <rect x="80" y="70" width="14" height="20" rx="2" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        {/* Grand cœur central creux */}
        <path
    d="M60 78 L35 58 C28 51 28 40 38 37 C44 35 50 38 54 43 L60 50 L66 43 C70 38 76 35 82 37 C92 40 92 51 85 58 Z"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinejoin="round"
    className="text-red-400 opacity-30"
    fill="none"
  />
        {/* Petit plus au centre du cœur */}
        <line x1="60" y1="56" x2="60" y2="68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 opacity-40" />
        <line x1="54" y1="62" x2="66" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-red-400 opacity-40" />
      </svg>
      <h3 className="text-xl font-semibold text-primary">Pas encore de favoris</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Mettez de côté vos futurs coups de cœur. Touchez le petit cœur sur un livre et gardez-le précieusement ici !
      </p>
      <Button onClick={() => onNavigate("catalog")} className="btn-solid gap-2 shadow-medium hover:shadow-elevated transition-all font-bold mt-2 tap-feedback">
        <ChevronLeft className="w-4 h-4" />Explorer le catalogue
      </Button>
    </div>;
}

/**
 * Composant principal de la page Favoris
 * @param {object} user - Informations de l'utilisateur (contient user.favorites)
 * @param {function} onNavigate - Fonction de navigation vers d'autres pages
 * @param {function} onToggleFavorite - Fonction pour ajouter/retirer un favori
 */
export function FavoritesPage({ user, onNavigate, onToggleFavorite }) {
  // ─── ÉTAT LOCAL ────────────────────────────────────────────────────────────
  const [sortBy, setSortBy] = useState("recent"); // Critère de tri : "recent", "rating", "title"
  
  // ─── RÉCUPÉRATION DES LIVRES ───────────────────────────────────────────────
  const { books } = useBooks();
  
  // SEO
  useSEO("Mes Favoris", "Consultez et gérez votre liste de livres coups de cœur à la bibliothèque CAEB Natitingou.");
  
  // ─── PROTECTION : Utilisateur non connecté ─────────────────────────────────
  if (!user) {
    return <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Veuillez vous connecter pour voir vos favoris</p>
          </div>
        </main>
      </div>;
  }
  
  // ─── FILTRAGE ET TRI DES FAVORIS ───────────────────────────────────────────
  // 1. Filtrer pour ne garder que les livres dont l'ID est dans user.favorites
  const favoriteBooks = books.filter((book) => user.favorites?.includes(book.id));
  
  // 2. Trier selon le critère sélectionné
  const sortedFavorites = [...favoriteBooks].sort((a, b) => {
    if (sortBy === "rating") return b.note - a.note;           // Par note décroissante
    if (sortBy === "title") return a.titre.localeCompare(b.titre); // Alphabétique
    return 0; // Par défaut (récent) : ordre d'origine
  });
  
  // ─── OPTIONS DE TRI ────────────────────────────────────────────────────────
  const sortOptions = [
    { key: "recent", label: "Récent" },
    { key: "rating", label: "Note" },
    { key: "title", label: "Titre" }
  ];
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {
    /* En-tête Modernisé */
  }
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shadow-glow-red">
              <Heart className="w-6 h-6 text-red-500 fill-current" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">
              <span className="text-gradient">Mes Favoris</span>
            </h1>
          </div>
          <p className="text-muted text-lg pl-1 font-medium">
            <span className="text-accent font-black">{sortedFavorites.length}</span>{" "}
            ouvrage{sortedFavorites.length !== 1 ? "s" : ""} dans votre collection privée
          </p>
        </div>

          <div className="flex gap-3 mb-10 flex-wrap">
            {sortOptions.map((opt) => <button
    key={opt.key}
    onClick={() => setSortBy(opt.key)}
    aria-pressed={sortBy === opt.key}
    className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-accent/20 tap-feedback ${sortBy === opt.key ? "bg-accent text-white border-accent shadow-glow scale-105" : "glass-effect border-white/10 text-primary hover:border-accent/30 hover:text-accent"}`}
  >
                {opt.label}
              </button>)}
          </div>

          {sortedFavorites.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {sortedFavorites.map((book) => <div
    key={book.id}
    className="glass-effect rounded-[2.5rem] overflow-hidden shadow-card hover:shadow-glow border border-white/10 hover:border-accent/30 transition-all duration-500 flex flex-col group cursor-pointer animate-flow-in"
    onClick={() => onNavigate("book-detail", { bookId: book.id })}
  >

                {
    /* Couverture */
  }
                <div className="relative aspect-[2/3] w-full overflow-hidden surface-alt flex-shrink-0">
                  <ApiImage
    src={book.couverture}
    alt={book.titre}
    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
  />

                  <button
    onClick={(e) => {
      e.stopPropagation();
      onToggleFavorite?.(book.id);
    }}
    className="absolute top-2 right-2 p-2 rounded-full surface shadow-medium hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-red-500/50 z-10"
    style={{ transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    aria-label="Retirer des favoris"
  >
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                  </button>

                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {book.exemplaires <= 0 && <Badge variant="destructive" className="text-[10px]">Indisponible</Badge>}
                    {book.estNouveau && <Badge className="bg-[var(--library-accent)] text-[var(--library-on-accent)] text-[10px]">Nouveau</Badge>}
                  </div>
                </div>

                {
    /* Détails */
  }
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-sm text-primary line-clamp-2 mb-1 group-hover:text-accent transition-colors">{book.titre}</h3>
                  <p className="text-xs text-muted line-clamp-1 mb-2">{book.auteur}</p>
                  {
    /* Étoiles cascade */
  }
                  <div className="flex items-center gap-0.5 mb-3 star-cascade">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`star w-3.5 h-3.5 ${n <= Math.round(book.note) ? "fill-[var(--library-accent)] text-[var(--library-accent)]" : "text-[var(--border-color)]"}`} />)}
                    <span className="text-xs font-bold text-accent ml-1">{book.note}</span>
                    {book.nbAvis && <span className="text-xs text-muted">({book.nbAvis})</span>}
                  </div>
                  <Badge variant="outline" className="text-xs w-fit mb-3 border-[var(--border-color)] text-muted">{book.genre}</Badge>
                  <Button
    onClick={(e) => {
      e.stopPropagation();
      onNavigate("book-detail", { bookId: book.id });
    }}
    size="sm"
    className="btn-solid w-full mt-auto font-semibold tap-feedback"
  >
                    Voir les détails
                  </Button>
                </div>
              </div>)}
          </div> : <EmptyFavorites onNavigate={onNavigate} />}
      </main>
    </div>;
}
