import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import type { User as TUser } from '@/types';

interface ProfileMenuProps {
  user: TUser;
  onClose?: () => void;
}

export function ProfileMenu({ user, onClose }: ProfileMenuProps) {
  return (
    <div className="surface rounded-lg shadow-lg p-3 border border-muted">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-library-primary/10 flex items-center justify-center font-bold">{user?.firstName?.[0] || 'U'}</div>
        <div>
          <div className="font-semibold">{user?.firstName} {user?.lastName}</div>
          <div className="text-xs text-muted">{user?.email}</div>
        </div>
      </div>

      <div className="flex flex-col divide-y border-t border-muted">
        <button
          className="flex items-center justify-between py-2 px-1 hover:bg-surface-weak dark:hover:bg-library-dark-secondary focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-inset rounded transition-colors"
          onClick={() => {
            onClose?.();
            window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'profile' } }));
          }}
          title="Afficher votre profil"
        >
          <div className="flex items-center gap-2"><User className="w-4 h-4 flex-shrink-0" />Mon profil</div>
          <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
        </button>
        <button
          className="flex items-center justify-between py-2 px-1 hover:bg-surface-weak dark:hover:bg-library-dark-secondary focus:outline-none focus:ring-2 focus:ring-library-primary dark:focus:ring-library-dark-accent focus:ring-inset rounded transition-colors"
          onClick={() => {
            onClose?.();
            window.dispatchEvent(new CustomEvent('app:navigate', { detail: { view: 'settings' } }));
          }}
          title="Ouvrir les paramètres"
        >
          <div className="flex items-center gap-2"><Settings className="w-4 h-4 flex-shrink-0" />Paramètres</div>
          <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
        </button>
        <button
          className="flex items-center justify-between py-2 px-1 hover:bg-destructive/10 dark:hover:bg-destructive/20 text-destructive dark:text-destructive/80 focus:outline-none focus:ring-2 focus:ring-destructive/50 dark:focus:ring-destructive/40 focus:ring-inset rounded transition-colors"
          onClick={() => {
            onClose?.();
            window.dispatchEvent(new CustomEvent('app:logout'));
          }}
          title="Se déconnecter de votre compte"
        >
          <div className="flex items-center gap-2"><LogOut className="w-4 h-4 flex-shrink-0" />Se déconnecter</div>
        </button>
      </div>
    </div>
  );
}
