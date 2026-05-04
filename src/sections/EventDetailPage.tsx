// EventDetailPage.tsx — CAEB Design System
import { ChevronLeft, Calendar, MapPin, Users, Clock, Share2, Bell, Check } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { useEvent, useClubs, registerEvent } from '@/hooks/useData';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface EventDetailPageProps {
  eventId: string;
  user: User | null; 
  onBack: () => void;
}

export function EventDetailPage({ eventId, user, onBack }: EventDetailPageProps) {
  const { event, isLoading: isEventLoading } = useEvent(eventId);
  const { clubs, chargement: isClubsLoading } = useClubs();
  const [isParticipating, setIsParticipating] = useState(false);

  useEffect(() => {
    if (event) setIsParticipating(event.isParticipating || false);
  }, [event]);

  if (isEventLoading || isClubsLoading) return (
    <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!event) {
    return (
      <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <button onClick={onBack} className="flex items-center gap-2 text-accent mb-6 hover:opacity-75 font-semibold transition-opacity">
            <ChevronLeft className="w-5 h-5" />Retour
          </button>
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Événement non trouvé</p>
          </div>
        </main>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const club = event.clubId ? clubs.find(c => c.id === event.clubId) : null;

  const handleParticipate = async () => {
    try {
      await registerEvent(eventId);
      setIsParticipating(!isParticipating);
      if (!isParticipating) {
        toast.success('Inscription confirmée !', { description: "Vous recevrez un rappel avant l'événement." });
      } else {
        toast.info('Inscription annulée');
      }
    } catch (err) {
      toast.error('Erreur lors de l\'inscription');
    }
  };

  const typeConfig: Record<string, { label: string; class: string }> = {
    club: { label: 'Club de lecture', class: 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20' },
    conference: { label: 'Conférence', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    workshop: { label: 'Atelier', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  };
  const type = typeConfig[event.type] || typeConfig.club;

  const infoItems = [
    { icon: Calendar, label: 'Date', value: eventDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
    { icon: Clock, label: 'Heure', value: event.time },
    { icon: MapPin, label: 'Lieu', value: event.location },
    { icon: Users, label: 'Participants', value: `${event.participantCount} inscrits` },
  ];

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <button onClick={onBack} className="flex items-center gap-2 text-accent mb-6 hover:opacity-75 font-semibold transition-opacity focus:outline-none">
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Retour aux événements</span>
          <span className="sm:hidden">Retour</span>
        </button>

        <div className="surface rounded-2xl overflow-hidden shadow-card border border-[var(--border-color)]">
          {/* Visuel */}
          <div className="w-full h-56 md:h-80 gradient-hero flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[var(--library-accent)]/5" />
            <div className="text-center relative">
              <div className="w-20 h-20 bg-[var(--library-accent)]/15 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-10 h-10 text-accent" />
              </div>
              <p className="text-muted font-semibold">{type.label}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <Badge className={`text-xs font-semibold border mb-3 ${type.class}`}>{type.label}</Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">{event.title}</h1>
                {club && <p className="text-sm text-muted">Organisé par <span className="font-semibold text-accent">{club.name}</span></p>}
              </div>
              <Button onClick={() => toast.success("Lien d'événement copié !")} variant="outline"
                className="gap-2 flex-shrink-0 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold">
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Partager</span>
              </Button>
            </div>

            {/* Détails */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 p-4 surface-alt rounded-xl border border-[var(--border-color)]">
              {infoItems.map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted font-semibold uppercase tracking-wide">{item.label}</p>
                    <p className="text-primary font-semibold">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-primary mb-3">À propos de cet événement</h2>
              <p className="text-muted leading-relaxed">{event.description}</p>
            </div>

            {/* CTA */}
            <Button onClick={handleParticipate}
              className={`w-full md:w-auto gap-2 font-bold ${isParticipating
                  ? 'border border-[var(--library-accent)]/30 text-accent bg-[var(--library-accent)]/10 hover:bg-[var(--library-accent)]/15'
                  : 'btn-solid shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden'
                }`}
              variant={isParticipating ? 'outline' : 'default'}>
              {isParticipating ? <><Check className="w-4 h-4" />Vous êtes inscrit(e)</> : <><Bell className="w-4 h-4" />Je participe à cet événement</>}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
