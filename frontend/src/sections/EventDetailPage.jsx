import { ChevronLeft, Calendar, MapPin, Users, Clock, Share2, Bell, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEvent, useClubs, sinscrireEvenementDetaillee } from "@/hooks/useData";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSEO } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useNavigate } from "react-router-dom";
export function EventDetailPage({ user }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event, isLoading: isEventLoading } = useEvent(eventId);
  const { clubs, chargement: isClubsLoading } = useClubs();
  const [isParticipating, setIsParticipating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nom_complet: "",
    email: "",
    telephone: "",
    motivations: ""
  });
  useEffect(() => {
    if (event) setIsParticipating(event.isParticipating || false);
    if (user) {
      setFormData((prev) => ({
        ...prev,
        nom_complet: `${user.firstName || user.prenom || ""} ${user.lastName || user.nom || ""}`.trim(),
        email: user.email || "",
        telephone: user.telephone || ""
      }));
    }
  }, [event, user]);
  useSEO(event?.title || "Événement Culturel", event?.description || "Participez à nos événements culturels à la bibliothèque CAEB Natitingou.");
  if (isEventLoading || isClubsLoading) return <div className="min-h-screen bg-library-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>;
  if (!event) {
    return <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-accent mb-6 hover:opacity-75 font-semibold transition-opacity">
            <ChevronLeft className="w-5 h-5" />Retour
          </button>
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Événement non trouvé</p>
          </div>
        </main>
      </div>;
  }
  const eventDate = new Date(event.date);
  const club = event.clubId ? clubs.find((c) => c.id === event.clubId) : null;
  const handleParticipate = () => {
    if (isParticipating) {
      toast.info("Veuillez contacter la bibliothèque pour annuler votre inscription.");
      return;
    }
    setShowForm(true);
  };
  const submitParticipation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sinscrireEvenementDetaillee(eventId, formData);
      setIsParticipating(true);
      setShowForm(false);
      toast.success("Inscription confirmée !", {
        description: "Votre participation a été enregistrée avec succès. À très bientôt !"
      });
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };
  const typeConfig = {
    club: { label: "Club de lecture", class: "bg-[var(--library-accent)]/10 text-accent border-[var(--library-accent)]/20" },
    conference: { label: "Conférence", class: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
    workshop: { label: "Atelier", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" }
  };
  const type = typeConfig[event.type] || typeConfig.club;
  const infoItems = [
    { icon: Calendar, label: "Date", value: eventDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) },
    { icon: Clock, label: "Heure", value: event.time },
    { icon: MapPin, label: "Lieu", value: event.location },
    { icon: Users, label: "Participants", value: `${event.participantCount} inscrits` }
  ];
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-accent mb-8 hover:scale-105 transition-all focus:outline-none group">
          <div className="w-10 h-10 glass-effect rounded-xl flex items-center justify-center border border-white/10 shadow-glow">
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">Retour aux événements</span>
          <span className="font-bold text-lg sm:hidden">Retour</span>
        </button>

        <div className="glass-effect rounded-[2.5rem] overflow-hidden shadow-card border border-white/10 animate-flow-in">
          {
    /* Visuel Premium */
  }
          <div className="w-full h-64 md:h-96 mesh-gradient-dark flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/5 animate-pulse-soft" />
            <div className="text-center relative z-10">
              <div className="w-24 h-24 bg-accent/20 border-2 border-accent/30 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-glow transform rotate-3">
                <Calendar className="w-12 h-12 text-accent" />
              </div>
              <p className="text-accent font-black tracking-[0.2em] uppercase text-sm">{type.label}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-10">
              <div>
                <Badge className={`text-xs font-black px-4 py-1.5 border mb-4 uppercase tracking-widest ${type.class}`}>{type.label}</Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-3">
                  <span className="text-gradient">{event.title}</span>
                </h1>
                {club && <p className="text-lg text-muted font-medium">
                    Organisé par <span className="text-accent font-bold">{club.name}</span>
                  </p>}
              </div>
              <Button
    onClick={() => toast.success("Lien d'événement copié !")}
    variant="outline"
    className="glass-effect gap-3 flex-shrink-0 border-white/10 text-primary hover:border-accent/30 font-bold h-12 px-6 rounded-2xl"
  >
                <Share2 className="w-5 h-5" />
                <span>Partager</span>
              </Button>
            </div>

            {
    /* Détails Modernisés */
  }
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 p-6 glass-effect rounded-[2rem] border border-white/5">
              {infoItems.map((item) => <div key={item.label} className="flex items-center gap-4 group">
                  <div className="p-3 bg-accent/10 rounded-xl group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-accent flex-shrink-0" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em] mb-0.5">{item.label}</p>
                    <p className="text-primary font-bold text-lg">{item.value}</p>
                  </div>
                </div>)}
            </div>

            {
    /* Description */
  }
            <div className="mb-8">
              <h2 className="text-xl font-bold text-primary mb-3">À propos de cet événement</h2>
              <p className="text-muted leading-relaxed">{event.description}</p>
            </div>

            {
    /* CTA */
  }
            <Button
    onClick={handleParticipate}
    className={`w-full md:w-auto gap-2 font-bold ${isParticipating ? "border border-[var(--library-accent)]/30 text-accent bg-[var(--library-accent)]/10 hover:bg-[var(--library-accent)]/15" : "btn-solid shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden"}`}
    variant={isParticipating ? "outline" : "default"}
  >
              {isParticipating ? <><Check className="w-4 h-4" />Vous êtes inscrit(e)</> : <><Bell className="w-4 h-4" />Je participe à cet événement</>}
            </Button>
          </div>
        </div>
      </main>

      {
    /* Formulaire d'inscription */
  }
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px] glass-effect border-white/10 p-0 overflow-hidden rounded-[2.5rem]">
          <div className="mesh-gradient-dark p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-accent/5 animate-pulse-soft" />
            <DialogHeader className="relative z-10">
              <div className="w-16 h-16 bg-accent/20 border-2 border-accent/30 rounded-2xl flex items-center justify-center mb-4 shadow-glow">
                <Bell className="w-8 h-8 text-accent" />
              </div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">Inscription à l'événement</DialogTitle>
              <DialogDescription className="text-white/60 font-medium">
                Complétez vos informations pour finaliser votre participation à <span className="text-accent">{event.title}</span>.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={submitParticipation} className="p-8 space-y-6 bg-library-bg">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted">Nom Complet</Label>
                <Input
    id="name"
    value={formData.nom_complet}
    onChange={(e) => setFormData({ ...formData, nom_complet: e.target.value })}
    required
    placeholder="Ex: Jean Dupont"
    className="surface border-white/10 h-12 rounded-xl focus:border-accent/50"
  />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted">Email</Label>
                  <Input
    id="email"
    type="email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    required
    placeholder="jean@exemple.com"
    className="surface border-white/10 h-12 rounded-xl focus:border-accent/50"
  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel" className="text-xs font-black uppercase tracking-widest text-muted">Téléphone</Label>
                  <Input
    id="tel"
    value={formData.telephone}
    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
    required
    placeholder="+229 ..."
    className="surface border-white/10 h-12 rounded-xl focus:border-accent/50"
  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motiv" className="text-xs font-black uppercase tracking-widest text-muted">Vos attentes / motivations</Label>
                <Textarea
    id="motiv"
    value={formData.motivations}
    onChange={(e) => setFormData({ ...formData, motivations: e.target.value })}
    placeholder="Pourquoi souhaitez-vous participer ?"
    className="surface border-white/10 min-h-[100px] rounded-xl focus:border-accent/50 resize-none"
  />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl font-bold">Annuler</Button>
              <Button type="submit" disabled={isSubmitting} className="btn-solid min-w-[150px] shadow-glow rounded-xl font-bold">
                {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Envoi...</> : "Confirmer l'inscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>;
}
