/**
 * =============================================================================
 * PAGE RECOMMANDATIONS (RecommendationsPage)
 * =============================================================================
 *
 * Cette page affiche les recommandations personnalisées pour l'utilisateur.
 * Elle utilise le hook `useRecommandations()` pour récupérer les livres suggérés
 * par l'IA, puis permet de consulter directement les détails d'un livre.
 *
 * Cette page est appelée depuis la section "Recommandé pour vous" de la page
 * d'accueil lorsqu'on clique sur "Voir tout".
 * =============================================================================
 */
import { Navbar } from "@/components/Navbar";
import { ApiImage } from "@/components/ApiImage";
import { Badge } from "@/components/ui/badge";
import { useRecommandations } from "@/hooks/useData";
import { useSEO } from "@/lib/utils";
import { Sparkles, ChevronRight, Star } from "lucide-react";

function RecommendationSkeleton() {
  return <div className="surface rounded-[2rem] p-6 border border-[var(--border-color)] shadow-card animate-pulse">
      <div className="skeleton w-full h-56 rounded-[1.5rem] mb-5" />
      <div className="h-4 bg-surface rounded-full mb-3" />
      <div className="h-4 bg-surface rounded-full w-5/6" />
    </div>;
}

function RecommendationCard({ book, onClick }) {
  return <button
    type="button"
    onClick={onClick}
    className="group text-left surface rounded-[2rem] overflow-hidden border border-[var(--border-color)] shadow-card hover:shadow-glow transition-all duration-300"
  >
      <div className="relative h-72 overflow-hidden bg-muted/5">
        <ApiImage
    src={book.couverture || book.cover}
    alt={book.titre || book.title}
    fallback="/default_cover.png"
    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
  />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg text-primary line-clamp-2">{book.titre || book.title || "Titre inconnu"}</h3>
            <p className="text-sm text-muted mt-1">{book.auteur || book.author || "Auteur inconnu"}</p>
          </div>
          <Badge className="bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20">IA</Badge>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= Math.round(book.note || 0) ? "fill-accent text-accent" : "text-white/20"}`} />)}
        </div>
      </div>
    </button>;
}

export function RecommendationsPage({ user, onNavigate }) {
  const { recommandations, chargement } = useRecommandations();
  const recommendations = recommandations?.recommendations || [];

  useSEO("Recommandations", "Découvrez toutes vos recommandations personnalisées de livres.");

  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-accent font-semibold uppercase tracking-[0.3em] mb-2">IA</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary">Recommandations personnalisées</h1>
            <p className="text-muted mt-3 max-w-2xl">Retrouvez ici toutes les recommandations de livres sélectionnées pour vous par l'intelligence artificielle.</p>
          </div>
          <button
    type="button"
    onClick={() => onNavigate("catalog")}
    className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-90 transition-opacity"
  >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Voir le catalogue
          </button>
        </div>

        {chargement ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, index) => <RecommendationSkeleton key={index} />)}
            </div> : recommendations.length === 0 ? <div className="surface rounded-[2rem] border border-[var(--border-color)] shadow-card p-12 text-center">
              <Sparkles className="mx-auto mb-4 w-12 h-12 text-accent" />
              <h2 className="text-2xl font-bold text-primary mb-2">Aucune recommandation pour l'instant</h2>
              <p className="text-sm text-muted">Le système ne dispose pas encore de suggestions personnalisées. Revenez bientôt ou explorez le catalogue.</p>
            </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.map((book, index) => <RecommendationCard
    key={book.id ?? `${book.title || book.titre || "book"}-${index}`}
    book={book}
    onClick={() => onNavigate("book-detail", { bookId: book.id })}
  />)}
            </div>}
      </main>
    </div>;
}
