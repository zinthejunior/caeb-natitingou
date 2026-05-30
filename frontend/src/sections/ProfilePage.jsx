import { useState } from "react";
import {
  LogOut,
  BookOpen,
  Star,
  Users,
  Calendar,
  ChevronRight,
  Edit3,
  Bell,
  Shield,
  HelpCircle,
  Crown,
  Lock,
  User as UserIcon,
  GraduationCap,
  Heart,
  CheckCircle2,
  AlertCircle,
  X,
  Clock
} from "lucide-react";
import { genreList, educationLevels, sousGenresParGenre, classesParNiveau, intentionsList } from "@/data/constants";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { ApiImage } from "@/components/ApiImage";
import { useBorrows, useReservations, useParticipationsEvenements, useGlobalStats, useLivresLus } from "@/hooks/useData";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/lib/utils";
function StatCard({ icon: Icon, value, label }) {
  return <div className="glass-effect rounded-2xl p-5 shadow-soft border border-[var(--border-color)] hover:shadow-card-hover hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-2 group">
      <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-accent" />
      </div>
      <div>
        <p className="text-2xl font-bold text-primary">{value || 0}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>;
}
function ActivityItem({ icon: Icon, title, description, color }) {
  const cls = color === "amber" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-[var(--library-accent)]/10 border-[var(--library-accent)]/20 text-accent";
  return <div className="flex items-start gap-4 surface rounded-xl border border-[var(--border-color)] shadow-card p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${cls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-primary">{title}</h4>
        <p className="text-sm text-muted mt-0.5">{description}</p>
      </div>
    </div>;
}
function SettingItem({ icon: Icon, title, description, onClick }) {
  return <button
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
    </button>;
}
function ProfilFiche({ user }) {
  const niveauLabels = {
    école: "École primaire",
    lycée: "Lycée",
    étudiant: "Études supérieures",
    professionnel: "Professionnel",
    autre: "Autre"
  };
  const items = [
    {
      icon: GraduationCap,
      label: "Niveau d'études",
      value: user.educationLevel ? niveauLabels[user.educationLevel] ?? user.educationLevel : null
    },
    {
      icon: GraduationCap,
      label: "Classe / Filière",
      value: user.classe ?? null
    },
    {
      icon: BookOpen,
      label: "Genre préféré",
      value: user.preferredGenres?.[0] ?? null
    },
    {
      icon: Heart,
      label: "Sous-genre",
      value: user.sous_genre_prefere ?? null
    },
    {
      icon: Calendar,
      label: "Membre depuis",
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : null
    }
  ].filter((i) => i.value);
  const profilComplet = !!(user.educationLevel && user.preferredGenres?.[0] && user.sous_genre_prefere);
  if (items.length === 0) return null;
  return <div className="surface rounded-2xl p-5 shadow-card border border-[var(--border-color)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-accent" />
          Mon profil
        </h3>
        {profilComplet ? <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />Complet
          </span> : <span className="text-xs font-semibold text-amber-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />Incomplet
          </span>}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item) => <div key={item.label} className="surface-alt rounded-xl p-3 border border-[var(--border-color)]">
            <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-primary">{item.value}</p>
          </div>)}
      </div>

    </div>;
}
export function ProfilePage({ user, onLogout, onToggleMemberStatus, onNavigate, onUpdateUser }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const { stats: backendStats } = useGlobalStats();
  const bookCount = backendStats?.books_count?.toLocaleString();
  useSEO("Mon Profil", "Gérez vos emprunts, vos réservations et vos préférences de lecture sur votre espace personnel CAEB.");
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    pseudo: user?.pseudo || "",
    educationLevel: user?.educationLevel || "",
    classe: user?.classe || "",
    classeCustom: "",
    genres: user?.preferredGenres || [],
    sous_genres: user?.sous_genre_prefere || [],
    intentions: user?.intentions || []
  });
  const { borrows = [] } = useBorrows();
  const { reservations = [] } = useReservations();
  const { participations = [] } = useParticipationsEvenements();
  const { livresLus = [] } = useLivresLus();
  const stats = user?.stats ?? { booksRead: 0, reviewsPosted: 0, clubsJoined: 0, eventsAttended: 0 };
  const handleLogout = () => {
    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) onLogout();
  };
  const handleSaveProfile = async () => {
    if (!onUpdateUser) return;
    const success = await onUpdateUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      pseudo: formData.pseudo,
      educationLevel: formData.educationLevel,
      classe: formData.classe === "Autre" ? formData.classeCustom : formData.classe,
      preferredGenres: formData.genres,
      sous_genre_prefere: formData.sous_genres,
      intentions: formData.intentions
    });
    if (success) {
      toast.success("Profil mis à jour avec succès");
      setIsEditing(false);
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
  };
  const handleUpgrade = async () => {
    if (!onUpdateUser) return;
    const success = await onUpdateUser({ type_compte: "en_attente" });
    if (success) {
      toast.success("Demande d'adhésion envoyée !", { description: "Un bibliothécaire confirmera votre adhésion très bientôt." });
      setIsUpgrading(false);
    } else {
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {
    /* ── BARRE LATÉRALE ── */
  }
          <div className="lg:col-span-1 animate-flow-in">
            <div className={`surface rounded-[2rem] shadow-card border border-[var(--border-color)] overflow-hidden sticky top-24 transition-all duration-500 ${user.isMember ? "shadow-glow border-accent/30" : ""}`}>

              {
    /* Bannière Mesh */
  }
              <div className="h-24 mesh-gradient-light dark:mesh-gradient-dark relative">
                <div className="absolute inset-0 bg-accent/5 animate-pulse-soft" />
                <div className="absolute left-4 -bottom-8">
                  <div className="relative">
                    <ApiImage
    src={typeof user.avatar === "string" && (user.avatar.startsWith("/") || user.avatar.startsWith("http")) ? user.avatar : void 0}
    imageKey={typeof user.avatar === "string" && !(user.avatar.startsWith("/") || user.avatar.startsWith("http")) ? user.avatar : void 0}
    alt={user.firstName}
    className="w-24 h-24 rounded-2xl object-cover border-4 border-[var(--library-surface)] shadow-medium"
  />
                    {user.estMembre && <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--library-accent)] text-[var(--library-on-accent)] border-2 border-[var(--library-surface)] shadow-soft">
                        <Crown className="w-4 h-4" />
                      </div>}
                    {user.type_compte === "en_attente" && <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500 text-white border-2 border-[var(--library-surface)] shadow-soft animate-pulse">
                        <Clock className="w-4 h-4" />
                      </div>}
                  </div>
                </div>
              </div>

              {
    /* Infos */
  }
              <div className="pt-14 px-4 pb-5">
                <div className="mb-3">
                  <h2 className="font-display text-lg font-bold text-primary">
                    {user.pseudo || user.firstName} {user.lastName}
                  </h2>
                  <p className="text-sm text-muted">{user.email}</p>
                </div>

                <div className="mb-4">
                  {user.isMember ? <Badge className="bg-[var(--library-accent)]/15 text-accent border border-[var(--library-accent)]/30">
                      <Crown className="w-3 h-3 mr-1" />Membre
                    </Badge> : <Badge className="surface-weak text-muted border border-[var(--border-color)]">
                      <Lock className="w-3 h-3 mr-1" />Non-membre
                    </Badge>}
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

          {
    /* ── CONTENU PRINCIPAL ── */
  }
          <div className="lg:col-span-2 animate-flow-in" style={{ animationDelay: "100ms" }}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full mb-6 surface border border-[var(--border-color)]">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="activity">Activité</TabsTrigger>
                <TabsTrigger value="settings">Paramètres</TabsTrigger>
              </TabsList>

              {
    /* ── VUE D'ENSEMBLE ── */
  }
              <TabsContent value="overview" className="space-y-6">

                {
    /* Bannière devenir membre */
  }
                {!user.estMembre && <div className={`${user.type_compte === "en_attente" ? "bg-amber-500/5 border-amber-500/20" : "bg-[var(--library-accent)]/8 border-[var(--library-accent)]/20"} rounded-2xl p-5 border`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${user.type_compte === "en_attente" ? "bg-amber-500/10" : "bg-[var(--library-accent)]/15"} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {user.type_compte === "en_attente" ? <Clock className="w-6 h-6 text-amber-500" /> : <Crown className="w-6 h-6 text-accent" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-primary mb-1">
                          {user.type_compte === "en_attente" ? "Demande en cours" : "Passez à l'étape suivante"}
                        </h3>
                        <p className="text-sm text-muted mb-3">
                          {user.type_compte === "en_attente" ? "Votre demande d'adhésion est en cours de traitement par nos bibliothécaires. Vous recevrez une notification dès qu'elle sera confirmée." : "Devenez membre CAEB : empruntez des livres, accédez à de nouveaux horizons littéraires."}
                        </p>
                        {user.type_compte !== "en_attente" && <div className="flex flex-wrap gap-2 mb-3">
                            {["✓ Emprunts physiques", "✓ Accès prioritaire", "✓ Tous les événements"].map((b) => <Badge key={b} variant="secondary" className="text-xs surface border-[var(--border-color)]">{b}</Badge>)}
                          </div>}
                        <Button
    onClick={() => user.type_compte !== "en_attente" && setIsUpgrading(true)}
    disabled={user.type_compte === "en_attente"}
    size="sm"
    className={`${user.type_compte === "en_attente" ? "bg-amber-500/20 text-amber-600" : "btn-solid"} shadow-soft hover:shadow-medium hover:-translate-y-0.5 transition-all tap-feedback`}
  >
                          {user.type_compte === "en_attente" ? <><Clock className="w-4 h-4 mr-2" />En attente de confirmation</> : <><Crown className="w-4 h-4 mr-2" />Devenir membre</>}
                        </Button>
                      </div>
                    </div>
                  </div>}

                {
    /* Fiche profil (niveau, genre, sous-genre…) */
  }
                <ProfilFiche user={user} />

                {
    /* Statistiques d'usage */
  }
                <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4">Statistiques</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={BookOpen} value={stats.booksRead || 0} label="Livres lus" />
                    <StatCard icon={Star} value={stats.reviewsPosted || 0} label="Avis postés" />
                    <StatCard icon={Users} value={stats.clubsJoined || 0} label="Clubs" />
                    <StatCard icon={Calendar} value={stats.eventsAttended || 0} label="Événements" />
                  </div>
                </section>

                {
    /* Emprunts — membres uniquement (contrainte du document) */
  }
                {user.isMember ? <section>
                    <h3 className="font-display font-semibold text-lg text-primary mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-accent" />Mes emprunts en cours
                    </h3>
                    {borrows.length > 0 ? <div className="grid gap-3">
                        {borrows.map((borrow) => <div
    key={borrow.id}
    className="surface rounded-xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover transition-shadow p-4 flex items-start gap-4"
  >
                            <ApiImage
    src={borrow.livre.couverture?.startsWith("/") || borrow.livre.couverture?.startsWith("http") ? borrow.livre.couverture : void 0}
    alt={borrow.livre.titre}
    className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
  />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-primary line-clamp-1">{borrow.livre.titre}</h4>
                              <p className="text-sm text-muted">{borrow.livre.auteur}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Calendar className="w-4 h-4 text-accent flex-shrink-0" />
                                <span className="text-sm font-semibold text-accent">
                                  Retour le {borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString("fr-FR") : "Non défini"}
                                </span>
                              </div>
                            </div>
                          </div>)}
                      </div> : <div className="surface-weak rounded-xl border border-[var(--border-color)] p-6 text-center">
                        <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-muted text-sm">Aucun emprunt en cours</p>
                      </div>}

                    {reservations.length > 0 && <>
                        <h3 className="font-display font-semibold text-lg text-primary mb-4 mt-6">Mes réservations</h3>
                        <div className="grid gap-3">
                          {reservations.map((res) => <div
    key={res.id}
    className="surface rounded-xl border border-[var(--border-color)] shadow-card p-4 flex items-start gap-4"
  >
                              <ApiImage
    src={res.livre.couverture?.startsWith("/") || res.livre.couverture?.startsWith("http") ? res.livre.couverture : void 0}
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
                            </div>)}
                        </div>
                      </>}
                  </section> : <section>
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
                  </section>}
              </TabsContent>

              {
    /* ── ACTIVITÉ ── */
  }
              <TabsContent value="activity" className="space-y-6">
                <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4">
                    Interactions récentes
                  </h3>
                  {(stats.booksRead || 0) === 0 && (stats.reviewsPosted || 0) === 0 ? <div className="surface rounded-2xl shadow-card border border-[var(--border-color)] p-8 text-center">
                      <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
                      <p className="text-muted text-sm">
                        Vos interactions (livres lus, avis, clubs) apparaîtront ici.
                      </p>
                    </div> : <div className="space-y-3">
                      {(stats.booksRead || 0) > 0 && <ActivityItem
    icon={BookOpen}
    title={`${stats.booksRead || 0} livre${(stats.booksRead || 0) > 1 ? "s" : ""} marqué${(stats.booksRead || 0) > 1 ? "s" : ""} comme lu`}
    description="Ces signaux alimentent votre vecteur de profil"
    color="accent"
  />}
                      {(stats.reviewsPosted || 0) > 0 && <ActivityItem
    icon={Star}
    title={`${stats.reviewsPosted || 0} avis publié${(stats.reviewsPosted || 0) > 1 ? "s" : ""}`}
    description={user.isMember ? "Chaque avis compte." : "Donnez votre avis sur vos lectures."}
    color="amber"
  />}
                      {participations.length > 0 && <div className="mt-6 space-y-4">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-muted mb-2">Événements à venir</h4>
                          {participations.map((p) => <div key={p.id} className="surface border border-[var(--border-color)] p-4 rounded-2xl shadow-card flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                  <p className="font-bold text-primary">{p.event_title}</p>
                                  <p className="text-xs text-muted">Inscrit le {new Date(p.date_inscription).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Confirmé</Badge>
                            </div>)}
                        </div>}
                      {(stats.clubsJoined || 0) > 0 && <ActivityItem
    icon={Users}
    title={`${stats.clubsJoined || 0} club${(stats.clubsJoined || 0) > 1 ? "s" : ""} rejoint`}
    description="Clubs de lecture CAEB"
    color="accent"
  />}
                    </div>}
                </section>

                {livresLus.length > 0 && <section>
                  <h3 className="font-display font-semibold text-lg text-primary mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-accent" />
                    Livres marqués comme lus ({livresLus.length})
                  </h3>
                  <div className="grid gap-3">
                    {livresLus.map((interaction) => {
                      const livre = interaction.livre;
                      return <div key={interaction.id} className="surface rounded-xl border border-[var(--border-color)] shadow-card hover:shadow-card-hover transition-shadow p-4 flex items-start gap-4">
                        {livre && <>
                          <ApiImage
    src={livre.couverture?.startsWith("/") || livre.couverture?.startsWith("http") ? livre.couverture : void 0}
    alt={livre.titre}
    fallback="/default_cover.png"
    className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
  />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-primary line-clamp-1">{livre.titre}</h4>
                            <p className="text-sm text-muted">{livre.auteur}</p>
                            <Badge className="mt-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Lu</Badge>
                          </div>
                        </>}
                      </div>;
                    })}
                  </div>
                </section>}

              </TabsContent>

              {
    /* ── PARAMÈTRES ── */
  }
              <TabsContent value="settings" className="space-y-3">
                <SettingItem icon={Edit3} title="Modifier mon profil" description="Nom, niveau, genre préféré, sous-genre" onClick={() => setIsEditing(true)} />
                <SettingItem icon={Bell} title="Notifications" description="Rappels de retour, livres disponibles" onClick={() => onNavigate("settings")} />
                <SettingItem icon={Shield} title="Confidentialité" description="Visibilité du profil et gestion des données" onClick={() => setShowPrivacy(true)} />
                <SettingItem icon={HelpCircle} title="Aide & Contact" description="FAQ, horaires et comment nous joindre" onClick={() => setShowHelp(true)} />

                {onToggleMemberStatus && <div className="pt-3 border-t border-[var(--border-color)]">
                    <p className="text-xs text-muted mb-2 px-1">Mode démonstration</p>
                    <Button
    onClick={onToggleMemberStatus}
    variant="outline"
    className="w-full border-[var(--library-accent)]/30 text-accent hover:bg-[var(--library-accent)]/10 font-semibold tap-feedback"
  >
                      <Crown className="w-4 h-4 mr-2" />
                      {user.isMember ? "Passer en mode Non-membre" : "Passer en mode Membre"}
                    </Button>
                  </div>}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {
    /* Modal d'édition */
  }
      {isEditing && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
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
                  <input
    type="text"
    value={formData.firstName}
    onChange={(e) => setFormData((f) => ({ ...f, firstName: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Nom</label>
                  <input
    type="text"
    value={formData.lastName}
    onChange={(e) => setFormData((f) => ({ ...f, lastName: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Pseudo</label>
                <input
    type="text"
    value={formData.pseudo}
    onChange={(e) => setFormData((f) => ({ ...f, pseudo: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Statut</label>
                  <select
    value={formData.educationLevel}
    onChange={(e) => setFormData((f) => ({ ...f, educationLevel: e.target.value, classe: "" }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  >
                    <option value="">Sélectionner...</option>
                    {educationLevels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {classesParNiveau[formData.educationLevel]?.length > 0 ? <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">Classe / Filière</label>
                    <select
    value={formData.classe}
    onChange={(e) => setFormData((f) => ({ ...f, classe: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  >
                      <option value="">Sélectionner...</option>
                      {classesParNiveau[formData.educationLevel].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {formData.classe === "Autre" && <input
    type="text"
    value={formData.classeCustom}
    onChange={(e) => setFormData((f) => ({ ...f, classeCustom: e.target.value }))}
    placeholder="Précisez votre classe/filière"
    className="w-full px-4 py-2 mt-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
    autoFocus
  />}
                  </div> : formData.educationLevel ? <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">
                      {["Professionnel", "Autre"].includes(formData.educationLevel) ? "Métier" : "Classe / Filière"}
                    </label>
                    <input
    type="text"
    value={formData.classe}
    onChange={(e) => setFormData((f) => ({ ...f, classe: e.target.value }))}
    placeholder={`Ex: ${["Professionnel", "Autre"].includes(formData.educationLevel) ? "Profession" : "Classe, Filière"}...`}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
                  </div> : null}
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-primary">Genres préférés</label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                    {genreList.map((g) => <button
    key={g}
    type="button"
    onClick={() => {
      const current = formData.genres || [];
      const updated = current.includes(g) ? current.filter((i) => i !== g) : [...current, g];
      setFormData((f) => ({ ...f, genres: updated, sous_genres: [] }));
    }}
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${formData.genres?.includes(g) ? "bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-sm" : "surface-alt text-primary border-[var(--border-color)] hover:border-[var(--library-accent)]/50"}`}
  >
                        {g}
                      </button>)}
                  </div>
                </div>

                {formData.genres?.length > 0 && <div className="space-y-2">
                    <label className="text-sm font-semibold text-primary">Sous-genres préférés</label>
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                      {formData.genres.flatMap((genre) => sousGenresParGenre[genre] || []).map((sg) => <button
    key={sg}
    type="button"
    onClick={() => {
      const current = formData.sous_genres || [];
      const updated = current.includes(sg) ? current.filter((i) => i !== sg) : [...current, sg];
      setFormData((f) => ({ ...f, sous_genres: updated }));
    }}
    className={`px-3 py-1.5 rounded-full text-sm transition-colors border ${formData.sous_genres?.includes(sg) ? "bg-[var(--library-accent)]/15 text-[var(--library-accent)] border-[var(--library-accent)]/30 font-medium" : "surface-alt text-muted border-[var(--border-color)] hover:border-[var(--library-accent)]/50"}`}
  >
                          {sg}
                        </button>)}
                    </div>
                  </div>}
                
                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <label className="text-sm font-semibold text-primary">Intention (Pourquoi avez-vous rejoint la CAEB ?)</label>
                  <div className="flex flex-wrap gap-2 p-1">
                    {intentionsList.map((intention) => <button
    key={intention}
    type="button"
    onClick={() => {
      const current = formData.intentions || [];
      const updated = current.includes(intention) ? current.filter((i) => i !== intention) : [...current, intention];
      setFormData((f) => ({ ...f, intentions: updated }));
    }}
    className={`px-3 py-1.5 rounded-xl text-sm transition-all border ${formData.intentions?.includes(intention) ? "bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-sm" : "surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
  >
                        {intention}
                      </button>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-3 bg-surface-alt">
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 font-bold">Annuler</Button>
              <Button onClick={handleSaveProfile} className="flex-1 btn-solid font-bold">Enregistrer les modifications</Button>
            </div>
          </div>
        </div>}

      {
    /* Modal Devenir Membre */
  }
      {isUpgrading && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-md rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-[var(--library-accent)]/10 rounded-full flex items-center justify-center mx-auto">
                <Crown className="w-10 h-10 text-accent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2">Devenir membre Premium</h2>
                <p className="text-muted leading-relaxed">
                  {bookCount ? `Accédez à l'emprunt illimité de nos ${bookCount} ouvrages, profitez d'échanges avec notre IA et participez à tous nos événements exclusifs.` : "Accédez à l'emprunt illimité de nos ouvrages, profitez d'échanges avec notre IA et participez à tous nos événements exclusifs."}
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
        </div>}

      {
    /* Modal Aide & Contact */
  }
      {showHelp && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
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
        </div>}

      {
    /* Modal Confidentialité */
  }
      {showPrivacy && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
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
        </div>}
    </div>;
}
