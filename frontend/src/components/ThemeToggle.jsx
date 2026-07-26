import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
export function ThemeToggle() {
  const { isDark, mounted } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  const toggleTheme = () => {
    if (!mounted) return;
    setIsAnimating(true);
    setTimeout(() => {
      const html = document.documentElement;
      if (html.classList.contains("dark")) {
        html.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        html.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
      setIsAnimating(false);
    }, 150);
  };
  return <button
    onClick={toggleTheme}
    aria-pressed={isDark}
    title={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
    className={`p-2.5 rounded-lg transition-all duration-300 ease-out group ${isDark ? "hover:bg-library-accent/8 hover:shadow-glow" : "hover:bg-library-primary/8 hover:shadow-glow"} active:scale-95`}
    aria-label="Basculer le thème"
    disabled={!mounted || isAnimating}
  >
      <div className={`transition-transform duration-300 ${isAnimating ? "rotate-180 scale-0" : "rotate-0 scale-100"}`}>
        {isDark ? <Sun className="w-5 h-5 text-library-accent group-hover:text-library-accent-light transition-colors" /> : <Moon className="w-5 h-5 text-library-primary group-hover:text-library-accent-alt transition-colors" />}
      </div>
    </button>;
}
