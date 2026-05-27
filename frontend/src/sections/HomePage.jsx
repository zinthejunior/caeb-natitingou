import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar, Star, ChevronRight, Flame, Sparkles,
  TrendingUp, Lock, Newspaper, Heart, BookOpen, ArrowRight
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ApiImage } from "@/components/ApiImage";
import { Button } from "@/components/ui/button";
import {
  useLivres, useEvenements, useActualites,
  useRecommandations, useGlobalStats
} from "@/hooks/useData";
import { useSEO } from "@/lib/utils";

/* ─── Composants de chargement (Skeletons) ─────────────────────────────────────────────────── */
// Ces composants s'affichent pendant le chargement des données

/**
 * Squelette d'affichage pour une carte de livre
 * Simule l'apparence d'une carte de livre pendant le chargement
 */
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

/**
 * Squelette d'affichage pour une carte d'événement
 * Simule l'apparence d'une carte d'événement pendant le chargement
 */
function SkeletonEventCard() {
  return (
    <div className="surface rounded-xl p-3 border border-[var(--border-color)] flex items-center gap-3">
      <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton skeleton-text w-4/5" />
        <div className="skeleton skeleton-text-sm w-2/3" />
      </div>
    </div>
  );
}

/**
 * Squelette d'affichage pour une carte d'actualité
 * Simule l'apparence d'une carte d'actualité pendant le chargement
 */
function SkeletonNewsCard() {
  return (
    <div className="surface rounded-2xl overflow-hidden border border-[var(--border-color)]">
      <div className="skeleton w-full" style={{ aspectRatio: "16/9", borderRadius: 0 }} />
      <div className="p-4 space-y-3">
        <div className="skeleton skeleton-badge w-16" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text w-4/5" />
      </div>
    </div>
  );
}

/* ─── En-tête de section ─────────────────────────────────────────────── */

/**
 * En-tête pour chaque section de la page (Actualités, Agenda, etc.)
 * @param {string} title - Le titre de la section
 * @param {Component} icon - L'icône à afficher
 * @param {function} onSeeAll - Fonction appelée quand on clique sur "Voir tout"
 * @param {boolean} accent - Si true, utilise un style accentué
 */
function SectionHeader({ title, icon: Icon, onSeeAll, accent = false }) {
  return (
    <div className="flex items-center justify-between mb-5 px-1">
      <h2 className="font-display font-semibold text-xl text-primary flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg border ${accent
          ? "bg-[var(--library-accent)] border-[var(--library-accent)] text-white"
          : "bg-[var(--library-accent)]/10 border-[var(--library-accent)]/20 text-accent"}`}>
          <Icon className="w-4 h-4" />
        </div>
        {title}
      </h2>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="text-sm font-semibold text-accent hover:opacity-75 flex items-center gap-1 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] focus:ring-offset-0 rounded px-2 py-1 tap-feedback"
        >
          <span className="hidden sm:inline">Voir tout</span>
          <span className="sm:hidden">Plus</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ─── Carte de livre ──────────────────────────────────────────────────── */

/**
 * Carte représentant un livre dans l'interface
 * @param {Object} book - Les informations du livre
 * @param {Object} user - Les informations de l'utilisateur connecté
 * @param {function} onClick - Fonction appelée quand on clique sur la carte
 * @param {function} onToggleFavorite - Fonction pour ajouter/supprimer des favoris
 * @param {string} size - Taille de la carte ("md" par défaut)
 */
function BookCard({ book, user, onClick, onToggleFavorite, size = "md" }) {
  // Vérifie si le livre est dans les favoris de l'utilisateur
  const isFavorited = user?.favoris?.includes(book.id) || false;
  const [heartPop, setHeartPop] = useState(false); // Animation du cœur

  // Gère la navigation au clavier (accessibilité)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
  };
  
  // Gère l'ajout/suppression des favoris
  const handleFavorite = (e) => {
    e.stopPropagation(); // Empêche le clic de propager à la carte
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400); // Animation pop
    onToggleFavorite?.(book.id);
  };

  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick} onKeyDown={handleKeyDown}
      className="w-full text-left group relative flex flex-col h-full book-card-3d cursor-pointer"
    >
      {/* Zone de la couverture du livre */}
      <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-card mb-3 surface-weak">
        <ApiImage
          src={book.couverture} alt={book.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Bouton favori (cœur) */}
        <button
          onClick={handleFavorite}
          className="absolute top-2 right-2 p-2 rounded-full surface shadow-soft hover:shadow-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
          style={{
            transform: heartPop ? "scale(1.35)" : "scale(1)",
            transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)"
          }}
          aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={`w-4 h-4 transition-colors ${isFavorited ? "fill-red-500 text-red-500" : "text-muted"}`} />
        </button>
        
        {/* Affiche un cadenas si l'utilisateur n'est pas membre et qu'il n'y a plus d'exemplaires */}
        {!user?.estMembre && book.exemplaires <= 0 && (
          <div className="absolute inset-0 surface/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="surface p-2 rounded-full shadow-medium">
              <Lock className="w-4 h-4 text-accent" />
            </div>
          </div>
        )}
      </div>
      
      {/* Informations du livre */}
      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-primary line-clamp-1 group-hover:text-accent transition-colors text-base">{book.titre}</h3>
        <p className="text-sm text-muted line-clamp-1 mb-1">{book.auteur}</p>
        
        {/* Note et badge premium */}
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-0.5 star-cascade">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`star w-3 h-3 ${n <= Math.round(book.note || 4.5)
                ? "fill-[var(--library-accent)] text-[var(--library-accent)]"
                : "text-[var(--border-color)]"}`} />
            ))}
            <span className="text-xs font-semibold text-accent ml-1">{book.note || "4.5"}</span>
          </div>
          {!user?.estMembre && (
            <span className="text-[10px] font-bold text-accent bg-[var(--library-accent)]/10 px-2 py-0.5 rounded-full">PREMIUM</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Carte de livre mise en avant (grande version horizontale) ─────── */

/**
 * Version plus grande de la carte de livre, utilisée pour les recommandations
 * Affichage horizontal avec plus d'informations
 */
function FeaturedBookCard({ book, user, onClick, onToggleFavorite }) {
  const isFavorited = user?.favoris?.includes(book.id) || false;
  const [heartPop, setHeartPop] = useState(false);

  const handleFavorite = (e) => {
    e.stopPropagation();
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 400);
    onToggleFavorite?.(book.id);
  };

  return (
    <div
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="group relative flex gap-4 surface rounded-2xl p-4 border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer"
    >
      {/* Miniature de la couverture */}
      <div className="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden shadow-card">
        <ApiImage src={book.couverture} alt={book.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      
      {/* Informations */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-bold text-primary line-clamp-2 group-hover:text-accent transition-colors text-sm leading-snug mb-1">{book.titre}</h3>
          <p className="text-xs text-muted line-clamp-1">{book.auteur}</p>
        </div>
        
        {/* Note et favori */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`w-3 h-3 ${n <= Math.round(book.note || 4.5)
                ? "fill-[var(--library-accent)] text-[var(--library-accent)]"
                : "text-[var(--border-color)]"}`} />
            ))}
            <span className="text-xs font-semibold text-accent ml-1">{book.note || "4.5"}</span>
          </div>
          <button
            onClick={handleFavorite}
            style={{ transform: heartPop ? "scale(1.35)" : "scale(1)", transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
            aria-label={isFavorited ? "Retirer des favoris" : "Ajouter aux favoris"}
            className="p-1.5 rounded-full hover:bg-[var(--library-accent)]/10 focus:outline-none"
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-red-500 text-red-500" : "text-muted"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Carte d'événement ─────────────────────────────────────────────────── */

/**
 * Carte représentant un événement (conférence, atelier, etc.)
 * Affiche la date, l'heure et le lieu
 */
function EventCard({ event, user, onClick }) {
  const eventDate = new Date(event.date); // Convertit la date en objet Date
  return (
    <button
      onClick={onClick}
      className="w-full surface rounded-xl p-3 shadow-card border border-[var(--border-color)] hover:shadow-card-hover hover:border-[var(--library-accent)]/25 transition-all duration-300 text-left flex items-center gap-3 group tap-feedback"
    >
      {/* Bloc de date stylisé */}
      <div className="w-12 h-12 surface-alt rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-[var(--library-accent)]/10 group-hover:border-[var(--library-accent)]/30 transition-all">
        <span className="text-[9px] text-muted font-bold uppercase tracking-wider">
          {eventDate.toLocaleDateString("fr-FR", { month: "short" })} {/* Mois abrégé */}
        </span>
        <span className="text-lg font-bold text-primary group-hover:text-accent transition-colors leading-none">
          {eventDate.getDate()} {/* Jour du mois */}
        </span>
      </div>
      
      {/* Informations de l'événement */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-primary truncate group-hover:text-accent transition-colors text-sm">{event.titre}</h3>
          {/* Affiche un cadenas pour les conférences réservées aux membres */}
          {!user?.estMembre && event.type === "conference" && <Lock className="w-3 h-3 text-muted flex-shrink-0" />}
        </div>
        <div className="flex items-center text-xs text-muted gap-1.5">
          <span>{event.heure}</span>
          <span className="w-1 h-1 bg-[var(--border-color)] rounded-full" />
          <span className="truncate">{event.lieu}</span>
        </div>
      </div>
    </button>
  );
}

/* ─── Carte d'actualité ──────────────────────────────────────────────────── */

// Configuration des catégories d'actualités (styles et libellés)
const categoryConfig = {
  announcement: { label: "Annonce",    cls: "bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20" },
  event:        { label: "Événement",  cls: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  course:       { label: "Formation",  cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  visit:        { label: "Visite",     cls: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  closure:      { label: "Fermeture",  cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  general:      { label: "Actualité",  cls: "surface-weak text-muted border-[var(--border-color)]" },
};

/**
 * Carte représentant une actualité (article, annonce, etc.)
 * @param {Object} news - L'actualité à afficher
 * @param {boolean} featured - Si true, affiche une version mise en avant (plus grande)
 */
function NewsCard({ news, onClick, featured = false }) {
  const newsDate = new Date(news.date);
  const cfg = categoryConfig[news.categorie] || categoryConfig.general;

  // Version mise en avant (pour l'article principal)
  if (featured) {
    return (
      <button onClick={onClick} className="w-full text-left group tap-feedback h-full">
        <div className="surface rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 hover:shadow-card-hover transition-all duration-300 flex flex-col h-full">
          {news.image && (
            <div className="relative w-full overflow-hidden bg-[var(--library-surface-alt)]" style={{ aspectRatio: "16/7" }}>
              <ApiImage src={news.image} alt={news.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {/* Overlay dégradé pour améliorer la lisibilité du texte */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls} mb-2 inline-block`}>{cfg.label}</span>
                <h3 className="font-bold text-white line-clamp-2 text-lg leading-snug">{news.titre}</h3>
              </div>
            </div>
          )}
          <div className="p-4 flex items-center justify-between">
            <p className="text-sm text-muted line-clamp-1 flex-1 mr-4">{news.resume}</p>
            <span className="text-xs font-medium text-muted whitespace-nowrap">
              {newsDate.getDate()} {newsDate.toLocaleDateString("fr-FR", { month: "short" })}
            </span>
          </div>
        </div>
      </button>
    );
  }

  // Version normale
  return (
    <button onClick={onClick} className="w-full text-left group flex flex-col h-full tap-feedback">
      <div className="surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 transition-all duration-300 flex flex-col h-full">
        {news.image && (
          <div className="relative w-full aspect-video overflow-hidden bg-[var(--library-surface-alt)]">
            <ApiImage src={news.image} alt={news.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="flex flex-col flex-1 p-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label}</span>
            <span className="text-xs font-medium text-muted whitespace-nowrap ml-auto">
              {newsDate.getDate()} {newsDate.toLocaleDateString("fr-FR", { month: "short" })}
            </span>
          </div>
          <h3 className="font-bold text-primary line-clamp-2 group-hover:text-accent transition-colors mb-1 text-sm">{news.titre}</h3>
          <p className="text-xs text-muted line-clamp-2 mb-3 flex-1">{news.resume}</p>
          <div className="flex items-center text-xs font-semibold text-accent gap-0.5">
            En savoir plus <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Fonction utilitaire pour gérer les favoris ─────────────────────────────────────── */

/**
 * Ajoute ou retire un livre des favoris de l'utilisateur
 * @param {Object} user - L'utilisateur (modifié directement)
 * @param {string} id - L'ID du livre à ajouter/retirer
 */
function toggleFav(user, id) {
  if (!user) return; // Sécurité : vérifier que user existe
  if (user.favoris?.includes(id)) {
    user.favoris = user.favoris.filter((f) => f !== id); // Retire des favoris
  } else {
    user.favoris = [...(user.favoris || []), id]; // Ajoute aux favoris
  }
}

/* ─── Page d'accueil principale ───────────────────────────────────────────────────── */

/**
 * Page d'accueil de l'application
 * Affiche les actualités, événements, et recommandations de livres
 * @param {Object} user - Les informations de l'utilisateur connecté
 */
export function HomePage({ user }) {
  const navigate = useNavigate(); // Hook React Router pour la navigation

  /**
   * Fonction de navigation centralisée
   * @param {string} route - La route cible (profile, news, catalog, etc.)
   * @param {Object} params - Paramètres supplémentaires (ex: ID d'un livre)
   */
  const onNavigate = (route, params) => {
    if (route === "profile")      navigate("/profile");
    if (route === "news")         navigate("/news");
    if (route === "news-detail")  navigate(`/news/${params.newsId}`);
    if (route === "catalog")      navigate("/catalog");
    if (route === "book-detail")  navigate(`/catalog/${params.bookId}`);
    if (route === "events")       navigate("/events");
    if (route === "event-detail") navigate(`/events/${params.eventId}`);
  };

  // Salutation dynamique selon l'heure de la journée
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  });

  // Récupération des données via des hooks personnalisés
  const { stats }    = useGlobalStats();        // Statistiques globales (nombre de livres, etc.)
  const bookCount    = stats?.books_count?.toLocaleString() ?? "...";

  // SEO : Met à jour le titre et la description de la page
  useSEO(
    "Accueil",
    `Découvrez la collection de ${bookCount} ouvrages de la Bibliothèque CAEB de Natitingou, réservez vos livres et participez à nos événements.`
  );

  const [dataReady, setDataReady]   = useState(false); // Indique si les données sont chargées
  const { livres: books }           = useLivres();     // Récupère tous les livres
  const { evenements: events }      = useEvenements(); // Récupère tous les événements
  const { actualites: news }        = useActualites(); // Récupère toutes les actualités
  const { recommandations }         = useRecommandations(); // Récupère les recommandations IA
  const [iaBooks, setIaBooks]       = useState([]);    // Stocke les livres recommandés par l'IA

  // Effet : Active dataReady après 700ms (pour laisser le temps au chargement)
  useEffect(() => { 
    const t = setTimeout(() => setDataReady(true), 700); 
    return () => clearTimeout(t); 
  }, []);
  
  // Effet : Met à jour iaBooks quand les recommandations arrivent
  useEffect(() => { 
    if (recommandations?.recommendations) setIaBooks(recommandations.recommendations); 
  }, [recommandations]);

  // Filtrage et tri des données pour l'affichage
  const recommendedBooks = (iaBooks.length > 0 ? iaBooks : books.filter((b) => Boolean(b.estRecommande))).slice(0, 6);
  const newBooks         = books.filter((b) => Boolean(b.estNouveau)).slice(0, 4);
  const latestNews       = news.slice(0, 4);
  const popularBooks     = books.filter((b) => Boolean(b.estPopulaire)).slice(0, 4);
  const upcomingEvents   = events.filter((e) => new Date(e.date) >= new Date()).slice(0, 4); // Événements futurs uniquement

  const featuredNews = latestNews[0];      // Premier article (mise en avant)
  const secondaryNews = latestNews.slice(1, 4); // Autres articles

  return (
    <div className="min-h-screen bg-library-bg pb-24 transition-colors duration-300">
      {/* Barre de navigation */}
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24 space-y-12">

        {/* ── SECTION HERO (Bannière d'accueil) ──────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-[2rem] mesh-gradient-light dark:mesh-gradient-dark border border-[var(--border-color)] shadow-elevated transition-all duration-500 hover:shadow-glow animate-flow-in">
          {/* Effets de fond animés (cercles flous) */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--library-accent)]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none animate-float" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[var(--library-accent)]/5 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none animate-float" style={{ animationDelay: "2s" }} />

          <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1">
              <p className="text-muted font-medium mb-1 opacity-80">{greeting},</p>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4 text-primary tracking-tight">
                <span className="text-gradient">{user?.prenom || "Utilisateur"}</span> !
              </h1>
              <p className="text-lg text-muted max-w-lg leading-relaxed font-medium">
                {newBooks.length > 0
                  ? <><span className="text-accent font-bold">{newBooks.length} nouveautés</span> captivantes vous attendent aujourd'hui. Prêt pour l'aventure ?</>
                  : <>Découvrez notre sélection exclusive de <span className="text-accent font-bold">{bookCount} ouvrages</span> à la Bibliothèque CAEB.</>}
              </p>
              {/* Bouton "Devenir Membre" pour les non-membres */}
              {!user?.estMembre && (
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button onClick={() => onNavigate("profile")} className="btn-solid px-8 py-6 rounded-2xl shadow-glow hover:shadow-elevated transition-all font-bold text-lg group">
                    Devenir Membre
                  </Button>
                </div>
              )}
            </div>
            {/* Icône décorative (ordinateur) */}
            <div className="hidden md:block relative w-48 h-48 animate-float">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl" />
              <BookOpen className="w-full h-full text-accent/20 relative z-10" />
            </div>
          </div>
        </header>

        {/* ── SECTION ACTUALITÉS + AGENDA ──────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">

          {/* Bloc Actualités (2/3 de la largeur) */}
          <div className="lg:col-span-2">
            <SectionHeader title="Actualités" icon={Newspaper} onSeeAll={() => onNavigate("news")} />
            
            {/* Affichage conditionnel : skeleton pendant le chargement, sinon les vraies actualités */}
            {!dataReady ? (
              <div className="space-y-4">
                <SkeletonNewsCard />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[0, 1, 2].map((i) => <SkeletonNewsCard key={i} />)}
                </div>
              </div>
            ) : latestNews.length > 0 ? (
              <div className="space-y-4">
                {/* Article principal (mise en avant) */}
                {featuredNews && (
                  <NewsCard
                    news={featuredNews}
                    featured
                    onClick={() => onNavigate("news-detail", { newsId: featuredNews.id })}
                  />
                )}
                {/* Articles secondaires (grille) */}
                {secondaryNews.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {secondaryNews.map((item) => (
                      <div key={item.id} className="list-item-fade">
                        <NewsCard news={item} onClick={() => onNavigate("news-detail", { newsId: item.id })} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Bloc Agenda (1/3 de la largeur) */}
          <div className="lg:col-span-1">
            <SectionHeader title="Agenda" icon={Calendar} onSeeAll={() => onNavigate("events")} />
            {!dataReady ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => <SkeletonEventCard key={i} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    user={user}
                    onClick={() => onNavigate("event-detail", { eventId: event.id })}
                  />
                ))}
                {upcomingEvents.length === 0 && (
                  <p className="text-sm text-muted text-center py-8">Aucun événement à venir.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION RECOMMANDATIONS (IA) ─────────────────────────────── */}
        <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          
          {/* ── EN-TÊTE DE LA SECTION ────────────────────────────────────── */}
          {/* C'est le titre "Recommandé pour vous" avec l'icône et le badge IA */}
          <div className="flex items-center justify-between mb-5 px-1">
            <h2 className="font-display font-semibold text-xl text-primary flex items-center gap-2.5">
              <div className="p-1.5 bg-[var(--library-accent)] border border-[var(--library-accent)] rounded-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Recommandé pour vous
              <span className="text-[10px] font-bold tracking-wider text-accent bg-[var(--library-accent)]/10 px-2 py-0.5 rounded-full border border-[var(--library-accent)]/20">IA</span>
            </h2>
            <button
              onClick={() => onNavigate("catalog")}
              className="text-sm font-semibold text-accent hover:opacity-75 flex items-center gap-1 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] rounded px-2 py-1 tap-feedback"
            >
              <span className="hidden sm:inline">Voir tout</span>
              <span className="sm:hidden">Plus</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── AFFICHAGE CONDITIONNEL ───────────────────────────────────── */}
          {/* 
            C'est ici que se fait la magie. On a 3 cas possibles :
            1. Les données chargent → on affiche les squelettes (skeletons)
            2. Les données sont chargées ET il y a des livres → on affiche les livres
            3. Les données sont chargées MAIS il n'y a PAS de livres → on affiche un message
          */}

          {!dataReady ? (
            /* CAS 1 : Pendant le chargement des données */
            /* On affiche 6 squelettes (dessins gris animés) pour faire patienter l'utilisateur */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonBookCard key={i} />)}
            </div>
          ) : recommendedBooks.length > 0 ? (
            /* CAS 2 : Les données sont chargées ET il y a des livres */
            /* On affiche la grille complète avec les 2 grands livres à gauche et les 4 petits à droite */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne de gauche : 2 grands livres (FeaturedBookCard) */}
              <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-3">
                {recommendedBooks.slice(0, 2).map((book, idx) => (
                  <div key={book.id || `rec-${idx}`} className="list-item-fade">
                    <FeaturedBookCard
                      book={book}
                      user={user}
                      onClick={() => onNavigate("book-detail", { bookId: book.id })}
                      onToggleFavorite={(id) => toggleFav(user, id)}
                    />
                  </div>
                ))}
              </div>
              {/* Colonne de droite : 4 petits livres (BookCard) */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recommendedBooks.slice(2, 6).map((book, idx) => (
                  <div key={book.id || `rec-s-${idx}`} className="list-item-fade">
                    <BookCard
                      book={book}
                      user={user}
                      onClick={() => onNavigate("book-detail", { bookId: book.id })}
                      onToggleFavorite={(id) => toggleFav(user, id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* CAS 3 : Les données sont chargées MAIS il n'y a AUCUN livre */
            /* On affiche un message sympa au lieu de laisser des blocs vides avec des étoiles */
            <div className="text-center py-12 surface rounded-2xl border border-[var(--border-color)]">
              {/* Une petite icône étincelle, mais atténuée (opacité réduite) */}
              <Sparkles className="w-12 h-12 text-muted mx-auto mb-3 opacity-30" />
              {/* Message principal */}
              <p className="text-muted font-medium">Pas encore de recommandations personnalisées.</p>
              {/* Message secondaire pour rassurer l'utilisateur */}
              <p className="text-sm text-muted/70 mt-1">Consultez nos nouveautés ou nos livres populaires !</p>
            </div>
          )}
        </section>


        {/* ── SECTION NOUVEAUTÉS + POPULAIRES (côte à côte) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Nouveautés */}
          <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <SectionHeader title="Nouveautés" icon={TrendingUp} onSeeAll={() => onNavigate("catalog")} />
            {!dataReady ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => <SkeletonBookCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {newBooks.map((book, idx) => (
                  <div key={book.id || `new-${idx}`} className="list-item-fade">
                    <BookCard
                      book={book}
                      user={user}
                      onClick={() => onNavigate("book-detail", { bookId: book.id })}
                      onToggleFavorite={(id) => toggleFav(user, id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

                    {/* Livres populaires */}
          <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <SectionHeader title="Les plus populaires" icon={Flame} onSeeAll={() => onNavigate("catalog")} />
            {!dataReady ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => <SkeletonBookCard key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-4">
                {popularBooks.map((book, idx) => (
                  <div key={book.id || `pop-${idx}`} className="list-item-fade">
                    <BookCard
                      book={book}
                      user={user}
                      onClick={() => onNavigate("book-detail", { bookId: book.id })}
                      onToggleFavorite={(id) => toggleFav(user, id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}