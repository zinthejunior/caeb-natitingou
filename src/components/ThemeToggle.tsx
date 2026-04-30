import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Initialiser le thème
    // - Vérifie si l'utilisateur a un thème stocké dans `localStorage`.
    // - Si absent, utilise la préférence système (`prefers-color-scheme`).
    // - Ajoute la classe `dark` à l'élément <html> pour activer le dark-mode global.
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = stored === 'dark' || (!stored && prefersDark);
    const html = document.documentElement;
    if (shouldUseDark) {
      html.classList.add('dark');
      setIsDark(true);
    } else {
      html.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  const toggleTheme = () => {
    // Basculer le thème avec petite animation
    // - Met à jour `localStorage` pour conserver le choix utilisateur.
    // - Modifie la classe `dark` sur l'élément racine pour que les styles CSS réagissent.
    setIsAnimating(true);
    setTimeout(() => {
      const html = document.documentElement;
      if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDark(false);
      } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDark(true);
      }
      setIsAnimating(false);
    }, 150);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-pressed={isDark}
      title={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      className={`p-2.5 rounded-lg transition-all duration-300 ease-out group ${isDark
          ? 'hover:bg-library-accent/8 hover:shadow-glow'
          : 'hover:bg-library-primary/8 hover:shadow-glow'
        } active:scale-95`}
      aria-label="Basculer le thème"
      disabled={isAnimating}
    >
      <div className={`transition-transform duration-300 ${isAnimating ? 'rotate-180 scale-0' : 'rotate-0 scale-100'}`}>
        {isDark ? (
          <Sun className="w-5 h-5 text-library-accent group-hover:text-library-accent-light transition-colors" />
        ) : (
          <Moon className="w-5 h-5 text-library-primary group-hover:text-library-accent-alt transition-colors" />
        )}
      </div>
    </button>
  );
}
