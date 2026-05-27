// Page des clubs — CAEB Design System
import { useState, useEffect } from 'react';
import { Users, Search, User, Users2, Sparkles, X, ExternalLink } from 'lucide-react';
import { ClubContactForm } from '@/components/ClubContactForm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import type { ReadingClub, User as UserType } from '@/types';
import { useClubs, rejoindreClub, quitterClub } from '@/hooks/useData';
import { useSEO } from '@/lib/utils';

interface ClubsPageProps {
  onClubClick: (clubId: string) => void;
  user: UserType | null;
}

export function ClubsPage({ onClubClick, user }: ClubsPageProps) {
  const { clubs } = useClubs();
  const [searchQuery, setSearchQuery] = useState('');
  const [joinedClubs, setJoinedClubs] = useState<string[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  
  useSEO("Clubs Culturels", "Rejoignez nos clubs de lecture, de danse, d'anglais et d'IA. Un espace d'échange et d'apprentissage à Natitingou.");

  useEffect(() => {
    if (clubs.length > 0) {
      setJoinedClubs(clubs.filter(c => c.isJoined || c.estMembre).map(c => c.id));
    } 
  }, [clubs]);
  const selectedClub = selectedClubId ? clubs.find(c => c.id === selectedClubId) : null;

  const filteredClubs = clubs.filter(c =>
    c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const myClubs = filteredClubs.filter(c => joinedClubs.includes(c.id));
  const discoverClubs = filteredClubs.filter(c => !joinedClubs.includes(c.id));

  const handleJoinClub = (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClubId(clubId);
    setShowContactForm(true);
  };
  const handleConfirmJoin = async (clubId: string) => {
    try {
      await rejoindreClub(clubId);
      setJoinedClubs(prev => [...prev, clubId]);
      toast.success('Vous avez rejoint le club !', { description: 'La bibliothèque a été notifiée de votre inscription.' });
      setShowContactForm(false);
      setSelectedClubId(null);
    } catch (err) {
      toast.error('Erreur lors de l\'adhésion au club');
    }
  };
  const handleLeaveClub = async (clubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await quitterClub(clubId);
      setJoinedClubs(prev => prev.filter(id => id !== clubId));
      toast.success('Vous avez quitté le club');
    } catch (error) {
      toast.error('Erreur lors du départ du club');
    }
  };

  const audienceConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    children: { label: 'Enfants', icon: <User className="w-3.5 h-3.5" /> },
    teen: { label: 'Ados', icon: <User className="w-3.5 h-3.5" /> },
    adult: { label: 'Adultes', icon: <Users2 className="w-3.5 h-3.5" /> },
    all: { label: 'Tout public', icon: <Users className="w-3.5 h-3.5" /> },
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        {/* Recherche */}
        <div className="mb-8 max-w-2xl">
          <div className="relative mb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent pointer-events-none" />
            <Input placeholder="Rechercher un club par nom ou thème..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 h-12 surface border-[var(--border-color)] focus:ring-2 focus:ring-[var(--library-accent)]/20 focus:border-[var(--library-accent)] rounded-xl text-primary placeholder:text-muted" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted pl-1">
            <span className="font-semibold text-primary">{filteredClubs.length}</span> club{filteredClubs.length !== 1 ? 's' : ''} trouvé{filteredClubs.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Grille */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClubs.length === 0 ? (
            <div className="col-span-full text-center py-16 surface rounded-2xl border border-[var(--border-color)]">
              <div className="w-16 h-16 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-accent opacity-50" />
              </div>
              <h3 className="font-semibold text-primary mb-2">Aucun club trouvé</h3>
              <p className="text-sm text-muted">Essayez un autre mot-clé ou consultez tous les clubs</p>
            </div>
          ) : (
            <>
              {myClubs.length > 0 && (
                <>
                  <div className="col-span-full mb-6">
                    <h2 className="font-display text-2xl font-bold text-primary flex items-center gap-3">
                      <div className="p-2 bg-accent/10 border border-accent/20 rounded-xl shadow-glow">
                        <Sparkles className="w-6 h-6 text-accent" />
                      </div>
                      <span className="text-gradient">Mes clubs</span>
                    </h2>
                  </div>
                  {myClubs.map((club) => (
                    <ClubCard key={club.id} club={club} isJoined audienceConfig={audienceConfig}
                      onClick={() => onClubClick(club.id)}
                      onJoin={(e) => handleJoinClub(club.id, e)}
                      onLeave={(e) => handleLeaveClub(club.id, e)} />
                  ))}
                </>
              )}
              {discoverClubs.length > 0 && (
                <>
                  <div className={`col-span-full mb-6 ${myClubs.length > 0 ? 'mt-12' : ''}`}>
                    <h2 className="font-display text-2xl font-bold text-primary flex items-center gap-3">
                      <div className="p-2 bg-accent/10 border border-accent/20 rounded-xl">
                        <Users className="w-6 h-6 text-accent" />
                      </div>
                      Clubs à découvrir
                    </h2>
                  </div>
                  {discoverClubs.map((club) => (
                    <ClubCard key={club.id} club={club} isJoined={false} audienceConfig={audienceConfig}
                      onClick={() => onClubClick(club.id)}
                      onJoin={(e) => handleJoinClub(club.id, e)}
                      onLeave={(e) => handleLeaveClub(club.id, e)} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {showContactForm && selectedClub && (
        <ClubContactForm
          club={{ id: selectedClub.id, name: selectedClub.nom, manager: selectedClub.manager }}
          userName={`${user.prenom} ${user.nom}`}
          userEmail={user.email}
          onClose={() => { setShowContactForm(false); setSelectedClubId(null); }}
          onSubmit={() => handleConfirmJoin(selectedClub.id)}
        />
      )}
    </div>
  );
}

interface ClubCardProps {
  club: ReadingClub;
  isJoined: boolean;
  audienceConfig: Record<string, { label: string; icon: React.ReactNode }>;
  onClick: () => void;
  onJoin: (e: React.MouseEvent) => void;
  onLeave: (e: React.MouseEvent) => void;
}

function ClubCard({ club, isJoined, audienceConfig, onClick, onJoin, onLeave }: ClubCardProps) {
  const audience = audienceConfig[club.publicCible || 'all'] || audienceConfig.all;
  return (
    <div onClick={onClick}
      className="glass-effect rounded-[2rem] overflow-hidden shadow-card hover:shadow-glow border border-white/10 hover:border-accent/30 hover:-translate-y-2 transition-all duration-500 cursor-pointer group animate-flow-in">

      {/* Image */}
      <div className="relative h-40 overflow-hidden surface-weak">
        <ApiImage src={club.image} alt={club.nom}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        <div className="image-overlay absolute inset-0" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Badge className="overlay-label inline-flex items-center gap-1 mb-2 text-xs font-semibold">
            {audience.icon}
            <span>{audience.label}</span>
          </Badge>
          <h3 className="font-display font-bold overlay-text text-lg">{club.nom}</h3>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        <p className="text-sm text-muted line-clamp-2 mb-4 leading-relaxed">{club.description}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <Users className="w-4 h-4 text-accent" />
            <span className="font-semibold text-primary">{club.nbMembres}</span>
            <span>membres</span>
          </div>
          <div className="flex items-center gap-2">
            {(club.lienExterne || club.externalLink) && (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); window.open(club.lienExterne || club.externalLink, '_blank'); }}
                className="border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold px-3">
                <ExternalLink className="w-3.5 h-3.5 mr-1" />Cours & Ateliers
              </Button>
            )}
            {isJoined ? (
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onLeave(e); }}
                className="border-[var(--border-color)] text-muted hover:border-red-400 hover:text-red-500 font-semibold">
                Quitter
              </Button>
            ) : (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onJoin(e); }}
                className="btn-solid font-semibold shadow-soft hover:shadow-medium transition-all">
                Rejoindre
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
