"use client";

import { ChevronDown, Info, PanelLeft, Sun, Moon, Sparkles } from "lucide-react";

interface ChatHeaderProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function ChatHeader({
  isSidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 dark:bg-[#212121]/80 backdrop-blur-md border-b border-border/40 select-none transition-colors duration-300">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {/* Sidebar Toggle Button - shows when sidebar is closed */}
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-muted dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-border/30 animate-fade-in"
              aria-label="Afficher la barre latérale"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          {/* Model Selector / Brand Title */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-muted dark:hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-border/30">
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm select-none">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">Kossi AI</span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-355 font-bold px-1.5 py-0.5 rounded-md border border-blue-200/20">
              v2.1
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          {/* Quick Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-muted dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-border/30"
            title={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
          >
            {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          </button>

          {/* Info Button */}
          <button 
            onClick={() => alert("Kossi AI - Assistant bibliothécaire intelligent conçu pour la bibliothèque CAEB de Natitingou, Bénin.")}
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-muted dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-all border border-transparent hover:border-border/30"
            title="Informations sur Kossi AI"
          >
            <Info className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
