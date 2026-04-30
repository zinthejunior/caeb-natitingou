import { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, ChevronRight, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { genreList, educationLevels, classesParNiveau, intentionsList } from '@/data/constants';

interface RegisterPageProps {
  onRegister: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    educationLevel?: string;
    preferredGenres: string[];
    classe?: string;
    sous_genre_prefere?: string[];
    intentions?: string[];
    profil_complet?: boolean;
  }) => Promise<boolean>;
  onBack: () => void;
  onLoginClick: () => void;
  isLoading: boolean;
}

export function RegisterPage({ onRegister, onBack, onLoginClick, isLoading }: RegisterPageProps) {
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem('register_step');
    return saved ? parseInt(saved, 10) : 1;
  });
  
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('register_formData');
    if (saved) return JSON.parse(saved);
    return {
      email: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', birthDate: '',
      educationLevel: '', preferredGenres: [] as string[],
      classe: '',
      classeCustom: '',
      sous_genre_prefere: [] as string[],
      intentions: [] as string[],
    };
  });

  useEffect(() => {
    sessionStorage.setItem('register_step', step.toString());
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem('register_formData', JSON.stringify(formData));
  }, [formData]);



  const SOUS_GENRES_PAR_GENRE: Record<string, string[]> = {
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
    "Autre": [],
  };

  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const updateField = (field: string, value: string | string[]) =>
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  const getAllSousGenres = (genres: string[]) => {
    return genres.flatMap(g => SOUS_GENRES_PAR_GENRE[g] || []);
  };
  const handleNext = () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.confirmPassword) { toast.error('Veuillez remplir tous les champs obligatoires'); return; }
      if (formData.password !== formData.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
      if (formData.password.length < 4) { toast.error('Le mot de passe doit contenir au moins 4 caractères'); return; }
    }
    if (step === 2 && (!formData.firstName || !formData.lastName)) { toast.error('Veuillez remplir votre nom et prénom'); return; }
    if (step === 3) {
      if (!acceptTerms) { toast.error("Vous devez accepter les conditions d'utilisation"); return; }
      handleSubmit(); return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => { if (step > 1) setStep(prev => prev - 1); else onBack(); };

  const handleSubmit = async () => {
    const success = await onRegister({
      email: formData.email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      birthDate: formData.birthDate || undefined,
      educationLevel: formData.educationLevel || undefined,
      preferredGenres: formData.preferredGenres,

      classe: formData.classe === 'Autre' ? formData.classeCustom : (formData.classe || undefined),
      sous_genre_prefere: formData.sous_genre_prefere,
      intentions: formData.intentions,
      profil_complet: !!(
        formData.educationLevel &&
        (classesParNiveau[formData.educationLevel]?.length === 0 || formData.classe) &&
        formData.preferredGenres[0] &&
        formData.sous_genre_prefere
      ),
    });
    if (!success) {
      toast.error("Une erreur est survenue lors de l'inscription");
    } else {
      sessionStorage.removeItem('register_step');
      sessionStorage.removeItem('register_formData');
    }
  };

  const inputClass = 'w-full h-12 px-4 surface-alt border border-[var(--border-color)] rounded-xl text-primary placeholder:text-muted focus:border-[var(--library-accent)] focus:ring-2 focus:ring-[var(--library-accent)]/20 transition-all';
  const labelClass = 'text-sm font-semibold text-primary';

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className={labelClass}>Adresse email</label>
              <Input id="email" type="email" placeholder="vous@exemple.com"
                value={formData.email} onChange={(e) => updateField('email', e.target.value)}
                className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className={labelClass}>Mot de passe</label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={formData.password} onChange={(e) => updateField('password', e.target.value)}
                  className={`${inputClass} pr-14`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="btn-solid absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg shadow-soft">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted">Minimum 6 caractères</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</label>
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)}
                className={inputClass} />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className={labelClass}>Prénom</label>
                <Input id="firstName" placeholder="Jean" value={formData.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="lastName" className={labelClass}>Nom</label>
                <Input id="lastName" placeholder="Dupont" value={formData.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="birthDate" className={labelClass}>Date de naissance</label>
              <Input id="birthDate" type="date" value={formData.birthDate}
                onChange={(e) => updateField('birthDate', e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="education" className={labelClass}>Statut</label>
              <Select onValueChange={(value) => updateField('educationLevel', value)}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Sélectionnez votre niveau" />
                </SelectTrigger>
                <SelectContent className="surface border border-[var(--border-color)]">
                  {educationLevels.map((level) => (
                    <SelectItem key={level} value={level} className="text-primary">{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Classe — apparaît seulement si le niveau a des classes */}
            {classesParNiveau[formData.educationLevel]?.length > 0 ? (
              <div className="space-y-1.5">
                <label htmlFor="classe" className={labelClass}>Classe / Filière</label>
                <Select
                  onValueChange={(value) => updateField('classe', value)}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Sélectionnez votre classe" />
                  </SelectTrigger>
                  <SelectContent className="surface border border-[var(--border-color)]">
                    {classesParNiveau[formData.educationLevel].map((c) => (
                      <SelectItem key={c} value={c} className="text-primary">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.classe === 'Autre' && (
                  <div className="pt-2">
                    <Input placeholder="Précisez votre classe/filière" value={formData.classeCustom}
                      onChange={(e) => updateField('classeCustom', e.target.value)} className={inputClass} autoFocus />
                  </div>
                )}
              </div>
            ) : formData.educationLevel && (
              <div className="space-y-1.5">
                <label htmlFor="classe" className={labelClass}>
                  {['Professionnel', 'Autre'].includes(formData.educationLevel) ? 'Métier' : 'Classe / Filière'}
                </label>
                <Input id="classe" placeholder={`Précisez votre ${['Professionnel', 'Autre'].includes(formData.educationLevel) ? 'métier' : 'classe/filière'}...`} value={formData.classe}
                  onChange={(e) => updateField('classe', e.target.value)} className={inputClass} />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              <label className={labelClass}>Genres préférés</label>
              <p className="text-sm text-muted">Sélectionnez vos genres favoris pour des recommandations personnalisées</p>
              {/* Genre préféré — sélection unique */}
              <div className="space-y-3">
                <label className={labelClass}>Genres préférés</label>
                <p className="text-sm text-muted">Choisissez les genres qui vous correspondent le mieux</p>
                <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                  {genreList.map((genre: string) => (
                    <button key={genre} type="button"
                      onClick={() => {
                        const toggleGenre = (genre: string) => {
                          setFormData((prev: any) => {
                            const newGenres = prev.preferredGenres.includes(genre)
                              ? prev.preferredGenres.filter((g: string) => g !== genre)
                              : [...prev.preferredGenres, genre];
                            const validSousGenres = getAllSousGenres(newGenres);
                            return {
                              ...prev,
                              preferredGenres: newGenres,
                              sous_genre_prefere: prev.sous_genre_prefere.filter((sg: string) => validSousGenres.includes(sg))
                            };
                          });
                        };
                        toggleGenre(genre);
                      }} className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border flex items-center gap-1.5 ${formData.preferredGenres.includes(genre)
                          ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft'
                          : 'surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'
                        }`}>
                      {formData.preferredGenres.includes(genre) && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sous-genre — apparaît après le choix du genre */}
              {formData.preferredGenres[0] && SOUS_GENRES_PAR_GENRE[formData.preferredGenres[0]] && (
                <div className="space-y-3">
                  <label className={labelClass}>Sous-genres préférés</label>
                  <div className="flex flex-wrap gap-2">
                    {SOUS_GENRES_PAR_GENRE[formData.preferredGenres[0]].map((sg: string) => (
                      <button key={sg} type="button"
                        onClick={() => {
                          const toggleSubGenre = (subGenre: string) => {
                            setFormData((prev: any) => ({
                              ...prev,
                              sous_genre_prefere: prev.sous_genre_prefere.includes(subGenre)
                                ? prev.sous_genre_prefere.filter((g: string) => g !== subGenre)
                                : [...prev.sous_genre_prefere, subGenre]
                            }));
                          };
                          toggleSubGenre(sg);
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${formData.sous_genre_prefere.includes(sg)
                            ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft'
                            : 'surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'
                          }`}>
                        {formData.sous_genre_prefere.includes(sg) && <Check className="w-3.5 h-3.5 inline mr-1" />}
                        {sg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Intentions (Optionnel) */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-color)]">
                <label className={labelClass}>Pourquoi rejoignez-vous la CAEB ? (Optionnel)</label>
                <p className="text-sm text-muted">Cela nous aide à améliorer nos services.</p>
                <div className="flex flex-wrap gap-2">
                  {intentionsList.map((intention: string) => (
                    <button key={intention} type="button"
                      onClick={() => {
                        const toggleIntention = (intention: string) => {
                          setFormData((prev: any) => ({
                            ...prev,
                            intentions: prev.intentions.includes(intention)
                              ? prev.intentions.filter((i: string) => i !== intention)
                              : [...prev.intentions, intention]
                          }));
                        };
                        toggleIntention(intention);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${formData.intentions?.includes(intention)
                          ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] border-[var(--library-accent)] shadow-soft'
                          : 'surface-alt border-[var(--border-color)] text-primary hover:border-[var(--library-accent)]/50'
                        }`}>
                      {formData.intentions?.includes(intention) && <Check className="w-3.5 h-3.5 inline mr-1" />}
                      {intention}
                    </button>
                  ))}
                </div>
              </div>

            </div>
            <div className="pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms" checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded cursor-pointer accent-[var(--library-accent)] border-[var(--border-color)]" />
                <label htmlFor="terms" className="text-sm text-muted cursor-pointer leading-relaxed">
                  J'accepte les{' '}
                  <a href="#" className="text-accent font-semibold hover:underline">conditions d'utilisation</a>
                  {' '}et la{' '}
                  <a href="#" className="text-accent font-semibold hover:underline">politique de confidentialité</a>
                </label>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  const stepTitles = [
    { subtitle: 'Commencez avec vos informations de connexion' },
    { subtitle: 'Aidez-nous à mieux vous connaître' },
    { subtitle: 'Personnalisez votre expérience' },
  ];

  return (
    <div className="min-h-screen bg-library-bg page-register adaptive-fg flex items-center justify-center py-8 px-4 relative overflow-hidden">
      <div className="bg-blob blob-1" />
      <div className="bg-blob blob-2" />

      <div className="w-full max-w-md relative z-10">
        {/* Carte */}
        <div className="surface rounded-3xl shadow-elevated border border-[var(--border-color)] overflow-hidden">
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[var(--library-primary-pale)] shadow-soft flex-shrink-0">
                <img src="/logo.jpg" alt="CAEB" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="caeb-brand text-lg tracking-widest">CAEB</span>
                  <span className="text-xs text-muted font-medium caeb-brand--solid">Natitingou</span>
                </div>
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-primary mb-1">Inscription</h1>
            <p className="text-muted text-sm">{stepTitles[step - 1].subtitle}</p>
          </div>

          <div className="px-8 pt-6 pb-2">
            {/* Étapes */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${s < step
                      ? 'bg-[var(--library-accent)]/20 text-[var(--library-accent)]'
                      : s === step
                        ? 'bg-[var(--library-accent)] text-[var(--library-on-accent)] shadow-soft'
                        : 'surface-alt text-muted border border-[var(--border-color)]'
                    }`}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-500 ${s < step ? 'bg-[var(--library-accent)]/40' : 'bg-[var(--border-color)]'
                      }`} />
                  )}
                </div>
              ))}
            </div>

            {renderStep()}

            <div className="mt-8 mb-6">
              <Button onClick={handleNext} disabled={isLoading}
                className="btn-solid w-full h-12 font-bold rounded-xl shadow-medium hover:shadow-elevated hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center justify-center gap-2 sheen relative overflow-hidden">
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Traitement...</>
                ) : step === 3 ? (
                  <><Check className="w-5 h-5" />Créer mon compte</>
                ) : (
                  <>Continuer<ChevronRight className="w-5 h-5" /></>
                )}
              </Button>
            </div>
          </div>

          <div className="px-8 py-4 surface-alt border-t border-[var(--border-color)] text-center">
            <p className="text-sm text-muted">
              Déjà un compte ?{' '}
              <button onClick={onLoginClick} className="text-accent font-bold hover:opacity-75 transition-opacity">
                Se connecter
              </button>
            </p>
          </div>
        </div>

        <button onClick={handleBack}
          className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-muted hover:text-accent font-medium transition-colors py-2">
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? 'Étape précédente' : "Retour à l'accueil"}
        </button>
      </div>
    </div>
  );
}
