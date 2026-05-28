import { ChevronLeft, Calendar, Share2, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ApiImage } from "@/components/ApiImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNewsItem } from "@/hooks/useData";
import { toast } from "sonner";
import { useSEO } from "@/lib/utils";
import { useParams, useNavigate } from "react-router-dom";
export function NewsDetailPage({ user }) {
  const { newsId } = useParams();
  const navigate = useNavigate(); 
  const { news: newsItem, isLoading } = useNewsItem(newsId);
  useSEO(newsItem?.title || "Actualité", newsItem?.excerpt || "Détails de l'actualité à la bibliothèque CAEB Natitingou.");
  if (isLoading) return <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  const categoryLabels = {
    announcement: "Annonce",
    event: "Événement",
    course: "Formation",
    visit: "Visite",
    closure: "Fermeture",
    general: "Actualité"
  };
  const categoryColors = {
    announcement: "bg-[var(--library-accent)]/10 text-[var(--library-accent)] border-[var(--library-accent)]/20",
    event: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    course: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    visit: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    closure: "bg-red-500/10 text-red-500 border-red-500/20",
    general: "bg-[var(--library-surface-alt)] text-[var(--library-muted)] border-[var(--border-color)]"
  };
  const handleShare = () => {
    toast.success("Lien copié dans le presse-papiers !");
  };
  if (!newsItem) {
    return <div className="min-h-screen bg-library-bg adaptive-fg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--library-accent)] mb-6 hover:opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]/30 rounded px-2 py-1"
            title="Retour aux actualités"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-[var(--library-muted)]">Actualité non trouvée</p>
          </div>
        </main>
      </div>;
  }
  const newsDate = new Date(newsItem.date);
  return <div className="min-h-screen bg-library-bg adaptive-fg pb-24">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {
    /* Bouton retour Premium */
  }
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-accent mb-8 hover:scale-105 transition-all focus:outline-none group"
        >
          <div className="w-10 h-10 glass-effect rounded-xl flex items-center justify-center border border-white/10 shadow-glow">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">Retour aux actualités</span>
          <span className="font-bold text-lg sm:hidden">Retour</span>
        </button>

        {
    /* Carte de l'article Premium */
  }
        <article className="glass-effect rounded-[2.5rem] overflow-hidden border border-white/10 shadow-elevated animate-flow-in">

          {
    /* Image optionnelle */
  }
          {newsItem.image && <div className="w-full h-72 sm:h-96 overflow-hidden">
              <ApiImage
    src={newsItem.image}
    alt={newsItem.title}
    className="w-full h-full object-cover"
  />
            </div>}

          {
    /* Contenu de l'article */
  }
          <div className="p-6 md:p-10">

            {
    /* Header */
  }
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {newsItem.category && <Badge className={`text-xs font-black px-4 py-1.5 border uppercase tracking-widest ${categoryColors[newsItem.category] || categoryColors.general}`}>
                    {categoryLabels[newsItem.category] || "Actualité"}
                  </Badge>}
                {newsItem.featured && <Badge className="bg-accent text-white shadow-glow border-none text-xs font-black px-4 py-1.5 uppercase tracking-widest">
                    ✦ À la une
                  </Badge>}
              </div>

              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6 leading-tight">
                <span className="text-gradient">{newsItem.title}</span>
              </h1>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted font-bold uppercase tracking-widest">
                  <Calendar className="w-4 h-4 text-accent" />
                  {newsDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })}
                </div>
                <Button
    onClick={handleShare}
    variant="outline"
    className="glass-effect gap-3 border-white/10 text-primary hover:border-accent/40 font-bold h-11 px-6 rounded-2xl"
  >
                  <Share2 className="w-5 h-5 text-accent" />
                  <span>Partager</span>
                </Button>
              </div>
            </div>

            {
    /* Contenu principal */
  }
            <div className="mb-8 space-y-4">
              <p className="text-lg text-[var(--library-text)] leading-relaxed font-medium">
                {newsItem.excerpt}
              </p>

              {newsItem.content && <p className="text-[var(--library-muted)] leading-relaxed whitespace-pre-wrap">
                  {newsItem.content}
                </p>}
            </div>

            {
    /* CTA */
  }
            <div className="pt-8 border-t border-white/10">
              <p className="text-muted font-medium mb-6">
                Une question sur cette actualité ? L&apos;équipe de la CAEB est à votre écoute.
              </p>
              <Button
    className="gap-3 bg-accent text-white hover:opacity-90 shadow-glow font-black h-12 px-8 rounded-2xl animate-pulse-soft"
  >
                <span className="truncate">Contacter la bibliothèque</span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </div>
          </div>
        </article>
      </main>
    </div>;
}
