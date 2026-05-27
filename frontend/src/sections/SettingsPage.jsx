import { Settings, Moon, Sun, Bell, Lock, LogOut, X, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useSEO } from "@/lib/utils";
const Toggle = ({ active, onToggle }) => <button
  onClick={onToggle}
  aria-pressed={active}
  className={`relative w-12 h-7 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-accent/20 ${active ? "bg-accent shadow-glow" : "bg-white/10"}`}
>
    <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-medium transition-transform duration-500 ${active ? "translate-x-5" : "translate-x-0"}`} />
  </button>;
const SectionTitle = ({ icon: Icon, title }) => <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
    {Icon ? <div className="p-2 bg-accent/10 rounded-xl border border-accent/20 shadow-glow">
        <Icon className="w-5 h-5 text-accent" />
      </div> : <div className="w-2 h-8 bg-accent rounded-full shadow-glow" />}
    <span className="text-gradient">{title}</span>
  </h2>;
const InfoRow = ({ label, value }) => <div className="flex items-center justify-between p-4 surface-alt rounded-xl border border-[var(--border-color)]">
    <div>
      <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-primary font-semibold">{value}</p>
    </div>
  </div>;
const ToggleRow = ({ label, active, onToggle }) => <div className="flex items-center justify-between p-5 glass-effect rounded-2xl border border-white/5 hover:border-accent/20 transition-all duration-300">
    <span className="font-bold text-primary">{label}</span>
    <Toggle active={active} onToggle={onToggle} />
  </div>;
export function SettingsPage({ user, onLogout, onChangePassword }) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("caeb_settings_notifications");
    return saved === null ? true : saved === "true";
  });
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem("caeb_settings_email");
    return saved === null ? true : saved === "true";
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passData, setPassData] = useState({ old: "", new: "", confirm: "" });
  const { isInstallable, promptInstall } = usePWAInstall();
  useSEO("Paramètres", "Personnalisez votre compte, gérez vos notifications et choisissez votre thème préféré sur CAEB Natitingou.");
  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("caeb_theme", next ? "dark" : "light");
    toast.success(next ? "Mode sombre activé" : "Mode clair activé");
  };
  const handleLogout = () => {
    toast.success("À bientôt !");
    onLogout();
  };
  const handleSaveSettings = () => {
    localStorage.setItem("caeb_settings_notifications", String(notifications));
    localStorage.setItem("caeb_settings_email", String(emailNotifications));
    toast.success("Paramètres enregistrés avec succès !");
  };
  const handleUpdatePassword = async () => {
    if (passData.new !== passData.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (passData.new.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }
    if (!onChangePassword) {
      toast.error("Fonctionnalité indisponible");
      return;
    }
    const toastId = toast.loading("Mise à jour du mot de passe...");
    const success = await onChangePassword(passData.old, passData.new);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Mot de passe mis à jour avec succès");
      setIsChangingPassword(false);
      setPassData({ old: "", new: "", confirm: "" });
    } else {
      toast.error("Ancien mot de passe incorrect");
    }
  };
  const handleComingSoon = (feature) => {
    toast.info(`${feature} sera disponible prochainement.`);
  };
  if (!user) {
    return <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Veuillez vous connecter pour accéder aux paramètres</p>
          </div>
        </main>
      </div>;
  }
  return <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center shadow-glow">
              <Settings className="w-6 h-6 text-accent" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold">
              <span className="text-gradient">Paramètres</span>
            </h1>
          </div>
          <p className="text-muted text-lg pl-1 font-medium">Configurez votre expérience au sein de l'excellence culturelle.</p>
        </div>

        <div className="space-y-5">
          {
    /* Compte */
  }
          <section className="glass-effect rounded-[2.5rem] p-8 shadow-card border border-white/5 animate-flow-in">
            <SectionTitle title="Informations du compte" />
            <div className="space-y-4">
              <InfoRow label="Identité" value={`${user.firstName} ${user.lastName}`} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Statut" value={<Badge className={user.isMember ? "bg-[var(--library-accent)]/15 text-accent border border-[var(--library-accent)]/30" : "surface-weak text-muted border border-[var(--border-color)]"}>
                  {user.isMember ? "✦ Premium" : "Gratuit"}
                </Badge>} />
            </div>
          </section>

          {
    /* Apparence */
  }
          <section className="glass-effect rounded-[2.5rem] p-8 shadow-card border border-white/5 animate-flow-in" style={{ animationDelay: "100ms" }}>
            <SectionTitle title="Apparence" />
            <button
    onClick={handleToggleDarkMode}
    className="w-full flex items-center justify-between p-5 glass-effect rounded-2xl border border-white/5 hover:border-accent/30 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-accent/20"
  >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${darkMode ? "bg-accent/20" : "bg-blue-500/10"}`}>
                  {darkMode ? <Moon className="w-6 h-6 text-accent" /> : <Sun className="w-6 h-6 text-blue-500" />}
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">Mode d'affichage</p>
                  <p className="text-xs text-muted font-medium">{darkMode ? "Thème Midnight Gold — actif" : "Thème Clair Saphir — actif"}</p>
                </div>
              </div>
              <Toggle active={darkMode} onToggle={() => {
  }} />
            </button>
            
            {isInstallable && <button
    onClick={promptInstall}
    className="w-full mt-3 flex items-center justify-between p-4 bg-[var(--library-accent)]/10 rounded-xl border border-[var(--library-accent)]/30 hover:bg-[var(--library-accent)]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]"
  >
                <div className="flex items-center gap-3">
                  <div className="text-left text-accent">
                    <p className="font-bold">Installer l'application (PWA)</p>
                    <p className="text-xs opacity-90">Accédez à la bibliothèque directement depuis votre écran d'accueil.</p>
                  </div>
                </div>
              </button>}
          </section>

          {
    /* Notifications */
  }
          <section className="surface rounded-2xl p-6 shadow-card border border-[var(--border-color)]">
            <SectionTitle icon={Bell} title="Notifications" />
            <div className="space-y-3">
              <ToggleRow label="Notifications dans l'app" active={notifications} onToggle={() => setNotifications(!notifications)} />
              <ToggleRow label="Notifications par email" active={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />
            </div>
          </section>

          {
    /* Sécurité */
  }
          <section className="surface rounded-2xl p-6 shadow-card border border-[var(--border-color)]">
            <SectionTitle icon={Lock} title="Sécurité" />
            <div className="space-y-3">
              <Button
    onClick={() => setIsChangingPassword(true)}
    variant="outline"
    className="w-full justify-start gap-2 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold"
  >
                <Lock className="w-4 h-4 text-accent flex-shrink-0" />Changer le mot de passe
              </Button>
              <Button
    onClick={() => handleComingSoon("La gestion des appareils")}
    variant="outline"
    className="w-full justify-start gap-2 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold"
  >
                Appareils connectés
              </Button>
            </div>
          </section>

          {
    /* Actions */
  }
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
    onClick={handleSaveSettings}
    className="btn-solid flex-1 font-bold shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden"
  >
              Enregistrer les paramètres
            </Button>
            <Button
    onClick={handleLogout}
    variant="destructive"
    className="flex-1 gap-2 font-bold hover:-translate-y-0.5 transition-all"
  >
              <LogOut className="w-4 h-4" />Se déconnecter
            </Button>
          </div>
        </div>
      </main>

      {
    /* Modal Changement de Mot de Passe */
  }
      {isChangingPassword && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="surface w-full max-w-md rounded-2xl shadow-elevated border border-[var(--border-color)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between bg-surface-alt">
              <h2 className="text-xl font-bold text-primary">Changer le mot de passe</h2>
              <button onClick={() => setIsChangingPassword(false)} className="p-2 hover:bg-surface-weak rounded-full transition-colors text-muted hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Ancien mot de passe</label>
                <div className="relative">
                  <input
    type={showPass ? "text" : "password"}
    value={passData.old}
    onChange={(e) => setPassData((p) => ({ ...p, old: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted hover:text-primary">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Nouveau mot de passe</label>
                <input
    type={showPass ? "text" : "password"}
    value={passData.new}
    onChange={(e) => setPassData((p) => ({ ...p, new: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Confirmer le nouveau mot de passe</label>
                <input
    type={showPass ? "text" : "password"}
    value={passData.confirm}
    onChange={(e) => setPassData((p) => ({ ...p, confirm: e.target.value }))}
    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none"
  />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-3 bg-surface-alt">
              <Button onClick={() => setIsChangingPassword(false)} variant="outline" className="flex-1 font-bold">Annuler</Button>
              <Button onClick={handleUpdatePassword} className="flex-1 btn-solid font-bold">Mettre à jour</Button>
            </div>
          </div>
        </div>}
    </div>;
}
