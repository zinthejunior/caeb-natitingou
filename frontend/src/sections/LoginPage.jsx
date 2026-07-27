/**
 * =============================================================================
 * PAGE DE CONNEXION (LoginPage.jsx) — Avec Récupération de Mot de Passe
 * =============================================================================
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, KeyRound, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthentification } from "@/hooks/useAuthentification";

export function LoginPage() {
  const { connexion, demandeResetMotDePasse, chargement: isLoading } = useAuthentification();
  const navigate = useNavigate();

  const onLogin = connexion;
  const onBack = () => navigate("/");
  const onRegisterClick = () => navigate("/register");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Modale de réinitialisation de mot de passe
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    const success = await onLogin(email, password);
    if (success) {
      toast.success("Connexion réussie ! Bienvenue");
      setTimeout(() => navigate("/home"), 1500);
    } else {
      toast.error("Email ou mot de passe incorrect");
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Veuillez saisir votre adresse email");
      return;
    }
    setSendingReset(true);
    const res = await demandeResetMotDePasse(resetEmail);
    setSendingReset(false);
    if (res.success) {
      setResetSent(true);
      toast.success("Email envoyé avec succès !");
    } else {
      toast.error(res.message || "Erreur lors de l'envoi de l'email");
    }
  };

  const inputClass = "w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all";

  return (
    <div className="min-h-screen bg-library-bg mesh-gradient-light dark:mesh-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 animate-pulse-soft pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="glass-effect rounded-[2.5rem] shadow-elevated border border-white/10 overflow-hidden">

          {/* En-tête */}
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
            <p className="text-muted text-sm font-medium">Accédez à l&apos;excellence culturelle</p>
          </div>

          {/* Formulaire de connexion */}
          <div className="px-8 py-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-primary">Adresse email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-primary">Mot de passe</label>
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity"
                    onClick={() => {
                      setResetEmail(email);
                      setResetSent(false);
                      setForgotModalOpen(true);
                    }}
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-14`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-solid absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg shadow-soft"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="btn-solid w-full h-12 font-bold rounded-xl transition-all shadow-medium hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 sheen relative overflow-hidden"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </span>
                ) : "Se connecter"}
              </Button>
            </form>
          </div>

          <div className="px-8 py-5 surface-alt border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-muted">
              Pas encore de compte ?{" "}
              <button onClick={onRegisterClick} className="text-accent font-bold hover:opacity-75 transition-opacity">
                S&apos;inscrire gratuitement
              </button>
            </p>
          </div>
        </div>

        <button
          onClick={onBack}
          className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-accent font-medium transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </button>
      </div>

      {/* Modal de récupération de mot de passe */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-scale-in text-left">
            <button
              onClick={() => setForgotModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!resetSent ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-2">
                  Mot de passe oublié ?
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  Saisissez l&apos;adresse email de votre compte. Nous vous enverrons un lien sécurisé pour créer un nouveau mot de passe.
                </p>

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="text-xs font-semibold text-slate-300">
                      Adresse email
                    </label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="vous@exemple.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sendingReset}
                    className="btn-solid w-full h-12 font-bold rounded-xl shadow-medium hover:shadow-elevated transition-all"
                  >
                    {sendingReset ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Envoi en cours...
                      </span>
                    ) : (
                      "Envoyer le lien de réinitialisation"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Vérifiez votre boîte mail
                </h3>
                <p className="text-sm text-slate-400 max-w-sm mx-auto">
                  Si l&apos;adresse <strong className="text-slate-200">{resetEmail}</strong> est enregistrée chez nous, vous recevrez un email contenant le lien pour réinitialiser votre mot de passe.
                </p>
                <div className="pt-2">
                  <Button
                    onClick={() => setForgotModalOpen(false)}
                    className="btn-solid w-full h-11 font-bold rounded-xl"
                  >
                    Fermer et retourner à la connexion
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
