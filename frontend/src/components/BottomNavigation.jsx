import { Home, BookOpen, Users, Newspaper, Bot } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [justActivated, setJustActivated] = useState(null);

  const leftItems = [
    { id: "home", label: "Accueil", icon: Home },
    { id: "catalog", label: "Catalogue", icon: BookOpen }
  ];
  const rightItems = [
    { id: "clubs", label: "Clubs", icon: Users },
    { id: "news", label: "Actualités", icon: Newspaper }
  ];

  const isActive = (view) => {
    if (view === "home") return pathname === "/home";
    if (view === "catalog") return pathname.startsWith("/catalog") || pathname === "/favorites" || pathname === "/borrows";
    if (view === "clubs") return pathname.startsWith("/clubs");
    if (view === "news") return pathname.startsWith("/news");
    return false;
  };

  const isKossiActive = pathname === "/chat";

  const handleNavigate = (view) => {
    setJustActivated(view);
    if (view === "home") navigate("/home");
    else if (view === "catalog") navigate("/catalog");
    else if (view === "clubs") navigate("/clubs");
    else if (view === "news") navigate("/news");
    else if (view === "ai-chat") navigate("/chat");
  };

  useEffect(() => {
    if (justActivated) {
      const t = setTimeout(() => setJustActivated(null), 400);
      return () => clearTimeout(t);
    }
  }, [justActivated]);

  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 surface backdrop-blur-lg border-t border-[var(--border-color)] safe-area-pb"
    >
      <div className="max-w-3xl mx-auto px-2 sm:px-6">
        <div className="flex items-center h-16 gap-1">
          {leftItems.map((item) => {
            const active = isActive(item.id);
            const popping = justActivated === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
                role="link"
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 min-w-0 tap-feedback ${active ? "text-[var(--library-accent)]" : "text-[var(--library-muted)] hover:text-[var(--library-text)]"}`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-[var(--library-accent)]/12" : ""} ${popping ? "nav-item-active-pop" : active ? "scale-110" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium leading-none truncate hidden sm:inline transition-opacity ${active ? "opacity-100" : "opacity-70"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* ── BOUTON KOFFI IA — Centre surélevé ── */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center -mt-5 px-2">
            <button
              onClick={() => handleNavigate("ai-chat")}
              aria-current={isKossiActive ? "page" : undefined}
              aria-label="Assistant Kossi IA"
              title="Kossi — Assistant IA"
              className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-medium transition-all duration-300 tap-feedback ${isKossiActive ? "bg-[var(--library-accent)] scale-105 shadow-elevated" : "bg-[var(--library-accent)] hover:opacity-90 hover:shadow-elevated hover:-translate-y-0.5"} ${justActivated === "ai-chat" ? "nav-item-active-pop" : ""}`}
            >
              {isKossiActive && <span className="absolute inset-0 rounded-2xl animate-ping bg-[var(--library-accent)]/30 pointer-events-none" />}
              <Bot
                size={26}
                strokeWidth={isKossiActive ? 2.5 : 2}
                className="text-[var(--library-on-accent)] relative z-10"
              />
            </button>
            
            <span className={`text-[10px] font-semibold mt-1 leading-none transition-colors ${isKossiActive ? "text-[var(--library-accent)]" : "text-[var(--library-muted)]"}`}>
              Kossi IA
            </span>
            <span className={`sm:hidden mt-0.5 w-1 h-1 rounded-full transition-colors ${isKossiActive ? "bg-[var(--library-accent)]" : "bg-transparent"}`} />
          </div>

          {rightItems.map((item) => {
            const active = isActive(item.id);
            const popping = justActivated === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
                role="link"
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all duration-200 min-w-0 tap-feedback ${active ? "text-[var(--library-accent)]" : "text-[var(--library-muted)] hover:text-[var(--library-text)]"}`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-[var(--library-accent)]/12" : ""} ${popping ? "nav-item-active-pop" : active ? "scale-110" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-medium leading-none truncate hidden sm:inline transition-opacity ${active ? "opacity-100" : "opacity-70"}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
