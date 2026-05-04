import { useState } from 'react';
import {
  LogOut, BookOpen, Star, Users, Calendar,
  ChevronRight, Edit3, Bell, Shield, HelpCircle,
  Crown, Lock, User as UserIcon,
  GraduationCap, Heart, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { genreList, educationLevels, sousGenresParGenre, classesParNiveau, intentionsList } from '@/data/constants';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import { ApiImage } from '@/components/ApiImage';
import type { User, View } from '@/types';
import { useBorrows, useReservations } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';

interface ProfilePageProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (view: View, params?: Record<string, string | number | boolean>) => void;
  onToggleMemberStatus?: () => void;
  onUpdateUser?: (updates: Partial<User>) => Promise<boolean>;
}

// ── Sous-composants ───────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

function StatCard({ icon: Icon, value, label }: { icon: IconComponent; value: number; label: string }) {
  return (
    <div className="surface rounded-xl p-4 shadow-card border border-[var(--border-color)] hover:shadow-card-hover transition-shadow flex flex-col items-center text-center gap-2">
      <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{value || 0}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ActivityItem({ icon: Icon, title, description, color }: { icon: IconComponent; title: string; description: string; color: 'accent' | 'amber' }) {
  const cls = color === 'amber'
    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
    : 'bg-[var(--library-accent)]/10 border-[var(--library-accent)]/20 text-accent';
  return (
    <div className="flex items-start gap-4 surface rounded-xl border border-[var(--border-color)] shadow-card p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-primary">{title}</h4>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}


// Force IDE refresh
function SettingItem({ icon: Icon, title, description, onClick }: { icon: IconComponent; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full surface rounded-xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover hover:border-[var(--library-accent)]/25 transition-all p-4 flex items-center gap-4 tap-feedback"
    >
      <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 text-left">
        <h4 className="font-semibold text-primary">{title}</h4>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
    </button>
  );
}

// ── Fiche profil ──────────────────────────────────────────────────────
function ProfilFiche({ user }: { user: User }) {
  const niveauLabels: Record<string, string> = {
    école: 'École primaire',
    lycée: 'Lycée',
    étudiant: 'Études supérieures',
    professionnel: 'Professionnel',
    autre: 'Autre',
  };

  const items = [
    {
      icon: GraduationCap,
      label: 'Niveau d\'études',
      value: user.educationLevel
        ? niveauLabels[user.educationLevel] ?? user.educationLevel
        : null,
    }, 
    {
      icon: GraduationCap,
      label: 'Classe / Filière',
      value: (user as unknown as Record<string, string>).classe ?? null,
    },
    {
      icon: BookOpen,
      label: 'Genre préféré',
      value: user.preferredGenres?.[0] ?? null,
    },
    {
      icon: Heart,
      label: 'Sous-genre',
      value: (user as unknown as Record<string, string>).sous_genre_prefere ?? null,
    },
    {
      icon: Calendar,
      label: 'Membre depuis',
      value: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
        : null,
    },
  ].filter(i => i.value);

  const profilComplet = !!(
    user.educationLevel &&
    user.preferredGenres?.[0] &&
    (user as unknown as Record<string, string>).sous_genre_prefere
  );

  if (items.length === 0) return null;

  return (
    <div className="surface rounded-2xl p-5 shadow-card border border-[var(--border-color)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-accent" />
          Mon profil
        </h3>
        {profilComplet ? (
          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Complet
          </span>
        ) : (
          <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />Incomplet
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.label} className="surface-alt rounded-xl p-3 border border-[var(--border-color)]">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-primary">{item.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────
export function ProfilePage({ user, onLogout, onToggleMemberStatus, onNavigate, onUpdateUser }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
  // State pour le formulaire
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    pseudo: user?.pseudo || '',
    educationLevel: user?.educationLevel || '',
    classe: (user as any)?.classe || '',
    classeCustom: '',
    genres: user?.preferredGenres || [],
    sous_genres: user?.sous_genre_prefere || [],
    intentions: (user as any)?.intentions || [],
  });
  const { borrows = [] } = useBorrows();
  const { reservations = [] } = useReservations();

  if (!user) return null;

  const stats = user.stats ?? { booksRead: 0, reviewsPosted: 0, clubsJoined: 0, eventsAttended: 0 };

  const handleLogout = () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) onLogout();
  };

  const handleSaveProfile = async () => {
    if (!onUpdateUser) return;
    const success = await onUpdateUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      pseudo: formData.pseudo,
      educationLevel: formData.educationLevel as any,
      classe: formData.classe === 'Autre' ? formData.classeCustom : formData.classe,
      preferredGenres: formData.genres,
      sous_genre_prefere: formData.sous_genres,
      intentions: formData.intentions,
    } as any);

    if (success) {
      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
    } else {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleUpgrade = async () => {
    if (!onUpdateUser) return;
    const success = await onUpdateUser({ isMember: true, type_compte: 'membre' } as any);
    if (success) {
      toast.success('Félicitations ! Vous êtes maintenant membre Premium.');
      setIsUpgrading(false);
    } else {
      toast.error('Erreur lors du passage en mode Premium');
    }
  };

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* ── BARRE LATÉRALE ── */}
          <div className="lg:col-span-1">
            <div className="surface rounded-2xl shadow-card border border-[var(--border-color)] overflow-hidden sticky top-24">

              {/* Bannière */}
              <div className="h-20 gradient-accent relative">
                <div className="absolute left-4 -bottom-8">
                  <div className="relative">
                    <ApiImage
                      src={typeof user.avatar === 'string' && (user.avatar.startsWith('/') || user.avatar.startsWith('http')) ? user.avatar : undefined}
                      imageKey={typeof user.avatar === 'string' && !(user.avatar.startsWith('/') || user.avatar.startsWith('http')) ? user.avatar : undefined}
                      alt={user.firstName}
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-[var(--library-surface)] shadow-medium"
                    />
                    {user.isMember && (
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--library-accent)] text-[var(--library-on-accent)] border-2 border-[var(--library-surface)] shadow-soft">
                        <Crown className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Infos */}
              <div className="pt-14 px-4 pb-5">
                <div className="mb-3">
                  <h2 className="font-display text-lg font-bold text-primary">
                    {(user as unknown as Record<string, string>).pseudo || user.firstName} {user.lastName}
                  </h2>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>

                <div className="mb-4">
                  {user.isMember ? (
                    <Badge className="bg-[var(--library-accent)]/15 text-accent border border-[var(--library-accent)]/30">
                      <Crown className="w-3 h-3 mr-1" />Membre
                    </Badge>
                  ) : (
                    <Badge className="surface-weak text-muted border border-[var(--border-color)]">
                      <Lock className="w-3 h-3 mr-1" />Non-membre
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="w-full border-[var(--border-color)] text-primary hover:bg-[var(--library-surface-alt)] hover:border-[var(--library-accent)]/30 font-semibold tap-feedback"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />Modifier profil
                  </Button>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full border-[var(--border-color)] text-muted hover:border-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold tap-feedback"
                  >
                    <LogOut className="w-4 h-4 mr-2" />Se déconnecter
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── CONTENU PRINCIPAL ── */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-6 surface border border-[var(--border-color)]">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="activity">Activité</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>

              {/* ── VUE D'ENSEMBLE ── */}
              <TabsContent value="overview" className="space-y-6">

                {/* Bannière devenir membre */}
                {!user.isMember && (
                  <div className="bg-[var(--library-accent)]/8 rounded-2xl p-5 border border-[var(--library-accent)]/20">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--library-accent)]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Crown className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-primary mb-1">Passez à l'étape suivante</h3>
                        <p className="text-sm text-muted mb-3">
                          Devenez membre CAEB : empruntez des livres, accédez à de nouveaux horizons littéraires.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {['✓ Emprunts physiques', '✓ Accès prioritaire', '✓ Tous les événements'].map(b => (
                            <Badge key={b} variant="secondary" className="text-xs surface border-[var(--border-color)]">{b}</Badge>
                          ))}
                        </div>
                        <Button 
                          onClick={() => setIsUpgrading(true)}
                          size="sm" className="btn-solid shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all tap-feedback"
                        >
                          <Crown className="w-4 h-4 mr-2" />Devenir membre
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fiche profil (niveau, genre, sous-genre…) */}
                <ProfilFiche user={user} />

                {/* Statistiques d'usage */}
                <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4">Statistiques</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={BookOpen} value={stats.booksRead || 0} label="Livres lus" />
                    <StatCard icon={Star} value={stats.reviewsPosted || 0} label="Avis postés" />
                    <StatCard icon={Users} value={stats.clubsJoined || 0} label="Clubs" />
                    <StatCard icon={Calendar} value={stats.eventsAttended || 0} label="Événements" />
                  </div>
                </section>

                {/* Emprunts — membres uniquement (contrainte du document) */}
                {user.isMember ? (
                  <section>
                    <h3 className="font-display font-semibold text-lg text-primary mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-accent" />Mes emprunts en cours
                    </h3>
                    {borrows.length > 0 ? (
                      <div className="grid gap-3">
                        {borrows.map((borrow) => (
                          <div
                            key={borrow.id}
                            className="surface rounded-xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover transition-shadow p-4 flex items-start gap-4"
                          >
                            <ApiImage
                              src={borrow.livre.couverture?.startsWith('/') || borrow.livre.couverture?.startsWith('http') ? borrow.livre.couverture : undefined}
                              alt={borrow.livre.titre}
                              className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-primary line-clamp-1">{borrow.livre.titre}</h4>
                              <p className="text-sm text-muted">{borrow.livre.auteur}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                                <span className="text-sm font-semibold text-accent">
                                  Retour le {borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString('fr-FR') : 'Non défini'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="surface-weak rounded-xl border border-[var(--border-color)] p-6 text-center">
                        <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-muted text-sm">Aucun emprunt en cours</p>
                      </div>
                    )}

                    {reservations.length > 0 && (
                      <>
                        <h3 className="font-display font-semibold text-lg text-primary mb-4 mt-6">Mes réservations</h3>
                        <div className="grid gap-3">
                          {reservations.map((res) => (
                            <div
                              key={res.id}
                              className="surface rounded-xl border border-[var(--border-color)] shadow-card p-4 flex items-start gap-4"
                            >
                              <ApiImage
                                src={res.livre.couverture?.startsWith('/') || res.livre.couverture?.startsWith('http') ? res.livre.couverture : undefined}
                                alt={res.livre.titre}
                                className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-primary line-clamp-1">{res.livre.titre}</h4>
                                <p className="text-sm text-muted">{res.livre.auteur}</p>
                                <Badge className="mt-2 bg-[var(--library-accent)]/10 text-accent border border-[var(--library-accent)]/20">
                                  En attente
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </section>
                ) : (
                  <section>
                    <h3 className="font-display font-semibold text-lg text-primary mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-muted" />Mes emprunts
                    </h3>
                    <div className="surface-weak rounded-2xl border border-[var(--border-color)] p-8 text-center">
                      <Lock className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                      <p className="text-muted text-sm mb-4">
                        L'emprunt physique est réservé aux membres.
                      </p>
                      <Button 
                        onClick={() => setIsUpgrading(true)}
                        className="btn-solid shadow-soft tap-feedback"
                      >
                        <Crown className="w-4 h-4 mr-2" />Devenir membre
                      </Button>
                    </div>
                  </section>
                )}
              </TabsContent>

              {/* ── ACTIVITÉ ── */}
              <TabsContent value="activity" className="space-y-6">
                <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4">
                    Interactions récentes
                  </h3>
                  {(stats.booksRead || 0) === 0 && (stats.reviewsPosted || 0) === 0 ? (
                    <div className="surface rounded-2xl shadow-card border border-[var(--border-color)] p-8 text-center">
                      <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                      <p className="text-muted text-sm">
                        Vos interactions (livres lus, avis, clubs) apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(stats.booksRead || 0) > 0 && (
                        <ActivityItem
                          icon={BookOpen}
                          title={`${stats.booksRead || 0} livre${(stats.booksRead || 0) > 1 ? 's' : ''} marqué${(stats.booksRead || 0) > 1 ? 's' : ''} comme lu`}
                          description="Ces signaux alimentent votre vecteur de profil"
                          color="accent"
                        />
                      )}
                      {(stats.reviewsPosted || 0) > 0 && (
                        <ActivityItem
                          icon={Star}
                          title={`${stats.reviewsPosted || 0} avis publié${(stats.reviewsPosted || 0) > 1 ? 's' : ''}`}
                          description={
                            user.isMember
                              ? 'Chaque avis compte.'
                              : 'Donnez votre avis sur vos lectures.'
                          }
                          color="amber"
                        />
                      )}
                      {(stats.clubsJoined || 0) > 0 && (
                        <ActivityItem
                          icon={Users}
                          title={`${stats.clubsJoined || 0} club${(stats.clubsJoined || 0) > 1 ? 's' : ''} rejoint`}
                          description="Clubs de lecture CAEB"
                          color="accent"
                        />
                      )}
                      {(stats.eventsAttended || 0) > 0 && (
                        <ActivityItem
                          icon={Calendar}
                          title={`${stats.eventsAttended || 0} événement${(stats.eventsAttended || 0) > 1 ? 's' : ''} suivi`}
                          description="Conférences, ateliers et clubs de lecture"
                          color="accent"
                        />
                      )}
                    </div>
                  )}
                </section>


              </TabsContent>

              {/* ── PARAMÈTRES ── */}
              <TabsContent value="settings" className="space-y-3">
                <SettingItem icon={Edit3} title="Modifier mon profil" description="Nom, niveau, genre préféré, sous-genre" onClick={() => setIsEditing(true)} />
                <SettingItem icon={Bell} title="Notifications" description="Rappels de retour, livres disponibles" onClick={() => onNavigate('settings')} />
                <SettingItem icon={Shield} title="Confidentialité" description="Visibilité du profil et gestion des données" onClick={() => setShowPrivacy(true)} />
                <SettingItem icon={HelpCircle} title="Aide & Contact" description="FAQ, horaires et comment nous joindre" onClick={() => setShowHelp(true)} />

                {onToggleMemberStatus && (
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <p className="text-xs text-muted mb-2 px-1">Mode démonstration</p>
                    <Button
                      onClick={onToggleMemberStatus}
                      variant="outline"
                      className="w-full border-[var(--library-accent)]/30 text-accent hover:bg-[var(--library-accent)]/10 font-semibold tap-feedback"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {user.isMember ? 'Passer en mode Non-membre' : 'Passer en mode Membre'}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {/* Modal d'édition */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-2xl rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-surface-alt">
              <h2 className="text-xl font-bold text-primary">Modifier mon profil</h2>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-surface-weak rounded-full transition-colors text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 custom-scrollbar">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Prénom</label>
                  <input type="text" value={formData.firstName} onChange={e => setFormData(f => ({...f, firstName: e.target.value}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Nom</label>
                  <input type="text" value={formData.lastName} onChange={e => setFormData(f => ({...f, lastName: e.target.value}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Pseudo</label>
                <input type="text" value={formData.pseudo} onChange={e => setFormData(f => ({...f, pseudo: e.target.value}))}
                  className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Statut</label>
                  <select value={formData.educationLevel} onChange={e => setFormData(f => ({...f, educationLevel: e.target.value, classe: ''}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none">
                    <option value="">Sélectionner...</option>
                    {educationLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {classesParNiveau[formData.educationLevel]?.length > 0 ? (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">Classe / Filière</label>
                    <select value={formData.classe} onChange={e => setFormData(f => ({...f, classe: e.target.value}))}
                      className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none">
                      <option value="">Sélectionner...</option>
                      {classesParNiveau[formData.educationLevel].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {formData.classe === 'Autre' && (
                      <input type="text" value={formData.classeCustom} onChange={e => setFormData(f => ({...f, classeCustom: e.target.value}))}
                        placeholder="Précisez votre classe/filière"
                        className="w-full px-4 py-2 mt-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" autoFocus />
                    )}
                  </div>
                ) : formData.educationLevel ? (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">
                      {['Professionnel', 'Autre'].includes(formData.educationLevel) ? 'Métier' : 'Classe / Filière'}
                    </label>
                    <input type="text" value={formData.classe} onChange={e => setFormData(f => ({...f, classe: e.target.value}))}
                      placeholder={`Ex: ${['Professionnel', 'Autre'].includes(formData.educationLevel) ? 'Profession' : 'Classe, Filière'}...`}
                      className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Genres préférés</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                    {genreList.map((g: string) => (
                      <button key={g} type="button"
                        onClick={() => {
                          const current = formData.genres || [];
                          const updated = current.includes(g) ? current.filter((i: string) => i !== g) : [...current, g];
                          setFormData(f => ({ ...f, genres: updated, sous_genres: [] }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${formData.genres?.includes(g)
                          ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-sm'
                          : 'surface-alt text-primary border-[var(--border-color)] hover:border-[var(--library-accent)]/50'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.genres?.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">Sous-genres préférés</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                      {formData.genres.flatMap(genre => sousGenresParGenre[genre] || []).map((sg: string) => (
                        <button key={sg} type="button"
                          onClick={() => {
                            const current = formData.sous_genres || [];
                            const updated = current.includes(sg) ? current.filter((i: string) => i !== sg) : [...current, sg];
                            setFormData(f => ({ ...f, sous_genres: updated }));
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${formData.sous_genres?.includes(sg)
                            ? 'bg-[var(--library-accent)]/15 text-[var(--library-accent)] border-[var(--library-accent)]/30 font-medium'
                            : 'surface-alt text-muted border-[var(--border-color)] hover:border-[var(--library-accent)]/50'}`}>
                          {sg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="text-sm font-semibold text-primary">Intention (Pourquoi avez-vous rejoint la CAEB ?)</label>
                  <div className="flex flex-wrap gap-2 p-1">
                    {intentionsList.map((intention: string) => (
                      <button key={intention} type="button"
                        onClick={() => {
                          const current = formData.intentions || [];
                          const updated = current.includes(intention) ? current.filter((i: string) => i !== intention) : [...current, intention];
                          setFormData(f => ({ ...f, intentions: updated }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-sm transition-all border ${formData.intentions?.includes(intention)
                            ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-sm'
                            : 'surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'}`}>
                        {intention}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-3 bg-surface-alt">
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 font-bold">Annuler</Button>
              <Button onClick={handleSaveProfile} className="flex-1 btn-solid font-bold">Enregistrer les modifications</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Devenir Membre */}
      {isUpgrading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-md rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-[var(--library-accent)]/10 rounded-full flex items-center justify-center mx-auto">
                <Crown className="w-10 h-10 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">Devenir membre Premium</h2>
                <p className="text-muted leading-relaxed">
                  Accédez à l'emprunt illimité de nos 12 000 ouvrages, profitez d'échanges avec notre IA et participez à tous nos événements exclusifs.
                </p>
              </div>
              <div className="space-y-3 pt-2">
                <Button onClick={handleUpgrade} className="w-full btn-solid py-6 text-lg font-bold shadow-medium">
                  Confirmer mon adhésion
                </Button>
                <Button onClick={() => setIsUpgrading(false)} variant="ghost" className="w-full text-muted font-semibold">
                  Plus tard
                </Button>
              </div>
              <p className="text-[10px] text-muted uppercase tracking-widest font-bold">CAEB NATITINGOU — BIBLIOTHÈQUE</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aide & Contact */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-2xl rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-surface-alt">
              <h2 className="text-xl font-bold text-primary">Aide & Contact</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 hover:bg-surface-weak rounded-full transition-colors text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 custom-scrollbar">
              <section className="space-y-3">
                <h3 className="font-bold text-primary flex items-center gap-2"><HelpCircle className="w-5 h-5 text-accent" /> Questions fréquentes</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-sm">Comment emprunter un livre ?</p>
                    <p className="text-sm text-muted">Devenez membre Premium, puis présentez-vous à la bibliothèque avec votre carte numérique. Vous pouvez réserver vos livres à l'avance sur l'application.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Quelles sont les durées d'emprunt ?</p>
                    <p className="text-sm text-muted">La durée standard est de 14 jours, renouvelable une fois si le livre n'est pas réservé par un autre lecteur.</p>
                  </div>
                </div>
              </section>
              <section className="space-y-3 border-t border-[var(--border-color)] pt-6">
                <h3 className="font-bold text-primary">Contactez-nous</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 surface-alt rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-muted font-bold uppercase mb-1">Téléphone</p>
                    <p className="font-semibold">+229 23 82 11 05</p>
                  </div>
                  <div className="p-4 surface-alt rounded-xl border border-[var(--border-color)]">
                    <p className="text-xs text-muted font-bold uppercase mb-1">Email</p>
                    <p className="font-semibold">contact@caeb-natitingou.bj</p>
                  </div>
                </div>
              </section>
            </div>
            <div className="p-6 border-t border-[var(--border-color)] bg-surface-alt text-center">
              <p className="text-xs text-muted">CAEB Natitingou — Ouvert du Lundi au Samedi, 08h-19h</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confidentialité */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-lg rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-surface-alt">
              <h2 className="text-xl font-bold text-primary">Confidentialité</h2>
              <button onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-surface-weak rounded-full transition-colors text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted leading-relaxed">
                La CAEB s'engage à protéger vos données personnelles. Vos interactions (livres lus, avis) sont utilisées exclusivement pour :
              </p>
              <ul className="space-y-2">
                <li className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Découvrez de nouveaux horizons littéraires.</li>
                <li className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Gérer vos emprunts et réservations.</li>
                <li className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Assurer le suivi de votre compte membre.</li>
              </ul>
              <p className="text-sm text-muted italic pt-2">
                Conformément à la loi, vous disposez d'un droit d'accès et de suppression de vos données en nous contactant.
              </p>
            </div>
            <div className="p-6 border-t border-[var(--border-color)] bg-surface-alt">
              <Button onClick={() => setShowPrivacy(false)} className="w-full btn-solid font-bold">J'ai compris</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}