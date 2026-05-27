import { useState } from 'react';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onBack: () => void;
  onRegisterClick: () => void;
  isLoading: boolean;
}

export function LoginPage({ onLogin, onBack, onRegisterClick, isLoading }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { 
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    const success = await onLogin(email, password);
    if (!success) toast.error('Email ou mot de passe incorrect');
  };

  const inputClass =
    'w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all';

  return (
    <div className="min-h-screen bg-library-bg mesh-gradient-light dark:mesh-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 animate-pulse-soft pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Carte principale en verre */}
        <div className="glass-effect rounded-[2.5rem] shadow-elevated border border-white/10 overflow-hidden">

          {/* Header */}
          <div className="px-10 pt-10 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-accent/20 shadow-glow flex-shrink-0 bg-white p-1">
                <img src="/logo.jpg" alt="CAEB" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="caeb-brand text-xl tracking-[0.2em] font-bold">CAEB</span>
                </div>
                <span className="text-[10px] text-accent font-bold tracking-[0.3em] uppercase">Natitingou</span>
              </div>
            </div>
            <h1 className="font-display text-4xl font-bold mb-1">
              <span className="text-gradient">Connexion</span>
            </h1>
            <p className="text-muted text-sm font-medium">Accédez à l'excellence culturelle</p>
          </div>

          {/* Formulaire */}
          <div className="px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-primary">Adresse email</label>
                <Input
                  id="email" type="email" placeholder="vous@exemple.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-primary">Mot de passe</label>
                  <button type="button" className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity">
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-solid absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg shadow-soft"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit" disabled={isLoading}
                className="btn-solid w-full h-12 font-bold rounded-xl transition-all shadow-medium hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 sheen relative overflow-hidden"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </span>
                ) : 'Se connecter'}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 surface-alt border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-muted">
              Pas encore de compte ?{' '}
              <button onClick={onRegisterClick} className="text-accent font-bold hover:opacity-75 transition-opacity">
                S'inscrire gratuitement
              </button>
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-accent font-medium transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </button>

        {/* Note de démo supprimée car le système est maintenant réel */}
      </div>
    </div>
  );
}
