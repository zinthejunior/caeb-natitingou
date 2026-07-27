/**
 * =============================================================================
 * PAGE DE RÉINITIALISATION DE MOT DE PASSE (ResetPasswordPage.jsx)
 * =============================================================================
 * Cette page est accédée via le lien reçu par email :
 * /reset-password?token=...&email=...
 * =============================================================================
 */

import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuthentification } from "@/hooks/useAuthentification";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const { reinitialiserMotDePasse } = useAuthentification();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = "w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await reinitialiserMotDePasse(email, token, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      toast.success("Mot de passe réinitialisé avec succès !");
    } else {
      toast.error(res.message || "Lien invalide ou expiré.");
    }
  };

  const isInvalidLink = !token || !email;

  return (
    <div className="min-h-screen bg-library-bg mesh-gradient-light dark:mesh-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 animate-pulse-soft pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        <div className="glass-effect rounded-[2.5rem] shadow-elevated border border-white/10 overflow-hidden">
          {/* Header */}
          <div className="px-10 pt-10 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <span className="caeb-brand text-lg tracking-[0.2em] font-bold">CAEB</span>
                <span className="block text-[10px] text-accent font-bold tracking-[0.3em] uppercase">Natitingou</span>
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold">
              <span className="text-gradient">Nouveau mot de passe</span>
            </h1>
            <p className="text-muted text-xs sm:text-sm font-medium mt-1">
              Créer un mot de passe sécurisé pour votre compte
            </p>
          </div>

          <div className="px-8 py-7">
            {isInvalidLink ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-primary">Lien invalide ou expiré</h3>
                <p className="text-xs text-muted">
                  Ce lien de réinitialisation est incomplet ou expiré. Veuillez refaire une demande de mot de passe oublié.
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="btn-solid w-full h-11 font-bold rounded-xl mt-4"
                >
                  Retour à la connexion
                </Button>
              </div>
            ) : success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-primary">
                  Mot de passe modifié !
                </h3>
                <p className="text-sm text-muted">
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="btn-solid w-full h-12 font-bold rounded-xl mt-4"
                >
                  Se connecter maintenant →
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="new-pass" className="text-xs font-semibold text-primary">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`${inputClass} pr-12`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-pass" className="text-xs font-semibold text-primary">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    id="confirm-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="btn-solid w-full h-12 font-bold rounded-xl mt-2 transition-all shadow-medium hover:shadow-elevated"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mise à jour...
                    </span>
                  ) : (
                    "Réinitialiser le mot de passe"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
