// Page de recherche globale — CAEB Design System
import { Search, BookOpen, Users, Calendar, Newspaper, X } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import { Badge } from '@/components/ui/badge';
import type { User, View } from '@/types';
import { useState, useMemo } from 'react';
import { useBooks, useClubs, useEvents, useNews } from '@/hooks/useData';

interface SearchPageProps {
  user: User | null;
  onNavigate: (view: View, params?: Record<string, string | number | boolean>) => void;
}

const SectionTitle = ({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="p-1.5 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-lg">
      <Icon className="w-4 h-4 text-accent" />
    </div>
    <h2 className="text-xl font-bold text-primary">{label}</h2>
    <span className="text-sm text-muted font-medium">({count})</span>
  </div>
); 

export function SearchPage({ user, onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const { books } = useBooks();
  const { clubs } = useClubs();
  const { events } = useEvents();
  const { news } = useNews();

  const results = useMemo(() => {
    if (!query.trim()) return { books: [], clubs: [], events: [], news: [] };
    const q = query.toLowerCase();
    return {
      books: books.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.genre.toLowerCase().includes(q)).slice(0, 5),
      clubs: clubs.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)).slice(0, 5),
      events: events.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)).slice(0, 5),
      news: news.filter(n => n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [query, books, clubs, events, news]);

  const hasResults = Object.values(results).some(arr => arr.length > 0);

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Barre de recherche */}
        <div className="mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher des livres, clubs, événements, actualités..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 surface border border-[var(--border-color)] rounded-2xl text-primary placeholder:text-muted focus:outline-none focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 shadow-card transition-all text-base"
            />
            {query && (
              <button onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-accent rounded-lg transition-colors focus:outline-none"
                aria-label="Effacer">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Résultats */}
        {query.trim() ? (
          <div className="space-y-10">
            {results.books.length > 0 && (
              <section>
                <SectionTitle icon={BookOpen} label="Livres" count={results.books.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {results.books.map(book => (
                    <button key={book.id} onClick={() => onNavigate('book-detail', { bookId: book.id })}
                      className="group text-left">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden surface-weak shadow-card hover:shadow-card-hover transition-all mb-2">
                        <ApiImage src={book.cover} alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <h3 className="font-semibold text-sm text-primary line-clamp-2 group-hover:text-accent transition-colors">{book.title}</h3>
                      <p className="text-xs text-muted">{book.author}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.clubs.length > 0 && (
              <section>
                <SectionTitle icon={Users} label="Clubs" count={results.clubs.length} />
                <div className="space-y-3">
                  {results.clubs.map(club => (
                    <button key={club.id} onClick={() => onNavigate('club-detail', { clubId: club.id })}
                      className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/25 transition-all text-left group">
                      <h3 className="font-semibold text-primary group-hover:text-accent transition-colors mb-1">{club.name}</h3>
                      <p className="text-sm text-muted line-clamp-2">{club.description}</p>
                      <p className="text-xs text-accent font-semibold mt-2">{club.memberCount} membres</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.events.length > 0 && (
              <section>
                <SectionTitle icon={Calendar} label="Événements" count={results.events.length} />
                <div className="space-y-3">
                  {results.events.map(event => (
                    <button key={event.id} onClick={() => onNavigate('event-detail', { eventId: event.id })}
                      className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/25 transition-all text-left group">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-primary group-hover:text-accent transition-colors flex-1">{event.title}</h3>
                        <Badge className="flex-shrink-0 text-xs bg-[var(--library-accent)]/10 text-accent border border-[var(--library-accent)]/20">
                          {event.type === 'conference' ? 'Conférence' : event.type === 'workshop' ? 'Atelier' : 'Événement'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">{new Date(event.date).toLocaleDateString('fr-FR')} à {event.time}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {results.news.length > 0 && (
              <section>
                <SectionTitle icon={Newspaper} label="Actualités" count={results.news.length} />
                <div className="space-y-3">
                  {results.news.map(newsItem => (
                    <button key={newsItem.id} onClick={() => onNavigate('news-detail', { newsId: newsItem.id })}
                      className="w-full surface rounded-xl p-4 shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/25 transition-all text-left group">
                      <h3 className="font-semibold text-primary group-hover:text-accent transition-colors mb-1">{newsItem.title}</h3>
                      <p className="text-sm text-muted line-clamp-2">{newsItem.excerpt}</p>
                      <p className="text-xs text-accent font-semibold mt-2">{new Date(newsItem.date).toLocaleDateString('fr-FR')}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!hasResults && (
              <div className="text-center py-16">
                <div className="w-16 h-16 surface-alt border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted opacity-50" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">Aucun résultat pour « {query} »</h3>
                <p className="text-muted">Vérifiez l'orthographe ou essayez un mot-clé différent</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <Search className="w-10 h-10 text-accent opacity-60" />
            </div>
            <h2 className="text-xl font-semibold text-primary mb-2">Que cherchez-vous ?</h2>
            <p className="text-muted max-w-xs mx-auto">Tapez un titre, un auteur, le nom d'un club ou d'un événement pour commencer</p>
          </div>
        )}
      </main>
    </div>
  );
}
