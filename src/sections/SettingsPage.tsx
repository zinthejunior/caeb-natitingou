// SettingsPage.tsx — Système de Design CAEB
import { Settings, Moon, Sun, Bell, Lock, LogOut, X, Eye, EyeOff } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { useState } from 'react';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface SettingsPageProps {
  user: User | null;
  onLogout: () => void;
  onChangePassword?: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const Toggle = ({ active, onToggle }: { active: boolean; onToggle: () => void }) => (
  <button onClick={onToggle} aria-pressed={active}
    className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)] focus:ring-offset-2 ${active ? 'bg-[var(--library-accent)]' : 'bg-[var(--border-color)]'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-soft transition-transform duration-300 ${active ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const SectionTitle = ({ icon: Icon, title }: { icon?: React.ElementType; title: string }) => (
  <h2 className="text-xl font-bold text-primary mb-6 flex items-center gap-2.5">
    {Icon ? <Icon className="w-5 h-5 text-accent" /> : <span className="w-4 h-4 rounded bg-[var(--library-accent)]" />}
    {title}
  </h2>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between p-4 surface-alt rounded-xl border border-[var(--border-color)]">
    <div>
      <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-primary font-semibold">{value}</p>
    </div>
  </div>
);

const ToggleRow = ({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) => (
  <div className="flex items-center justify-between p-4 surface-alt rounded-xl border border-[var(--border-color)]">
    <span className="font-semibold text-primary">{label}</span>
    <Toggle active={active} onToggle={onToggle} />
  </div>
);

export function SettingsPage({ user, onLogout, onChangePassword }: SettingsPageProps) {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('caeb_settings_notifications');
    return saved === null ? true : saved === 'true';
  });
  const [emailNotifications, setEmailNotifications] = useState(() => {
    const saved = localStorage.getItem('caeb_settings_email');
    return saved === null ? true : saved === 'true';
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  
  const { isInstallable, promptInstall } = usePWAInstall();

  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('caeb_theme', next ? 'dark' : 'light');
    toast.success(next ? 'Mode sombre activé' : 'Mode clair activé');
  };

  const handleLogout = () => { toast.success('À bientôt !'); onLogout(); };
  const handleSaveSettings = () => {
    localStorage.setItem('caeb_settings_notifications', String(notifications));
    localStorage.setItem('caeb_settings_email', String(emailNotifications));
    toast.success('Paramètres enregistrés avec succès !');
  };

  const handleUpdatePassword = async () => {
    if (passData.new !== passData.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (passData.new.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (!onChangePassword) {
      toast.error('Fonctionnalité indisponible');
      return;
    }
    const toastId = toast.loading('Mise à jour du mot de passe...');
    const success = await onChangePassword(passData.old, passData.new);
    toast.dismiss(toastId);
    if (success) {
      toast.success('Mot de passe mis à jour avec succès');
      setIsChangingPassword(false);
      setPassData({ old: '', new: '', confirm: '' });
    } else {
      toast.error('Ancien mot de passe incorrect');
    }
  };

  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} sera disponible prochainement.`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-library-bg pb-24">
        <Navbar user={user} />
        <main className="max-w-4xl mx-auto px-4 py-8 pt-24">
          <div className="surface rounded-2xl p-8 text-center border border-[var(--border-color)]">
            <p className="text-muted">Veuillez vous connecter pour accéder aux paramètres</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-library-bg pb-24">
      <Navbar user={user} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--library-accent)]/10 border border-[var(--library-accent)]/20 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-primary">Paramètres</h1>
          </div>
          <p className="text-muted pl-1">Personnalisez votre expérience et gérez votre compte</p>
        </div>

        <div className="space-y-5">
          {/* Compte */}
          <section className="surface rounded-2xl p-6 shadow-card border border-[var(--border-color)]">
            <SectionTitle title="Informations du compte" />
            <div className="space-y-3">
              <InfoRow label="Nom d'utilisateur" value={`${user.firstName} ${user.lastName}`} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Statut" value={
                <Badge className={user.isMember
                  ? 'bg-[var(--library-accent)]/15 text-accent border border-[var(--library-accent)]/30'
                  : 'surface-weak text-muted border border-[var(--border-color)]'}>
                  {user.isMember ? '✦ Premium' : 'Gratuit'}
                </Badge>
              } />
            </div>
          </section>

          {/* Apparence */}
          <section className="surface rounded-2xl p-6 shadow-card border border-[var(--border-color)]">
            <SectionTitle title="Apparence" />
            <button onClick={handleToggleDarkMode}
              className="w-full flex items-center justify-between p-4 surface-alt rounded-xl border border-[var(--border-color)] hover:border-[var(--library-accent)]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]">
              <div className="flex items-center gap-3">
                {darkMode
                  ? <Moon className="w-5 h-5 text-accent" />
                  : <Sun className="w-5 h-5 text-accent" />}
                <div className="text-left">
                  <p className="font-semibold text-primary">Mode sombre</p>
                  <p className="text-xs text-muted">{darkMode ? 'Palette Chocolat & Or — activé' : 'Palette Bleu & Blanc — activé'}</p>
                </div>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${darkMode ? 'bg-[var(--library-accent)]' : 'bg-[var(--border-color)]'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-soft transition-transform duration-300 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
            
            {isInstallable && (
              <button onClick={promptInstall}
                className="w-full mt-3 flex items-center justify-between p-4 bg-[var(--library-accent)]/10 rounded-xl border border-[var(--library-accent)]/30 hover:bg-[var(--library-accent)]/20 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--library-accent)]">
                <div className="flex items-center gap-3">
                  <div className="text-left text-accent">
                    <p className="font-bold">Installer l'application (PWA)</p>
                    <p className="text-xs opacity-90">Accédez à la bibliothèque directement depuis votre écran d'accueil.</p>
                  </div>
                </div>
              </button>
            )}
          </section>

          {/* Notifications */}
          <section className="surface rounded-2xl p-6 shadow-card border border-[var(--border-color)]">
            <SectionTitle icon={Bell} title="Notifications" />
            <div className="space-y-3">
              <ToggleRow label="Notifications dans l'app" active={notifications} onToggle={() => setNotifications(!notifications)} />
              <ToggleRow label="Notifications par email" active={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />
            </div>
          </section>

          {/* Sécurité */}
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
                onClick={() => handleComingSoon('La gestion des appareils')}
                variant="outline" 
                className="w-full justify-start gap-2 border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/30 font-semibold"
              >
                Appareils connectés
              </Button>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleSaveSettings}
              className="btn-solid flex-1 font-bold shadow-medium hover:shadow-elevated hover:-translate-y-0.5 transition-all sheen relative overflow-hidden">
              Enregistrer les paramètres
            </Button>
            <Button onClick={handleLogout} variant="destructive"
              className="flex-1 gap-2 font-bold hover:-translate-y-0.5 transition-all">
              <LogOut className="w-4 h-4" />Se déconnecter
            </Button>
          </div>
        </div>
      </main>

      {/* Modal Changement de Mot de Passe */}
      {isChangingPassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
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
                  <input type={showPass ? "text" : "password"} value={passData.old} onChange={e => setPassData(p => ({...p, old: e.target.value}))}
                    className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
                  <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-2.5 text-muted hover:text-primary">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Nouveau mot de passe</label>
                <input type={showPass ? "text" : "password"} value={passData.new} onChange={e => setPassData(p => ({...p, new: e.target.value}))}
                  className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-primary">Confirmer le nouveau mot de passe</label>
                <input type={showPass ? "text" : "password"} value={passData.confirm} onChange={e => setPassData(p => ({...p, confirm: e.target.value}))}
                  className="w-full px-4 py-2 surface border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-accent/20 outline-none" />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] flex gap-3 bg-surface-alt">
              <Button onClick={() => setIsChangingPassword(false)} variant="outline" className="flex-1 font-bold">Annuler</Button>
              <Button onClick={handleUpdatePassword} className="flex-1 btn-solid font-bold">Mettre à jour</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
