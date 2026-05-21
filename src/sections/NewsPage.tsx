// Page des actualités — CAEB Design System
import { useState } from 'react';
import { Newspaper, Filter, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { useNews } from '@/hooks/useData';
import { useSEO } from '@/lib/utils';

interface NewsPageProps {
  user: User;
  onNewsClick?: (newsId: string) => void;
}

export function NewsPage({ user, onNewsClick }: NewsPageProps) {
  const { news } = useNews();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useSEO("Actualités", "Retrouvez toutes les nouveautés, annonces et événements de la bibliothèque CAEB Natitingou.");

  const filteredNews = selectedCategory === 'all' ? news : news.filter(n => n.category === selectedCategory);
  const sortedNews = [...filteredNews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const categories = [ 
    { id: 'all', label: 'Tous', count: news.length },
    { id: 'announcement', label: 'Annonces', count: news.filter((n: any) => n.categorie === 'announcement').length },
    { id: 'event', label: 'Événements', count: news.filter((n: any) => n.categorie === 'event').length },
    { id: 'course', label: 'Formations', count: news.filter((n: any) => n.categorie === 'course').length },
    { id: 'visit', label: 'Visites', count: news.filter((n: any) => n.categorie === 'visit').length },
    { id: 'closure', label: 'Fermetures', count: news.filter((n: any) => n.categorie === 'closure').length },
  ];

  const categoryLabels: Record<string, string> = {
    announcement: 'Annonce', event: 'Événement', course: 'Formation',
    visit: 'Visite', closure: 'Fermeture', general: 'Actualité',
  };

  const categoryColors: Record<string, string> = {
    announcement: 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20',
    event: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    course: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    visit: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    closure: 'bg-red-500/10 text-red-500 border-red-500/20',
    general: 'surface-weak text-muted border-[var(--border-color)]',
  };

  return (
    <div className="min-h-screen bg-library-bg pb-24 transition-colors duration-300">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* En-tête Modernisé */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center shadow-glow">
              <Newspaper className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">
              <span className="text-gradient">Actualités</span>
            </h1>
          </div>
          <p className="text-muted max-w-2xl text-lg leading-relaxed">
            Restez informé de la vie vibrante de votre bibliothèque : acquisitions, ateliers, et bien plus.
          </p>
        </div>

        {/* Filtres */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-accent" />
            <h2 className="font-semibold text-primary text-sm">Filtrer par catégorie</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-accent/20 ${selectedCategory === cat.id
                    ? 'bg-accent text-white border-accent shadow-glow scale-105'
                    : 'glass-effect border-white/10 text-primary hover:border-accent/30 hover:text-accent'
                  }`}>
                {cat.label}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedCategory === cat.id
                    ? 'bg-white/20'
                    : 'bg-white/5 border border-white/10'
                  }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Articles */}
        {sortedNews.length > 0 ? (
          <div className="space-y-5">
            {sortedNews.map(newsItem => (
              <article key={newsItem.id} onClick={() => onNewsClick?.(newsItem.id)}
                className="glass-effect rounded-[2rem] overflow-hidden shadow-card hover:shadow-glow border border-white/10 hover:border-accent/30 transition-all duration-500 flex flex-col md:flex-row cursor-pointer group animate-flow-in">

                {newsItem.image && (
                  <div className="md:w-64 w-full aspect-video md:aspect-auto overflow-hidden surface-alt flex-shrink-0">
                    <ApiImage src={newsItem.image} alt={newsItem.titre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}

                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {newsItem.categorie && (
                        <Badge className={`text-xs font-semibold px-3 py-1 border ${categoryColors[newsItem.categorie] || categoryColors.general}`}>
                          {categoryLabels[newsItem.categorie] || 'Actualité'}
                        </Badge>
                      )}
                      {newsItem.misEnAvant && (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold px-3 py-1">
                          ✦ À la une
                        </Badge>
                      )}
                      <span className="text-xs font-medium text-muted ml-auto md:ml-0">
                        {new Date(newsItem.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="font-bold text-primary text-xl md:text-2xl mb-3 group-hover:text-accent transition-colors line-clamp-2">{newsItem.titre}</h3>
                    <p className="text-muted text-sm md:text-base leading-relaxed mb-4">{newsItem.resume}</p>
                  </div>

                  {newsItem.contenu && (
                    <details className="mb-4" onClick={(e) => e.stopPropagation()}>
                      <summary className="text-sm font-semibold text-accent cursor-pointer hover:opacity-75 transition-opacity">
                        Lire la suite
                      </summary>
                      <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                        <p className="text-sm text-muted leading-relaxed">{newsItem.contenu}</p>
                      </div>
                    </details>
                  )}

                  <div className="flex items-center text-sm font-semibold text-accent gap-0.5 hover:gap-1 transition-all">
                    En savoir plus <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface rounded-2xl p-12 text-center border border-[var(--border-color)]">
            <div className="w-16 h-16 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Newspaper className="w-8 h-8 text-accent opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Aucune actualité dans cette catégorie</h3>
            <p className="text-muted">Essayez une autre catégorie ou revenez bientôt.</p>
          </div>
        )}
      </main>
    </div>
  );
}
