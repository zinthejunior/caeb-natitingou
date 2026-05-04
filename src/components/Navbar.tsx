// Composant Navbar - Barre de navigation supérieure
import { Bell, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@/types';
import { ThemeToggle } from './ThemeToggle';
import ApiImage from './ApiImage';
import { NotificationCenter } from './NotificationCenter';
import { ProfileMenu } from './ProfileMenu';

// Props du composant Navbar
interface NavbarProps {
  utilisateur?: User | null; // Utilisateur actuellement connecté
  user?: User | null;        // Alias anglais pour compatibilité
}

/**
 * Navbar - Barre de navigation fixe en haut de l'application
 * Affiche:
 * - Logo de l'application avec lien vers l'accueil
 * - Notifications, sélecteur de thème, infos profil utilisateur
 * - Reste fixe avec support du notch/safe area pour mobiles
 */
export function Navbar({ utilisateur, user: userProp }: NavbarProps) {
  const user = utilisateur ?? userProp ?? null;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (showNotifications && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (showProfileMenu && profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('click', onDocClick);

    // Logo statique - pas d'appel backend
    // L'avatar est récupéré depuis user.avatar si disponible ; pas de requête supplémentaire

    return () => {
      document.removeEventListener('click', onDocClick);
    };
  }, [showNotifications, showProfileMenu]);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-library-surface/80 backdrop-blur-xl border-b border-muted transition-all duration-300 shadow-sm dark:shadow-lg adaptive-fg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Zone logo et branding
              - Lien cliquable vers la page d'accueil
              - Contient le logo et le texte de la bibliothèque
              - Aide à l'identification visuelle de l'application */}
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {/* Logo de l'application */}
            <ApiImage
              src="/logo.jpg"
              alt="CAEB NATITINGOU"
              className="h-12 w-auto object-contain"
            />
            {/* Texte de branding - Caché sur mobile pour économiser l'espace */}
            <div className="flex flex-col hidden sm:flex">
              <span data-adaptive className="font-display font-bold text-sm text-library-primary dark:text-library-dark-accent leading-none caeb-brand">CAEB</span>
              <span data-adaptive className="text-xs text-library-muted dark:text-library-dark-muted font-medium tracking-wider caeb-brand--solid">Natitingou</span>
            </div>
          </a>

          {/* Zone d'actions - Droite de la navbar
              - Regroupées pour un accès rapide depuis n'importe quelle page
              - Contient: notifications, switch thème, profil utilisateur */}
          <div className="flex items-center gap-1 sm:gap-3">

            {/* Bouton de notifications
                - Affiche une pastille rouge si des notifications existent
                - Prêt à être connecté à un système de notifications réel
                - Visible sur tous les écrans */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(v => !v)}
                className="p-2 text-muted dark:text-library-muted hover:bg-surface-weak dark:hover:bg-library-surface rounded-lg transition-colors relative group focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0"
                title="Afficher les notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-library-accent rounded-full border-2 border-library-surface group-hover:animate-pulse"></span>
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 z-50">
                  <NotificationCenter onClose={() => setShowNotifications(false)} />
                </div>
              )}
            </div>

            {/* Séparateur visuel - Visible sur tablette et desktop */}
            <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

            {/* Sélecteur de thème (clair/sombre)
                - Composant réutilisable qui bascule entre les themes
                - Sauvegarde la préférence en localStorage */}
            <ThemeToggle />

            {/* Widget de profil utilisateur - Affiche avatar, prénom et statut
                - Avatar avec initiale du prénom
                - Affiche le statut (Premium/Gratuit)
                - Caché sur mobile pour économiser l'espace */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-lg hover:bg-surface-weak dark:hover:bg-library-surface transition-colors border border-transparent hover:border-muted group focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-offset-0 dark:focus:ring-offset-0"
                title="Ouvrir le menu profil"
                aria-label="Menu profil"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm bg-gradient-to-br from-library-primary to-library-accent dark:from-library-dark-accent dark:to-library-accent flex items-center justify-center">
                  <ApiImage
                    imageKey={user?.avatar}
                    src={user?.avatar && (user.avatar.startsWith('/') || user.avatar.startsWith('http')) ? user.avatar : undefined}
                    fallback={'/avatar-1.jpg'}
                    alt={`${user?.prenom || user?.username || 'Utilisateur'} avatar`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-primary dark:text-library-text leading-none">{user?.prenom || user?.username || 'Utilisateur'}</p>
                  <p className="text-xs text-muted dark:text-library-muted mt-0.5">{user?.estMembre ? 'Premium' : 'Gratuit'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted dark:text-library-muted hidden sm:block group-hover:translate-x-0.5 transition-transform" />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 z-50">
                  <ProfileMenu utilisateur={user!} onClose={() => setShowProfileMenu(false)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
