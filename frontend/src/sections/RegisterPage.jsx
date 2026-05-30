/**
 * =============================================================================
 * PAGE D'INSCRIPTION (RegisterPage)
 * =============================================================================
 * 
 * Cette page permet aux nouveaux utilisateurs de créer un compte.
 * L'inscription se fait en 3 étapes (wizard) :
 * 
 * ÉTAPE 1 - Identifiants :
 * - Email (vérifié en temps réel pour éviter les doublons)
 * - Mot de passe et confirmation
 * 
 * ÉTAPE 2 - Informations personnelles :
 *   (accessible seulement si l'email est valide et le compte n'existe pas encore)
 * - Prénom et nom
 * - Date de naissance (optionnel)
 * - Niveau d'études et classe
 * 
 * ÉTAPE 3 - Préférences de lecture :
 * - Genres littéraires préférés
 * - Sous-genres
 * - Intentions (pourquoi rejoindre la bibliothèque)
 * - Acceptation des conditions d'utilisation
 * 
 * CONCEPTS REACT UTILISÉS :
 * - useState : gestion de l'état du formulaire multi-étapes
 * - Formulaire contrôlé : chaque input est lié à l'état
 * - Validation côté client : vérifications avant envoi
 * - Navigation conditionnelle : affichage selon l'étape actuelle
 * =============================================================================
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, ChevronRight, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { genreList, educationLevels, classesParNiveau, intentionsList } from "@/data/constants";
import { useAuthentification } from "@/hooks/useAuthentification";

export function RegisterPage() {
  // ─── HOOKS ─────────────────────────────────────────────────────────────────
  const { inscription, verifierEmail, chargement: isLoading } = useAuthentification();
  const navigate = useNavigate();
  const onRegister = inscription;
  const onBack = () => navigate("/");
  const onLoginClick = () => navigate("/login");
  
  // ─── ÉTAT DU WIZARD (étape actuelle) ───────────────────────────────────────
  const [step, setStep] = useState(1); // Étape 1, 2 ou 3
  
  // ─── ÉTAT DU FORMULAIRE ────────────────────────────────────────────────────
  // Toutes les données saisies par l'utilisateur
  const [formData, setFormData] = useState({
    // Étape 1 : Identifiants
    email: "",
    password: "",
    confirmPassword: "",
    // Étape 2 : Informations personnelles
    firstName: "",
    lastName: "",
    birthDate: "",
    educationLevel: "",
    classe: "",
    classeCustom: "",        // Si "Autre" est sélectionné
    // Étape 3 : Préférences
    preferredGenres: [],     // Tableau de genres sélectionnés
    sous_genre_prefere: [],  // Tableau de sous-genres
    intentions: []           // Pourquoi rejoindre la bibliothèque
  });

  // ─── MAPPING SOUS-GENRES PAR GENRE ─────────────────────────────────────────
  // Chaque genre principal a une liste de sous-genres associés
  const SOUS_GENRES_PAR_GENRE = {
    "Roman": ["Contemporain", "Classique", "Historique", "Science-fiction", "Fantastique", "Policier", "famille"],
    "Policier": ["Enquête", "Thriller", "Noir", "Espionnage", "Legal"],
    "Romance": ["Contemporain", "Classique", "Historique", "Science-fiction", "Fantastique", "Policier", "Romance", "famille"],
    "Fiction": ["Science-fiction", "Fantastique", "Policier", "Historique", "Romance", "Aventure"],
    "Non-fiction": ["Biographie", "Essai", "Histoire", "Science", "Philosophie", "Société"],
    "Jeunesse": ["Album", "Première lecture", "Roman jeunesse", "Bande dessinée"],
    "Classique": ["Littérature française", "Littérature étrangère", "Poésie", "Théâtre"],
    "Développement personnel": ["Motivation", "Productivité", "Psychologie", "Santé", "Spiritualité"],
    "Science": ["Physique", "Chimie", "Biologie", "Mathématiques", "Informatique"],
    "Horreur": ["Gothique", "Surnaturel", "Psychologique", "Slasher", "Zombie"],
    "Poésie": ["Lyrisme", "Épique", "Satirique", "Dramatique", "Haïku"],
    "Humour": ["Satire", "Comédie", "Parodie", "Humour noir", "Humour absurde"],
    "Essai": ["Politique", "Philosophie", "Société", "Science", "Littérature"],
    "Philosophie": ["Métaphysique", "Éthique", "Logique", "Philosophie politique", "Philosophie de la science"],
    "Fantastique": ["Épique", "Urbain", "Horreur", "Science-fiction", "Contemporain"],
    "Autre": []
  };
  
  // ─── AUTRES ÉTATS ──────────────────────────────────────────────────────────
  const [showPassword, setShowPassword] = useState(false);   // Afficher/masquer mot de passe
  const [acceptTerms, setAcceptTerms] = useState(false);     // Acceptation des CGU
  
  // ─── FONCTIONS UTILITAIRES ─────────────────────────────────────────────────
  
  /**
   * Met à jour un champ du formulaire
   * Utilise la syntaxe de spread pour créer un nouvel objet (immutabilité)
   */
  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  /**
   * Gère le changement de niveau d'étude en réinitialisant la classe/filière
   */
  const handleEducationLevelChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      educationLevel: value,
      classe: "",
      classeCustom: ""
    }));
  };
  
  /**
   * Récupère tous les sous-genres disponibles pour les genres sélectionnés
   */
  const getAllSousGenres = (genres) => {
    return genres.flatMap((g) => SOUS_GENRES_PAR_GENRE[g] || []);
  };
  const handleNext = async () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) {
        toast.error("Veuillez remplir tous les champs obligatoires");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Les mots de passe ne correspondent pas");
        return;
      }
      if (formData.password.length < 6) {
        toast.error("Le mot de passe doit contenir au moins 6 caractères");
        return;
      }
      
      const emailExiste = await verifierEmail(formData.email);
      if (emailExiste) {
        toast.error("Ce compte existe déjà, connectez-vous.", {
          action: { label: "Se connecter", onClick: () => navigate("/login") }
        });
        setTimeout(() => navigate("/login"), 3000);
        return;
      }
    }
    if (step === 2) {
      if (!formData.firstName || !formData.lastName) {
        toast.error("Veuillez remplir votre prénom et votre nom");
        return;
      }
      if (!formData.educationLevel) {
        toast.error("Veuillez sélectionner votre statut (niveau d'étude)");
        return;
      }
      
      // Validation de la classe/filière/métier si le niveau est défini
      const classesDispo = classesParNiveau[formData.educationLevel] || [];
      if (classesDispo.length > 0) {
        if (!formData.classe) {
          toast.error("Veuillez sélectionner votre classe ou filière");
          return;
        }
        if (formData.classe === "Autre" && !formData.classeCustom.trim()) {
          toast.error("Veuillez préciser votre classe ou filière");
          return;
        }
      } else {
        if (!formData.classe.trim()) {
          const estMetier = ["Professionnel", "Autre"].includes(formData.educationLevel);
          toast.error(`Veuillez préciser votre ${estMetier ? "métier" : "classe/filière"}`);
          return;
        }
      }
    }
    if (step === 3) {
      if (formData.preferredGenres.length === 0) {
        toast.error("Veuillez sélectionner au moins un genre préféré");
        return;
      }
      if (!acceptTerms) {
        toast.error("Vous devez accepter les conditions d'utilisation");
        return;
      }
      handleSubmit();
      return;
    }
    setStep((prev) => prev + 1);
  };
  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
    else onBack();
  };
  const handleSubmit = async () => {
    console.log("[RegisterPage] Bouton de soumission cliqué. Lancement de la requête...");
    const result = await onRegister({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate || undefined,
      educationLevel: formData.educationLevel || undefined,
      preferredGenres: formData.preferredGenres,
      classe: formData.classe === "Autre" ? formData.classeCustom : formData.classe || undefined,
      sous_genre_prefere: formData.sous_genre_prefere,
      intentions: formData.intentions
    });
    
    const isSuccess = typeof result === "boolean" ? result : result?.success;
    
    console.log(`[RegisterPage] Retour de l'API d'inscription. Succès ? ${isSuccess}`);
    
    if (!isSuccess) {
      const errors = result?.errors || {};
      console.log("[RegisterPage] Traitement des erreurs d'inscription à afficher :", errors);

      // Compte déjà existant (email ou username dupliqué)
      const isDuplicate = errors.email || errors.username;
      if (isDuplicate) {
        const msg = Array.isArray(errors.email) ? errors.email[0] : "Cette adresse email est déjà utilisée.";
        toast.error(msg, {
          description: "Voulez-vous vous connecter ?",
          action: { label: "Se connecter", onClick: () => navigate("/login") }
        });
        setTimeout(() => navigate("/login"), 4000);
      } else if (errors.password) {
        const msg = Array.isArray(errors.password) ? errors.password[0] : "Mot de passe invalide.";
        toast.error(`Mot de passe : ${msg}`);
        setStep(1);
      } else if (errors.detail) {
        toast.error(errors.detail);
      } else {
        toast.error("Une erreur est survenue lors de l'inscription. Veuillez réessayer.");
      }
    } else {
      console.log("[RegisterPage] Inscription réussie, redirection vers l'accueil...");
      toast.success("Inscription réussie ! Bienvenue sur CAEB");
      setTimeout(() => navigate("/home"), 1500);
    }
  };
  const inputClass = "w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all";
  const labelClass = "text-sm font-semibold text-primary";
  const renderStep = () => {
    switch (step) {
      case 1:
        return <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className={labelClass}>Adresse email</label>
              <Input
          id="email"
          type="email"
          placeholder="vous@exemple.com"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          className={inputClass}
        />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className={labelClass}>Mot de passe</label>
              <div className="relative">
                <Input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          className={`${inputClass} pr-14`}
        />
                <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="btn-solid absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg shadow-soft"
        >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted">Minimum 6 caractères</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</label>
              <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) => updateField("confirmPassword", e.target.value)}
          className={inputClass}
        />
            </div>
          </div>;
      case 2:
        return <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className={labelClass}>Prénom</label>
                <Input
          id="firstName"
          placeholder="Jean"
          value={formData.firstName}
          onChange={(e) => updateField("firstName", e.target.value)}
          className={inputClass}
        />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className={labelClass}>Nom</label>
                <Input
          id="lastName"
          placeholder="Dupont"
          value={formData.lastName}
          onChange={(e) => updateField("lastName", e.target.value)}
          className={inputClass}
        />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="birthDate" className={labelClass}>Date de naissance (Optionnel)</label>
              <Input
          id="birthDate"
          type="date"
          value={formData.birthDate}
          onChange={(e) => updateField("birthDate", e.target.value)}
          className={inputClass}
        />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="education" className={labelClass}>Statut</label>
              <Select onValueChange={handleEducationLevelChange} value={formData.educationLevel}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Sélectionnez votre niveau" />
                </SelectTrigger>
                <SelectContent className="surface border border-[var(--border-color)]">
                  {educationLevels.map((level) => <SelectItem key={level} value={level} className="text-primary">{level}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {
          /* Classe — apparaît seulement si le niveau a des classes */
        }
            {classesParNiveau[formData.educationLevel]?.length > 0 ? <div className="space-y-1.5">
                <label htmlFor="classe" className={labelClass}>Classe / Filière</label>
                <Select
          onValueChange={(value) => updateField("classe", value)}
          value={formData.classe}
        >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Sélectionnez votre classe" />
                  </SelectTrigger>
                  <SelectContent className="surface border border-[var(--border-color)]">
                    {classesParNiveau[formData.educationLevel].map((c) => <SelectItem key={c} value={c} className="text-primary">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formData.classe === "Autre" && <div className="pt-2">
                    <Input
          placeholder="Précisez votre classe/filière"
          value={formData.classeCustom}
          onChange={(e) => updateField("classeCustom", e.target.value)}
          className={inputClass}
          autoFocus
        />
                  </div>}
              </div> : formData.educationLevel && <div className="space-y-1.5">
                <label htmlFor="classe" className={labelClass}>
                  {["Professionnel", "Autre"].includes(formData.educationLevel) ? "Métier" : "Classe / Filière"}
                </label>
                <Input
          id="classe"
          placeholder={`Précisez votre ${["Professionnel", "Autre"].includes(formData.educationLevel) ? "métier" : "classe/filière"}...`}
          value={formData.classe}
          onChange={(e) => updateField("classe", e.target.value)}
          className={inputClass}
        />
              </div>}
          </div>;
      case 3:
        return <div className="space-y-4">
            <div className="space-y-3">
              <label className={labelClass}>Genres préférés</label>
              <p className="text-sm text-muted">Sélectionnez vos genres favoris pour des recommandations personnalisées (Choisissez au moins un genre)</p>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {genreList.map((genre) => <button
                  key={genre}
                  type="button"
                  onClick={() => {
                    const toggleGenre = (genre2) => {
                      setFormData((prev) => {
                        const newGenres = prev.preferredGenres.includes(genre2) ? prev.preferredGenres.filter((g) => g !== genre2) : [...prev.preferredGenres, genre2];
                        const validSousGenres = getAllSousGenres(newGenres);
                        return {
                          ...prev,
                          preferredGenres: newGenres,
                          sous_genre_prefere: prev.sous_genre_prefere.filter((sg) => validSousGenres.includes(sg))
                        };
                      });
                    };
                    toggleGenre(genre);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border flex items-center gap-1.5 ${formData.preferredGenres.includes(genre) ? "bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft" : "surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
                >
                  {formData.preferredGenres.includes(genre) && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  {genre}
                </button>)}
              </div>

              {
                /* Sous-genre — apparaît après le choix du genre */
              }
              {formData.preferredGenres[0] && SOUS_GENRES_PAR_GENRE[formData.preferredGenres[0]] && <div className="space-y-3 pt-2">
                  <label className={labelClass}>Sous-genres préférés (Optionnel)</label>
                  <div className="flex flex-wrap gap-2">
                    {SOUS_GENRES_PAR_GENRE[formData.preferredGenres[0]].map((sg) => <button
                      key={sg}
                      type="button"
                      onClick={() => {
                        const toggleSubGenre = (subGenre) => {
                          setFormData((prev) => ({
                            ...prev,
                            sous_genre_prefere: prev.sous_genre_prefere.includes(subGenre) ? prev.sous_genre_prefere.filter((g) => g !== subGenre) : [...prev.sous_genre_prefere, subGenre]
                          }));
                        };
                        toggleSubGenre(sg);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${formData.sous_genre_prefere.includes(sg) ? "bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft" : "surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
                    >
                      {formData.sous_genre_prefere.includes(sg) && <Check className="w-3.5 h-3.5 inline mr-1" />}
                      {sg}
                    </button>)}
                  </div>
                </div>}

              {
                /* Intentions (Optionnel) */
              }
              <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                <label className={labelClass}>Pourquoi rejoignez-vous la CAEB ? (Optionnel)</label>
                <p className="text-sm text-muted">Cela nous aide à améliorer nos services.</p>
                <div className="flex flex-wrap gap-2">
                  {intentionsList.map((intention) => <button
                    key={intention}
                    type="button"
                    onClick={() => {
                      const toggleIntention = (intention2) => {
                        setFormData((prev) => ({
                          ...prev,
                          intentions: prev.intentions.includes(intention2) ? prev.intentions.filter((i) => i !== intention2) : [...prev.intentions, intention2]
                        }));
                      };
                      toggleIntention(intention);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${formData.intentions?.includes(intention) ? "bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft" : "surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50"}`}
                  >
                    {formData.intentions?.includes(intention) && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {intention}
                  </button>)}
                </div>
              </div>

            </div>
            <div className="pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded cursor-pointer accent-[var(--library-accent)] border-[var(--border-color)]"
                />
                <label htmlFor="terms" className="text-sm text-muted cursor-pointer leading-relaxed">
                  {"J'accepte les "}
                  <a href="#" className="text-accent font-semibold hover:underline">{"conditions d'utilisation"}</a>
                  {" et la "}
                  <a href="#" className="text-accent font-semibold hover:underline">politique de confidentialité</a>
                </label>
              </div>
            </div>
          </div>;
      default:
        return null;
    }
  };
  const stepTitles = [
    { subtitle: "Commencez avec vos informations de connexion" },
    { subtitle: "Aidez-nous à mieux vous connaître" },
    { subtitle: "Personnalisez votre expérience" }
  ];
  return <div className="min-h-screen bg-library-bg mesh-gradient-light dark:mesh-gradient-dark flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-accent/5 animate-pulse-soft pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {
    /* Carte en verre */
  }
        <div className="glass-effect rounded-[2.5rem] shadow-elevated border border-white/10 overflow-hidden">
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
              <span className="text-gradient">Inscription</span>
            </h1>
            <p className="text-muted text-sm font-medium">{stepTitles[step - 1].subtitle}</p>
          </div>

          <div className="px-10 pt-6 pb-2">
            {
    /* Étapes Modernisées */
  }
            <div className="flex items-center justify-between mb-10">
              {[1, 2, 3].map((s) => <div key={s} className="flex items-center flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-500 ${s < step ? "bg-accent/20 text-accent border border-accent/30" : s === step ? "bg-accent text-white shadow-glow scale-110" : "glass-effect text-muted border border-white/10"}`}>
                    {s < step ? <Check className="w-5 h-5" /> : s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-700 ${s < step ? "bg-accent/40" : "bg-white/5"}`} />}
                </div>)}
            </div>

            {renderStep()}

            <div className="mt-8 mb-6">
              <Button
    onClick={handleNext}
    disabled={isLoading}
    className="btn-solid w-full h-12 font-bold rounded-xl shadow-medium hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center justify-center gap-2 sheen relative overflow-hidden"
  >
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Traitement...</> : step === 3 ? <><Check className="w-5 h-5" />Créer mon compte</> : <>Continuer<ChevronRight className="w-5 h-5" /></>}
              </Button>
            </div>
          </div>

          <div className="px-10 py-6 bg-white/5 border-t border-white/5 text-center">
            <p className="text-sm text-muted font-medium">
              Déjà un compte ?{" "}
              <button onClick={onLoginClick} className="text-accent font-bold hover:opacity-75 transition-all">
                Se connecter
              </button>
            </p>
          </div>
        </div>

        <button
    onClick={handleBack}
    className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-accent font-medium transition-colors py-2"
  >
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? "Étape précédente" : "Retour à l'accueil"}
        </button>
      </div>
    </div>;
}
