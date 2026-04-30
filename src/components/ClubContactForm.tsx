import { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ClubManager } from '@/types';

interface ClubContactFormProps {
  club: {
    id: string;
    name: string;
    manager?: ClubManager;
  };
  userName: string;
  userEmail: string;
  onClose: () => void;
  onSubmit: () => void;
}

export function ClubContactForm({
  club,
  userName,
  userEmail,
  onClose,
  onSubmit,
}: ClubContactFormProps) {
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    message: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simuler l'envoi du formulaire
    await new Promise(resolve => setTimeout(resolve, 800));

    toast.success('Formulaire envoyé avec succès !', {
      description: `Le responsable du club "${club.name}" recevra votre demande d'adhésion.`,
    });

    setIsSubmitting(false);
    onSubmit();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50 p-4">
      <div className="card rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête du formulaire (header)
          - Reste visible en haut si la fenêtre défile (`sticky`).
          - Affiche le titre du formulaire et un bouton pour fermer la modal. */}
        <div className="sticky top-0 bg-gradient-to-r from-library-primary/10 to-library-accent/10 dark:from-gradient-primary-start dark:to-gradient-accent-end p-6 border-b border-muted flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary dark:text-library-text">Rejoindre le club</h2>
            <p className="text-sm muted mt-1 dark:text-library-muted">{club.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary dark:text-library-muted dark:hover:text-library-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu du formulaire
            - Contient les informations du responsable (si disponible) et les champs à remplir.
            - `onSubmit` simule l'envoi puis appelle les callbacks fournis par le parent. */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Informations sur le responsable (optionnel) */}
          {club.manager && (
            <div className="bg-surface-weak dark:bg-library-surface rounded-lg p-4 border border-muted mb-6">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-library-accent dark:text-library-accent-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-primary dark:text-library-text">
                    Responsable du club
                  </p>
                  <p className="text-sm muted dark:text-library-muted">{club.manager.name}</p>
                  <a
                    href={`mailto:${club.manager.email}`}
                    className="text-sm text-library-accent dark:text-library-accent-secondary font-medium mt-1 inline-block hover:opacity-90"
                  >
                    {club.manager.email}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Champs du formulaire */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2 dark:text-library-text">
              Votre nom *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Votre prénom et nom"
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-library-accent/20 focus:border-library-accent outline-none transition-all bg-surface dark:bg-library-surface text-primary dark:text-library-text"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre.email@exemple.com"
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-library-accent/20 focus:border-library-accent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Téléphone (optionnel)
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-library-accent/20 focus:border-library-accent outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Dites-nous pourquoi vous souhaitez rejoindre ce club..."
              rows={4}
              className="w-full px-4 py-2 border border-muted rounded-lg focus:ring-2 focus:ring-library-accent/20 focus:border-library-accent outline-none transition-all resize-none"
              required
            />
          </div>

          <p className="text-xs muted">
            * Les champs marqués d'un astérisque sont obligatoires
          </p>

            {/* Actions : boutons Annuler / Envoyer
              - `Annuler` ferme la modal sans envoyer.
              - `Envoyer` déclenche la simulation d'envoi et notifie l'utilisateur. */}
          <div className="flex gap-3 pt-4 border-t border-muted">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-muted"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-library-accent hover:bg-library-accent/90 text-library-accent-secondary font-medium gap-2"
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>

          <p className="text-xs muted text-center">
            Vous recevrez une réponse du responsable du club sous 24h
          </p>
        </form>
      </div>
    </div>
  );
}
