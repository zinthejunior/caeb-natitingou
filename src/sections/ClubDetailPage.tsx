import { useState, useEffect } from 'react';
import { ArrowLeft, Users, MapPin, ExternalLink, Check, Plus, User, Users2, BookOpen, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { ClubContactForm } from '@/components/ClubContactForm';
import type { Event, User as UserType } from '@/types';
import { useClub, useEvents, rejoindreClub } from '@/hooks/useData';

interface ClubDetailPageProps {
  clubId: string;
  onBack: () => void;
  user: UserType | null;
}

export function ClubDetailPage({ clubId, onBack, user }: ClubDetailPageProps) {
  const { club, chargement: isClubLoading } = useClub(clubId);
  const { evenements: events, chargement: isEventsLoading } = useEvents();
  const [isJoined, setIsJoined] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  useEffect(() => {
    if (club) setIsJoined(club.estMembre || false);
  }, [club]);

  if (isClubLoading || isEventsLoading) return (
    <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!club) return null;

  const clubEvents = events.filter(e => e.clubId === clubId);

  const handleJoinClub = () => setShowContactForm(true);

  const handleContactFormSubmit = async () => {
    try {
      await rejoindreClub(clubId);
      setIsJoined(true);
      toast.success('Vous avez rejoint le club !', {
        description: 'La bibliothèque a été notifiée de votre inscription.',
      });
    } catch (err) {
      toast.error('Erreur lors de l\'adhésion au club');
    }
  };

  const handleLeaveClub = () => {
    setIsJoined(false);
    toast.success('Vous avez quitté le club');
  };

  const handleParticipate = () => {
    toast.success('Inscription confirmée !', {
      description: "Vous recevrez un rappel avant l'événement.",
    });
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case 'children': return <User className="w-4 h-4" />;
      case 'teen': return <User className="w-4 h-4" />;
      case 'adult': return <Users2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'children': return 'Enfants';
      case 'teen': return 'Ados';
      case 'adult': return 'Adultes';
      default: return 'Tout public';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-library-bg adaptive-fg pb-24">
      <Navbar user={user} />

      {/* Hero image */}
      <div className="relative h-72">
        <img src={club.image} alt={club.nom} className="w-full h-full object-cover" />
        <div className="absolute inset-0 image-overlay" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-6 left-6 w-11 h-11 bg-[var(--library-surface)]/80 backdrop-blur-lg rounded-full flex items-center justify-center text-[var(--library-accent)] hover:shadow-lg hover:bg-[var(--library-surface)] transition-all z-10 border border-[var(--border-color)] group"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Club info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <Badge className="mb-3 font-bold text-sm overlay-label">
              {getAudienceIcon(club.publicCible)}
              <span className="ml-1">{getAudienceLabel(club.publicCible)}</span>
            </Badge>
            <h1 className="font-display text-4xl font-bold mb-2 overlay-text">
              {club.nom}
            </h1>
            <div className="flex items-center gap-6 overlay-text">
              <span className="flex items-center gap-2 font-medium">
                <Users className="w-5 h-5" />
                {club.nbMembres} membres
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          {isJoined ? (
            <Button
              variant="outline"
              onClick={handleLeaveClub}
              className="border-[var(--border-color)] text-[var(--library-muted)] hover:border-[var(--library-accent)] hover:text-[var(--library-accent)] font-medium"
            >
              <Check className="w-4 h-4 mr-2" />
              Je suis membre
            </Button>
          ) : (
            <Button
              onClick={handleJoinClub}
              className="bg-[var(--library-accent)] text-[var(--library-on-accent)] hover:opacity-90 sheen font-medium gap-2"
            >
              <Plus className="w-4 h-4" />
              Rejoindre ce club
            </Button>
          )}
          {club.lienExterne && (
            <Button
              variant="outline"
              onClick={() => window.open(club.lienExterne, '_blank')}
              className="border-[var(--border-color)] text-[var(--library-text)] hover:border-[var(--library-accent)]/40 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Visiter
            </Button>
          )}
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
              <h2 className="font-display text-xl font-semibold text-[var(--library-text)] mb-3">
                Le club en quelques mots
              </h2>
              <p className="text-[var(--library-muted)] leading-relaxed">
                {club.description}
              </p>
            </div>

            {/* External link */}
            {club.lienExterne && (
              <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
                <h3 className="font-display text-lg font-semibold text-[var(--library-text)] mb-2 flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-[var(--library-accent)]" />
                  Site web
                </h3>
                <p className="text-sm text-[var(--library-muted)]">
                  Le club dispose d'un espace en ligne pour suivre ses activités et discussions :
                </p>
                <a
                  href={club.lienExterne}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-[var(--library-accent)] font-medium hover:underline"
                >
                  Voir le site
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Courses */}
            {club.cours && club.cours.length > 0 && (
              <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
                <h2 className="font-display text-xl font-semibold text-[var(--library-text)] mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[var(--library-accent)]" />
                  Cours proposés
                </h2>
                <div className="space-y-3">
                  {club.cours.map((course) => (
                    <div key={course.id} className="p-3 rounded-xl bg-[var(--library-surface-alt)] border border-[var(--border-color)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[var(--library-text)]">{course.title}</p>
                          <p className="text-sm text-[var(--library-muted)]">{course.level} • {course.frequency}</p>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--library-muted)] mt-2">{course.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {club.activiteRecente && club.activiteRecente.length > 0 && (
              <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
                <h2 className="font-display text-xl font-semibold text-[var(--library-text)] mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[var(--library-accent)]" />
                  Activité des membres
                </h2>
                <div className="space-y-2">
                  {club.activiteRecente.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 p-3 bg-[var(--library-surface-alt)] rounded-xl border border-[var(--border-color)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--library-accent)]/10 flex items-center justify-center text-[var(--library-accent)] font-semibold">
                        {act.userName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-[var(--library-text)]">
                          <span className="font-medium">{act.userName}</span>{' '}
                          <span className="text-[var(--library-muted)]">{act.activity}</span>
                        </p>
                        <p className="text-xs text-[var(--library-muted)] mt-1">
                          {new Date(act.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Club events */}
            {clubEvents.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold text-[var(--library-text)] mb-4">
                  Prochains événements du club
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {clubEvents.map((event) => (
                    <EventCard key={event.id} event={event} onParticipate={handleParticipate} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Manager */}
            {club.responsable && (
              <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
                <h3 className="font-display font-semibold text-lg text-[var(--library-text)] mb-3">Responsable</h3>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--library-text)]">{club.responsable.nom}</p>
                    <p className="text-sm text-[var(--library-muted)]">{club.responsable.role}</p>
                    <a
                      href={`mailto:${club.responsable.email}`}
                      className="text-sm text-[var(--library-accent)] font-medium mt-1 inline-block hover:underline"
                    >
                      {club.responsable.email}
                    </a>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`mailto:${club.responsable?.email}`)}
                      className="border-[var(--border-color)] text-[var(--library-text)] hover:border-[var(--library-accent)]/40"
                    >
                      Contacter
                    </Button>
                    {club.lienExterne && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(club.lienExterne, '_blank')}
                        className="border-[var(--border-color)] text-[var(--library-text)] hover:border-[var(--library-accent)]/40"
                      >
                        Visiter
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Next meetings */}
            {club.prochainesReunions && club.prochainesReunions.length > 0 && (
              <div className="surface rounded-2xl p-6 border border-[var(--border-color)] shadow-soft">
                <h3 className="font-display font-semibold text-lg text-[var(--library-text)] mb-4">
                  Prochaines rencontres
                </h3>
                <div className="space-y-3">
                  {club.prochainesReunions.map((meeting) => {
                    const meetingDate = new Date(meeting.date);
                    return (
                      <div
                        key={meeting.id}
                        className="p-3 bg-[var(--library-surface-alt)] rounded-xl border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 transition-all"
                      >
                        <p className="text-sm font-semibold text-[var(--library-text)]">{meeting.heure}</p>
                        <p className="text-xs text-[var(--library-muted)] mt-1">
                          {meetingDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-[var(--library-muted)] flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {meeting.lieu}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stats card */}
            <div className="rounded-2xl p-6 bg-[var(--library-accent)]/5 border border-[var(--library-accent)]/15">
              <h3 className="font-semibold text-[var(--library-text)] mb-4">À propos</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-[var(--library-muted)] uppercase tracking-wide">Membres actifs</span>
                  <p className="text-2xl font-bold text-[var(--library-accent)]">{club.nbMembres}</p>
                </div>
                <div className="border-t border-[var(--border-color)] pt-3">
                  <span className="text-xs text-[var(--library-muted)] uppercase tracking-wide">Public</span>
                  <p className="text-lg font-semibold text-[var(--library-text)] mt-1">{getAudienceLabel(club.publicCible)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showContactForm && (
          <ClubContactForm
            club={{ id: club.id, name: club.nom, manager: club.responsable }}
            userName={`${user.prenom} ${user.nom}`}
            userEmail={user.email}
            onClose={() => setShowContactForm(false)}
            onSubmit={handleContactFormSubmit}
          />
        )}
      </main>
    </div>
  );
}

function EventCard({ event, onParticipate }: { event: Event; onParticipate: () => void }) {
  const eventDate = new Date(event.date);

  return (
    <div className="surface rounded-xl p-4 border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 hover:shadow-soft transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-[var(--library-accent)]/10 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs text-[var(--library-accent)] font-semibold uppercase">
            {eventDate.toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
          <span className="text-lg font-bold text-[var(--library-accent)]">
            {eventDate.getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--library-text)] line-clamp-1">{event.title}</h3>
          <p className="text-xs text-[var(--library-muted)]">{event.time} • {event.location}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-[var(--library-muted)]">
            <Users className="w-3 h-3" />
            {event.nbParticipants} participants
          </div>
        </div>
      </div>
      <Button
        size="sm"
        variant={event.participe ? 'outline' : 'default'}
        onClick={onParticipate}
        className={`w-full ${event.participe
          ? 'border-[var(--border-color)] text-[var(--library-muted)]'
          : 'bg-[var(--library-accent)] text-[var(--library-on-accent)] hover:opacity-90 sheen'
          }`}
      >
        {event.participe ? (
          <><Check className="w-4 h-4 mr-1" />Inscrit</>
        ) : (
          'Je participe'
        )}
      </Button>
    </div>
  );
}
