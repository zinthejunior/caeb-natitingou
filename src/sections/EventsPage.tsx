// Page des événements — CAEB Design System
import { useState } from 'react';
import { Calendar, MapPin, Users, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import type { Event, User, ReadingClub } from '@/types';
import { useEvents, useClubs, registerEvent } from '@/hooks/useData';

interface EventsPageProps {
  user: User | null;
  onEventClick?: (eventId: string) => void;
}

// ── EMPTY STATE — Calendrier illustré ──────────────────────────────────
function EmptyCalendar() {
  return (
    <div className="empty-state py-20 surface rounded-2xl border border-[var(--border-color)]">
      <svg className="empty-state-illustration" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Calendrier */}
        <rect x="15" y="25" width="90" height="80" rx="10" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-[var(--library-accent)] opacity-20" />
        <rect x="15" y="25" width="90" height="25" rx="10" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        <rect x="15" y="38" width="90" height="12" fill="currentColor" className="text-[var(--library-accent)] opacity-10" />
        {/* Crochets */}
        <rect x="38" y="16" width="7" height="18" rx="3.5" fill="currentColor" className="text-[var(--library-accent)] opacity-30" />
        <rect x="75" y="16" width="7" height="18" rx="3.5" fill="currentColor" className="text-[var(--library-accent)] opacity-30" />
        {/* Jours */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <rect key={i} x={22 + (i % 3) * 28} y={62 + Math.floor(i / 3) * 18} width="20" height="12" rx="4"
            stroke="currentColor" strokeWidth="1" fill="none" className="text-[var(--library-accent)] opacity-12" />
        ))}
        {/* Étoile "bientôt" */}
        <path d="M60 18 L62 22 L66 22 L63 25 L64 29 L60 27 L56 29 L57 25 L54 22 L58 22 Z"
          fill="currentColor" className="text-[var(--library-accent)] opacity-30" />
      </svg>
      <h3 className="text-lg font-semibold text-primary">Aucun événement prévu</h3>
      <p className="text-sm text-muted max-w-xs text-center mt-2">
        Nos équipes vous concoctent un programme riche en découvertes. Restez à l'affût de nos prochaines conférences et ateliers !
      </p>
    </div>
  );
}

export function EventsPage({ user, onEventClick }: EventsPageProps) {
  const { events } = useEvents();
  const { clubs } = useClubs();
  const [filter, setFilter] = useState<'all' | 'club' | 'conference' | 'workshop'>('all');
  const [participatingEvents, setParticipatingEvents] = useState<string[]>(
    events.filter(e => e.isParticipating).map(e => e.id)
  );

  const filteredEvents = events.filter(e => filter === 'all' || e.type === filter);

  const handleParticipate = async (eventId: string) => {
    try {
      await registerEvent(eventId);
      if (participatingEvents.includes(eventId)) {
        setParticipatingEvents(prev => prev.filter(id => id !== eventId));
        toast.success('Inscription annulée');
      } else {
        setParticipatingEvents(prev => [...prev, eventId]);
        toast.success("Inscription confirmée !", { description: "Vous recevrez un rappel avant l'événement." });
      }
    } catch (err) {
      toast.error('Erreur lors de l\'inscription à l\'événement');
    }
  };

  const typeConfig: Record<string, { label: string; class: string }> = {
    club: { label: 'Club de lecture', class: 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20' },
    conference: { label: 'Conférence', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    workshop: { label: 'Atelier', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  };

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const monthKey = new Date(event.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);

  const filterOptions = [
    { id: 'all', label: 'Tous' },
    { id: 'club', label: 'Clubs' },
    { id: 'conference', label: 'Conférences' },
    { id: 'workshop', label: 'Ateliers' },
  ] as const;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 scrollbar-hide">
          {filterOptions.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 border flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] focus:ring-offset-0 tap-feedback ${filter === f.id
                  ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft'
                  : 'surface border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 hover:text-accent'
                }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Événements */}
        {filteredEvents.length === 0 ? (
          <EmptyCalendar />
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedEvents).map(([month]) => (
              <section key={month}>
                <h2 className="font-display text-xl font-semibold text-primary mb-6 capitalize flex items-center gap-2">
                  <span className="w-2 h-6 bg-[var(--library-accent)] rounded-full" />
                  {month}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupedEvents[month].map((event) => (
                    <EventCard key={event.id} event={event} clubs={clubs}
                      isParticipating={participatingEvents.includes(event.id)}
                      onParticipate={() => handleParticipate(event.id)}
                      onClick={() => onEventClick?.(event.id)}
                      typeConfig={typeConfig} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  clubs: ReadingClub[];
  isParticipating: boolean;
  onParticipate: () => void;
  onClick?: () => void;
  typeConfig: Record<string, { label: string; class: string }>;
}

function EventCard({ event, clubs, isParticipating, onParticipate, onClick, typeConfig }: EventCardProps) {
  const eventDate = new Date(event.date);
  const club = event.clubId ? (clubs.find(c => c.id === event.clubId) as ReadingClub | undefined) : null;
  const type = typeConfig[event.type] || { label: 'Événement', class: 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20' };

  return (
    <div onClick={onClick}
      className="surface rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover border border-[var(--border-color)] hover:border-[var(--library-accent)]/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer group tap-feedback">

      {/* Visuel */}
      <div className="relative h-32 surface-alt overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--library-accent)]/15 to-[var(--library-accent)]/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Calendar className="w-14 h-14 text-[var(--library-accent)]/20 group-hover:text-[var(--library-accent)]/30 transition-colors" />
        </div>
        {/* Date badge */}
        <div className="absolute top-3 left-3 surface rounded-xl p-2 text-center min-w-[48px] shadow-soft border border-[var(--border-color)]">
          <p className="text-[10px] text-muted font-bold uppercase leading-none">
            {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </p>
          <p className="text-xl font-bold text-accent leading-tight">{eventDate.getDate()}</p>
        </div>
      </div>

      <div className="p-4">
        <Badge className={`text-xs font-semibold mb-2 border ${type.class}`}>{type.label}</Badge>
        <h3 className="font-semibold text-primary line-clamp-2 mb-3 group-hover:text-accent transition-colors">{event.title}</h3>

        <div className="space-y-1.5 text-sm text-muted mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>{eventDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} à {event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span>{event.location}</span>
          </div>
          {club && <p className="text-xs text-accent font-semibold pl-5">Organisé par {club.name}</p>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold text-primary">{event.participantCount + (isParticipating ? 1 : 0)}</span>
            <span>participant{event.participantCount > 1 ? 's' : ''}</span>
          </div>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onParticipate(); }}
            className={`tap-feedback ${isParticipating
              ? 'border-[var(--library-accent)]/30 text-accent hover:bg-[var(--library-accent)]/10 font-semibold border'
              : 'btn-solid font-semibold shadow-soft hover:shadow-medium transition-all'
              }`}
            variant={isParticipating ? 'outline' : 'default'}>
            {isParticipating ? <><Check className="w-3.5 h-3.5 mr-1" />Inscrit</> : 'Je participe'}
          </Button>
        </div>
      </div>
    </div>
  );
}
