import { useState, useMemo } from 'react';
import {
  LogOut, BookOpen, Star, Users, Calendar,
  ChevronRight, Edit3, Bell, Shield, HelpCircle,
  Crown, Lock, TrendingUp, User as UserIcon,
  GraduationCap, Heart, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { genreList, educationLevels, sousGenresParGenre } from '@/data/constants';
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

// ── Score de confiance — barre de progression ─────────────────────────
// Correspond à la valeur C du document (0 → 1)
// Seuils d'activation : CB > 0 · CF ≥ 0.3 · IB ≥ 0.6
function ScoreConfiance({ score }: { score: number }) {
  const pct = Math.round(score * 100);

  const getLevel = () => {
    if (score < 0.3) return { label: 'Débutant', color: 'bg-slate-400', text: 'text-slate-500', desc: 'Recommandations basées sur la popularité générale.' };
    if (score < 0.6) return { label: 'En cours', color: 'bg-amber-400', text: 'text-amber-600', desc: 'Recommandations personnalisées partiellement actives.' };
    return { label: 'Bien connu', color: 'bg-emerald-500', text: 'text-emerald-600', desc: 'Toutes les sources de recommandation sont actives.' };
  };

  const { label, color, text, desc } = getLevel();

  const thresholds = [
    { value: 0, label: 'CB', active: score > 0 },
    { value: 30, label: 'CF', active: score >= 0.3 },
    { value: 60, label: 'IB', active: score >= 0.6 },
  ];

  return (
    <div className="surface rounded-2xl p-5 shadow-card border border-[var(--border-color)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          Profil de recommandation
        </h3>
        <span className={`text-sm font-bold ${text}`}>{label}</span>
      </div>

      {/* Barre */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted">
          <span>Score de confiance</span>
          <span className="font-bold text-primary">{pct} %</span>
        </div>
        <div className="relative h-3 bg-[var(--library-surface-alt)] rounded-full border border-[var(--border-color)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${color}`}
            style={{ width: `${pct}%` }}
          />
          {/* Marqueurs seuils */}
          {thresholds.slice(1).map(t => (
            <div
              key={t.label}
              className="absolute top-0 bottom-0 w-px bg-[var(--library-surface)] opacity-60"
              style={{ left: `${t.value}%` }}
            />
          ))}
        </div>
        <p className="text-xs text-muted">{desc}</p>
      </div>

      {/* Sources actives */}
      <div className="flex gap-2 flex-wrap">
        {thresholds.map(t => (
          <span
            key={t.label}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${t.active
                ? 'bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/25'
                : 'surface-weak text-muted border-[var(--border-color)] opacity-50'
              }`}
          >
            {t.active
              ? <CheckCircle2 className="w-3 h-3" />
              : <AlertCircle className="w-3 h-3" />
            }
            {t.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/25">
          <CheckCircle2 className="w-3 h-3" />
          POP
        </span>
      </div>
    </div>
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

      {!profilComplet && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          Un profil complet (niveau + genre + sous-genre) améliore la précision de vos recommandations.
        </p>
      )}
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
    genre: user?.preferredGenres?.[0] || '',
    sous_genre: (user as any)?.sous_genre_prefere || '',
  });
  const { borrows = [] } = useBorrows();
  const { reservations = [] } = useReservations();

  if (!user) return null;

  const stats = user.stats ?? { booksRead: 0, reviewsPosted: 0, clubsJoined: 0, eventsAttended: 0 };

  // Score de confiance : calculé côté front en attendant l'API
  // Formule du document :
  //   Non-membre : 0.20×profil + 0.35×(avis/5) + 0.25×(genres/3) + 0.20×(ancienneté/90j)
  //   Membre     : 0.20×profil + 0.40×(emprunts/5) + 0.25×(genres/3) + 0.15×(ancienneté/90j)
  const scoreConfiance: number = (() => {
    const profilComplet = user.educationLevel &&
      user.preferredGenres?.[0] &&
      (user as unknown as Record<string, string>).sous_genre_prefere ? 1 : 0;

    const nbGenres = user.preferredGenres?.length ?? 0;
    const anciennete = useMemo(() => {
      if (!user.createdAt) return 0;
      return Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    }, [user.createdAt]);

    const g = Math.min(nbGenres / 3, 1);
    const a = Math.min(anciennete / 90, 1);

    if (user.isMember) {
      const e = Math.min(stats.booksRead / 5, 1);
      return Math.min(0.20 * profilComplet + 0.40 * e + 0.25 * g + 0.15 * a, 1);
    } else {
      const v = Math.min(stats.reviewsPosted / 5, 1);
      return Math.min(0.20 * profilComplet + 0.35 * v + 0.25 * g + 0.20 * a, 1);
    }
  })();

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
      classe: formData.classe,
      preferredGenres: formData.genre ? [formData.genre] : [],
      sous_genre_prefere: formData.sous_genre,
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
                          Devenez membre CAEB : empruntez des livres, accédez à des recommandations
                          plus précises grâce à l'historique d'emprunts réels.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {['✓ Emprunts physiques', '✓ Recommandations avancées', '✓ Tous les événements'].map(b => (
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

                {/* Score de confiance */}
                <ScoreConfiance score={scoreConfiance} />

                {/* Fiche profil (niveau, genre, sous-genre…) */}
                <ProfilFiche user={user} />

                {/* Statistiques d'usage */}
                <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4">Statistiques</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={BookOpen} value={stats.booksRead} label="Livres lus" />
                    <StatCard icon={Star} value={stats.reviewsPosted} label="Avis postés" />
                    <StatCard icon={Users} value={stats.clubsJoined} label="Clubs" />
                    <StatCard icon={Calendar} value={stats.eventsAttended} label="Événements" />
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
                        {(borrows as Array<{
                          id: string;
                          book: { cover: string; title: string; author: string };
                          returnDate: string;
                        }>).map((borrow) => (
                          <div
                            key={borrow.id}
                            className="surface rounded-xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover transition-shadow p-4 flex items-start gap-4"
                          >
                            <ApiImage
                              src={borrow.book.cover?.startsWith('/') || borrow.book.cover?.startsWith('http') ? borrow.book.cover : undefined}
                              alt={borrow.book.title}
                              className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-primary line-clamp-1">{borrow.book.title}</h4>
                              <p className="text-sm text-muted">{borrow.book.author}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                                <span className="text-sm font-semibold text-accent">
                                  Retour le {new Date(borrow.returnDate).toLocaleDateString('fr-FR')}
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
                          {(reservations as Array<{
                            id: string;
                            book: { cover: string; title: string; author: string };
                          }>).map((res) => (
                            <div
                              key={res.id}
                              className="surface rounded-xl border border-[var(--border-color)] shadow-card p-4 flex items-start gap-4"
                            >
                              <ApiImage
                                src={res.book.cover?.startsWith('/') || res.book.cover?.startsWith('http') ? res.book.cover : undefined}
                                alt={res.book.title}
                                className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-primary line-clamp-1">{res.book.title}</h4>
                                <p className="text-sm text-muted">{res.book.author}</p>
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
                        L'emprunt physique est réservé aux membres. Les emprunts enrichissent
                        votre profil et améliorent la précision des recommandations.
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
                  {stats.booksRead === 0 && stats.reviewsPosted === 0 ? (
                    <div className="surface rounded-2xl shadow-card border border-[var(--border-color)] p-8 text-center">
                      <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                      <p className="text-muted text-sm">
                        Vos interactions (livres lus, avis, clubs) apparaîtront ici et amélioreront vos recommandations.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stats.booksRead > 0 && (
                        <ActivityItem
                          icon={BookOpen}
                          title={`${stats.booksRead} livre${stats.booksRead > 1 ? 's' : ''} marqué${stats.booksRead > 1 ? 's' : ''} comme lu`}
                          description="Ces signaux alimentent votre vecteur de profil"
                          color="accent"
                        />
                      )}
                      {stats.reviewsPosted > 0 && (
                        <ActivityItem
                          icon={Star}
                          title={`${stats.reviewsPosted} avis publié${stats.reviewsPosted > 1 ? 's' : ''}`}
                          description={
                            user.isMember
                              ? 'Chaque note enrichit votre profil avec un poids de 1.0'
                              : 'Signal principal pour les recommandations (poids 0.35)'
                          }
                          color="amber"
                        />
                      )}
                      {stats.clubsJoined > 0 && (
                        <ActivityItem
                          icon={Users}
                          title={`${stats.clubsJoined} club${stats.clubsJoined > 1 ? 's' : ''} rejoint`}
                          description="Clubs de lecture CAEB"
                          color="accent"
                        />
                      )}
                      {stats.eventsAttended > 0 && (
                        <ActivityItem
                          icon={Calendar}
                          title={`${stats.eventsAttended} événement${stats.eventsAttended > 1 ? 's' : ''} suivi`}
                          description="Conférences, ateliers et clubs de lecture"
                          color="accent"
                        />
                      )}
                    </div>
                  )}
                </section>

                {/* Explication du score — visible uniquement si profil incomplet */}
                {scoreConfiance < 0.6 && (
                  <section>
                    <h3 className="font-display font-semibold text-lg text-primary mb-4">
                      Améliorer mes recommandations
                    </h3>
                    <div className="space-y-3">
                      {!user.educationLevel && (
                        <TipItem text="Renseignez votre niveau d'études dans votre profil (+20 % sur le score de confiance)" />
                      )}
                      {!user.preferredGenres?.[0] && (
                        <TipItem text="Choisissez un genre préféré pour activer les recommandations par contenu (CB)" />
                      )}
                      {!(user as unknown as Record<string, string>).sous_genre_prefere && (
                        <TipItem text="Ajoutez un sous-genre pour affiner encore davantage vos suggestions" />
                      )}
                      {stats.reviewsPosted < 5 && !user.isMember && (
                        <TipItem text={`Publiez ${5 - stats.reviewsPosted} avis supplémentaire${5 - stats.reviewsPosted > 1 ? 's' : ''} pour renforcer votre profil`} />
                      )}
                      {user.isMember && stats.booksRead < 5 && (
                        <TipItem text={`${5 - stats.booksRead} emprunt${5 - stats.booksRead > 1 ? 's' : ''} supplémentaire${5 - stats.booksRead > 1 ? 's' : ''} pour activer toutes les sources de recommandation`} />
                      )}
                    </div>
                  </section>
                )}
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
                  <label className="text-sm font-semibold text-primary">Niveau d'études</label>
                  <select value={formData.educationLevel} onChange={e => setFormData(f => ({...f, educationLevel: e.target.value, classe: ''}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none">
                    <option value="">Sélectionner...</option>
                    {educationLevels.map(l => <option key={l} value={l.toLowerCase()}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Classe / Filière</label>
                  <input type="text" value={formData.classe} onChange={e => setFormData(f => ({...f, classe: e.target.value}))}
                    placeholder="ex: 3ème, MI L2..."
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Genre préféré</label>
                  <select value={formData.genre} onChange={e => setFormData(f => ({...f, genre: e.target.value, sous_genre: ''}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none">
                    <option value="">Sélectionner...</option>
                    {genreList.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Sous-genre préféré</label>
                  <select value={formData.sous_genre} onChange={e => setFormData(f => ({...f, sous_genre: e.target.value}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none">
                    <option value="">Sélectionner...</option>
                    {formData.genre && sousGenresParGenre[formData.genre]?.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                  </select>
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
                  Accédez à l'emprunt illimité de nos 12 000 ouvrages, profitez de recommandations personnalisées IA et participez à tous nos événements exclusifs.
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
              <p className="text-[10px] text-muted uppercase tracking-widest font-bold">CAEB NATITINGOU — BIBLIOTHÈQUE NUMÉRIQUE</p>
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
                <li className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Améliorer vos recommandations personnalisées.</li>
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
  );
}

// ── Sous-composants ───────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="surface rounded-xl p-4 shadow-card border border-[var(--border-color)] hover:shadow-card-hover transition-shadow flex flex-col items-center text-center gap-2">
      <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-full flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ActivityItem({ icon: Icon, title, description, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: 'accent' | 'amber';
}) {
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

function TipItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 surface-alt rounded-xl border border-[var(--library-accent)]/15 p-4">
      <TrendingUp className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function SettingItem({ icon: Icon, title, description, onClick }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
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