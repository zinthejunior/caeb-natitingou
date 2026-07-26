/**
 * =============================================================================
 * PAGE DE CONNEXION (LoginPage.jsx)
 * =============================================================================
 * 
 * Cette page permet aux utilisateurs existants de se connecter à leur compte.
 * C'est un formulaire simple avec deux champs : email et mot de passe.
 * 
 * COMMENT ÇA MARCHE (flux de connexion) :
 * 1. L'utilisateur entre son email et mot de passe dans les champs
 * 2. Il clique sur "Se connecter" (ou appuie sur Entrée)
 * 3. Le formulaire envoie ces données au serveur backend (API Django)
 * 4. Le serveur vérifie les identifiants dans la base de données
 * 5. Si corrects : l'utilisateur reçoit un "token" JWT et est redirigé vers /home
 * 6. Si incorrects : un message d'erreur s'affiche
 *  
 * QU'EST-CE QU'UN TOKEN JWT ?
 * - C'est comme un "badge d'accès" numérique
 * - Il prouve que l'utilisateur est bien connecté
 * - Il est envoyé avec chaque requête au serveur
 * - Il expire après un certain temps (sécurité)
 * 
 * CONCEPTS REACT UTILISÉS :
 * - useState : pour gérer l'état local (email, password, showPassword)
 *   → Chaque fois que l'état change, React re-rend le composant
 * - useNavigate : pour naviguer vers d'autres pages sans recharger
 * - Formulaire contrôlé : la valeur des inputs est liée à l'état React
 *   → Permet de valider/transformer les données avant envoi
 * 
 * SÉCURITÉ IMPLÉMENTÉE :
 * - Le mot de passe peut être masqué/affiché (bouton œil)
 * - Les tokens JWT sont stockés de manière sécurisée (en mémoire, pas localStorage)
 * - Validation côté client avant envoi (champs non vides)
 * =============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION IMPORTS - Chargement des dépendances nécessaires
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * IMPORT : useState (React)
 * 
 * useState est un "hook" React fondamental.
 * Il permet de créer des variables qui, quand elles changent,
 * déclenchent automatiquement un nouveau rendu du composant.
 * 
 * Syntaxe : const [valeur, setValeur] = useState(valeurInitiale);
 * - valeur : la valeur actuelle
 * - setValeur : fonction pour modifier la valeur
 * - valeurInitiale : valeur au premier rendu
 */
import { useState } from "react";

/**
 * IMPORT : useNavigate (React Router)
 * 
 * Hook qui permet de naviguer programmatiquement vers d'autres pages.
 * Contrairement à un lien <a href="...">, il ne recharge pas la page.
 * 
 * Utilisation : const navigate = useNavigate();
 *               navigate("/home"); // va à la page /home
 */
import { useNavigate } from "react-router-dom";

/**
 * IMPORT : Icônes (Lucide React)
 * 
 * Lucide est une bibliothèque d'icônes SVG pour React.
 * Chaque icône est un composant qu'on peut styliser avec className.
 * 
 * - Eye : icône d'œil ouvert (afficher le mot de passe)
 * - EyeOff : icône d'œil barré (masquer le mot de passe)
 * - Loader2 : icône de chargement (spinner animé)
 * - ArrowLeft : flèche vers la gauche (bouton retour)
 */
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

/**
 * IMPORT : Button (Composant UI)
 * 
 * Composant bouton personnalisé avec des styles prédéfinis.
 * Supporte différentes variantes : primary, secondary, ghost, etc.
 * Le "@/" est un alias vers le dossier src/ (configuré dans vite.config.js)
 */
import { Button } from "@/components/ui/button";

/**
 * IMPORT : Input (Composant UI)
 * 
 * Composant champ de saisie personnalisé.
 * Déjà stylisé et accessible (attributs ARIA inclus).
 */
import { Input } from "@/components/ui/input";

/**
 * IMPORT : toast (Sonner)
 * 
 * Fonction pour afficher des notifications temporaires.
 * Types disponibles :
 * - toast.success("Message") : notification verte (succès)
 * - toast.error("Message") : notification rouge (erreur)
 * - toast.info("Message") : notification bleue (information)
 * - toast.warning("Message") : notification orange (avertissement)
 */
import { toast } from "sonner";

/**
 * IMPORT : useAuthentification (Hook personnalisé)
 * 
 * Notre hook qui gère toute la logique d'authentification.
 * Il fournit :
 * - connexion(email, password) : fonction asynchrone pour se connecter
 * - chargement : booléen indiquant si une requête est en cours
 * - utilisateur : données de l'utilisateur connecté (ou null)
 */
import { useAuthentification } from "@/hooks/useAuthentification";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL : LoginPage
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Composant LoginPage
 * 
 * C'est une fonction qui retourne du JSX (HTML + JavaScript).
 * En React, chaque composant est une fonction (ou classe) qui décrit
 * ce qui doit être affiché à l'écran.
 * 
 * Le mot-clé "export" permet d'utiliser ce composant dans d'autres fichiers.
 */
export function LoginPage() {
  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION : HOOKS - Initialisation des outils React
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Récupération des fonctions d'authentification depuis notre hook personnalisé.
   * 
   * Déstructuration : on extrait seulement ce dont on a besoin de l'objet retourné.
   * Le ":" permet de renommer une variable (chargement devient isLoading).
   */
  const { connexion, chargement: isLoading } = useAuthentification();
  
  /**
   * Initialisation du navigateur pour les redirections.
   * useNavigate() retourne une fonction qu'on stocke dans "navigate".
   */
  const navigate = useNavigate();
  
  /**
   * Alias de fonctions pour plus de clarté dans le code.
   * 
   * - onLogin : pointe vers la fonction connexion (plus explicite en anglais)
   * - onBack : fonction fléchée qui navigue vers la page d'accueil
   * - onRegisterClick : fonction fléchée qui navigue vers l'inscription
   * 
   * Les fonctions fléchées () => sont une syntaxe courte pour function() {}
   */
  const onLogin = connexion;
  const onBack = () => navigate("/");            // Retour à la landing page
  const onRegisterClick = () => navigate("/register"); // Vers inscription
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION : ÉTAT LOCAL - Variables qui déclenchent un re-rendu quand modifiées
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * État pour l'email saisi.
   * 
   * useState("") crée :
   * - email : la valeur actuelle (initialement une chaîne vide "")
   * - setEmail : fonction pour modifier email
   * 
   * Chaque appel à setEmail("nouvelle valeur") provoque un re-rendu du composant.
   */
  const [email, setEmail] = useState("");
  
  /**
   * État pour le mot de passe saisi.
   * Même principe que pour l'email.
   */
  const [password, setPassword] = useState("");
  
  /**
   * État pour afficher/masquer le mot de passe.
   * 
   * - false : mot de passe masqué (type="password" → affiche des •••)
   * - true : mot de passe visible (type="text" → affiche le texte)
   */
  const [showPassword, setShowPassword] = useState(false);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION : GESTIONNAIRES D'ÉVÉNEMENTS - Fonctions appelées lors d'actions
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Fonction handleSubmit : gère la soumission du formulaire.
   * 
   * "async" signifie que cette fonction contient des opérations asynchrones
   * (qui prennent du temps, comme un appel réseau).
   * 
   * Le paramètre "e" est l'événement de soumission du formulaire.
   */
  const handleSubmit = async (e) => {
    /**
     * e.preventDefault() empêche le comportement par défaut du formulaire.
     * 
     * Sans cette ligne, le navigateur rechargerait la page entière
     * lors de la soumission, perdant tout l'état de l'application !
     */
    e.preventDefault();
    
    /**
     * Validation côté client : vérifie que les champs ne sont pas vides.
     * 
     * L'opérateur "!" (not) inverse un booléen.
     * Une chaîne vide "" est "falsy" en JavaScript, donc !email est true si email est vide.
     * 
     * Si un champ est vide, on affiche une erreur et on arrête la fonction avec "return".
     */
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return; // Sort de la fonction, le code après n'est pas exécuté
    }
    
    /**
     * Appel à l'API de connexion.
     * 
     * "await" met la fonction en pause jusqu'à ce que la promesse soit résolue.
     * Sans await, le code continuerait sans attendre la réponse du serveur.
     * 
     * onLogin retourne true si connexion réussie, false sinon.
     */
    const success = await onLogin(email, password);
    
    /**
     * Gestion du résultat de la connexion.
     */
    if (success) {
      // Connexion réussie : afficher un message de succès
      toast.success("Connexion réussie ! Bienvenue");
      
      /**
       * Redirection vers /home après 1.5 seconde.
       * 
       * setTimeout(fonction, délai) exécute la fonction après le délai (en ms).
       * Cela laisse le temps à l'utilisateur de voir le message de succès.
       */
      setTimeout(() => navigate("/home"), 1500);
    } else {
      // Échec : afficher un message d'erreur
      toast.error("Email ou mot de passe incorrect");
    }
  };
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION : STYLES - Classes CSS réutilisables
  // ─────────────────────────────────────────────────────────────────────────────
  
  /**
   * Classes Tailwind CSS pour les champs de saisie.
   * 
   * Tailwind utilise des classes utilitaires qui appliquent chacune un style précis :
   * - w-full : largeur 100% du conteneur parent
   * - h-12 : hauteur de 3rem (48px)
   * - px-4 : padding horizontal de 1rem
   * - surface-alt : couleur de fond personnalisée (définie dans globals.css)
   * - border : bordure de 1px
   * - border-[var(--border-color)] : couleur de bordure personnalisée (CSS variable)
   * - rounded-xl : coins arrondis (12px)
   * - text-primary : couleur de texte principale
   * - placeholder:text-muted : couleur du placeholder
   * - focus:border-[...] : style au focus (quand le champ est actif)
   * - focus:ring-2 : anneau de focus de 2px
   * - transition-all : animation douce pour tous les changements
   */
  const inputClass = "w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all";
  // ─── RENDU JSX ─────────────────────────────────────────────────────────────
  // Le JSX est une syntaxe qui permet d'écrire du HTML dans JavaScript
  // Les accolades {} permettent d'insérer des expressions JavaScript
  
  return <div className="min-h-screen bg-library-bg mesh-gradient-light dark:mesh-gradient-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Effet visuel d'arrière-plan animé */}
      <div className="absolute inset-0 bg-accent/5 animate-pulse-soft pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* ─── CARTE PRINCIPALE (effet verre) ───────────────────────────────── */}
        <div className="glass-effect rounded-[2.5rem] shadow-elevated border border-white/10 overflow-hidden">

          {/* ─── EN-TÊTE : Logo et titre ─────────────────────────────────────── */}
          <div className="px-10 pt-10 pb-6 border-b border-white/5">
            <div className="flex items-center gap-4 mb-6">
              {/* Logo de la bibliothèque */}
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

          {/* ─── FORMULAIRE DE CONNEXION ─────────────────────────────────────── */}
          <div className="px-8 py-7">
            {/* 
              onSubmit : fonction appelée quand le formulaire est soumis
              Peut être déclenché par le bouton ou par la touche Entrée
            */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Champ Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-primary">Adresse email</label>
                {/* 
                  Input contrôlé : la valeur est liée à l'état 'email'
                  onChange met à jour l'état à chaque frappe
                */}
                <Input
    id="email"
    type="email"
    placeholder="vous@exemple.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={inputClass}
  />
              </div>

              {/* Champ Mot de passe avec bouton afficher/masquer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-semibold text-primary">Mot de passe</label>
                  <button
    type="button"
    className="text-xs font-semibold text-accent hover:opacity-75 transition-opacity"
    onClick={() => toast("Fonctionnalité de récupération de mot de passe à venir.")}
  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  {/* 
                    type dynamique : "text" si showPassword est true, sinon "password"
                    Cela permet d'afficher ou masquer le mot de passe
                  */}
                  <Input
    id="password"
    type={showPassword ? "text" : "password"}
    placeholder="••••••••"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className={`${inputClass} pr-14`}
  />
                  {/* Bouton pour basculer la visibilité du mot de passe */}
                  <button
    type="button"
    aria-label={showPassword ? "Masquer" : "Afficher"}
    onClick={() => setShowPassword(!showPassword)}
    className="btn-solid absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg shadow-soft"
  >
                    {/* Icône qui change selon l'état */}
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bouton de soumission */}
              <Button
    type="submit"
    disabled={isLoading}
    className="btn-solid w-full h-12 font-bold rounded-xl transition-all shadow-medium hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-60 disabled:translate-y-0 sheen relative overflow-hidden"
  >
                {/* Affichage conditionnel : spinner si chargement, sinon texte */}
                {isLoading ? <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </span> : "Se connecter"}
              </Button>
            </form>
          </div>

          {/* ─── PIED DE PAGE : Lien vers inscription ────────────────────────── */}
          <div className="px-8 py-5 surface-alt border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-muted">
              Pas encore de compte ?{" "}
              <button onClick={onRegisterClick} className="text-accent font-bold hover:opacity-75 transition-opacity">
                S&apos;inscrire gratuitement
              </button>
            </p>
          </div>
        </div>

        {/* Bouton retour vers la page d'accueil */}
        <button
    onClick={onBack}
    className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-accent font-medium transition-colors py-2"
  >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </button>
      </div>
    </div>;
}
