// Page de détails d'une actualité
import { ChevronLeft, Calendar, Share2, ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { useNewsItem } from '@/hooks/useData';
import { toast } from 'sonner';

interface NewsDetailPageProps {
  newsId: string;
  user: User | null;
  onBack: () => void;
}

export function NewsDetailPage({ newsId, user, onBack }: NewsDetailPageProps) {
  const { news: newsItem, isLoading } = useNewsItem(newsId);

  if (isLoading) return (
    <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const categoryLabels: Record<string, string> = {
    announcement: 'Annonce',
    event: 'Événement',
    course: 'Formation',
    visit: 'Visite',
    closure: 'Fermeture',
    general: 'Actualité',
  };

  // Category badge styles using design tokens
  const categoryColors: Record<string, string> = {
    announcement: 'bg-[var(--library-accent)]/10 text-[var(--library-accent)] border-[var(--library-accent)]/20',
    event: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    course: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    visit: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    closure: 'bg-red-500/10 text-red-500 border-red-500/20',
    general: 'bg-[var(--library-surface-alt)] text-[var(--library-muted)] border-[var(--border-color)]',
  };

  const handleShare = () => {
    toast.success('Lien copié dans le presse-papiers !');
  };

  if (!newsItem) {
    return (
      <div className="min-h-screen bg-library-bg adaptive-fg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <button
            onClick={onBack}
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
      </div>
    );
  }

  const newsDate = new Date(newsItem.date);

  return (
    <div className="min-h-screen bg-library-bg adaptive-fg pb-24">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        {/* Bouton retour */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[var(--library-accent)] mb-6 hover:opacity-80 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]/30 rounded px-2 py-1"
          title="Retour aux actualités"
          aria-label="Retour aux actualités"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Retour aux actualités</span>
          <span className="sm:hidden">Retour</span>
        </button>

        {/* Carte de l'article */}
        <article className="surface rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-elevated">

          {/* Image optionnelle */}
          {newsItem.image && (
            <div className="w-full h-72 sm:h-96 overflow-hidden">
              <ApiImage
                src={newsItem.image}
                alt={newsItem.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Contenu de l'article */}
          <div className="p-6 md:p-10">

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                {newsItem.category && (
                  <Badge className={`text-xs font-semibold px-3 py-1 border ${categoryColors[newsItem.category] || categoryColors.general}`}>
                    {categoryLabels[newsItem.category] || 'Actualité'}
                  </Badge>
                )}
                {newsItem.featured && (
                  <Badge className="bg-[var(--library-accent)]/15 text-[var(--library-accent)] border border-[var(--library-accent)]/25 text-xs font-semibold px-3 py-1">
                    ★ À la une
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-display font-bold text-[var(--library-text)] mb-4 leading-tight">
                {newsItem.title}
              </h1>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-[var(--library-muted)]">
                  <Calendar className="w-4 h-4" />
                  {newsDate.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="gap-2 border-[var(--border-color)] text-[var(--library-text)] hover:border-[var(--library-accent)]/40"
                  title="Partager cette actualité"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Partager</span>
                </Button>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="mb-8 space-y-4">
              <p className="text-lg text-[var(--library-text)] leading-relaxed font-medium">
                {newsItem.excerpt}
              </p>

              {newsItem.content && (
                <p className="text-[var(--library-muted)] leading-relaxed whitespace-pre-wrap">
                  {newsItem.content}
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="pt-6 border-t border-[var(--border-color)]">
              <p className="text-sm text-[var(--library-muted)] mb-4">
                Une question sur cette actualité ? L'équipe de la CAEB vous répond.
              </p>
              <Button
                className="gap-2 bg-[var(--library-accent)] text-[var(--library-on-accent)] hover:opacity-90 sheen"
                title="Nous contacter pour plus d'informations"
              >
                <span className="truncate">Contacter la bibliothèque</span>
                <ArrowRight className="w-4 h-4 flex-shrink-0" />
              </Button>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
