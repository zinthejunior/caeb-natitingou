"use client";

import type { Conversation } from "@/lib/types";
import { Plus, Trash2, PanelLeftClose, Sparkles, Settings, User, Moon, Sun, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  theme,
  onToggleTheme,
}: SidebarProps) {
  const [showSettings, setShowSettings] = useState(false);

  // Group conversations by date relative to today
  const groupedConversations = useMemo(() => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const last7Days: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt);
      if (convDate >= startOfToday) {
        today.push(conv);
      } else if (convDate >= startOfYesterday) {
        yesterday.push(conv);
      } else if (convDate >= startOf7DaysAgo) {
        last7Days.push(conv);
      } else {
        older.push(conv);
      }
    });

    return [
      { label: "Aujourd'hui", items: today },
      { label: "Hier", items: yesterday },
      { label: "7 derniers jours", items: last7Days },
      { label: "Plus ancien", items: older },
    ].filter((group) => group.items.length > 0);
  }, [conversations]);

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-45 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col w-[260px] bg-sidebar text-sidebar-foreground select-none border-r border-sidebar-border transition-all duration-300 ease-in-out",
          isOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full lg:-ml-[260px] lg:opacity-0 lg:pointer-events-none"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 flex items-center justify-between gap-2 border-b border-sidebar-border/60">
          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center gap-2 rounded-lg border border-sidebar-border hover:bg-sidebar-hover text-sidebar-foreground px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] select-none"
          >
            <Plus className="w-4.5 h-4.5 text-muted-foreground" />
            <span>Nouvelle discussion</span>
          </button>

          {/* Toggle Sidebar Button */}
          <button
            onClick={onToggle}
            className="p-2 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-hover rounded-lg transition-colors border border-transparent hover:border-sidebar-border/30"
            title="Masquer la barre latérale"
          >
            <PanelLeftClose className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500 space-y-2 select-none">
              <Sparkles className="w-5 h-5 mx-auto text-slate-400 animate-pulse" />
              <p className="font-semibold text-muted-foreground">Aucun historique</p>
              <p className="text-[11px] opacity-75">Vos discussions récentes apparaîtront ici.</p>
            </div>
          ) : (
            groupedConversations.map((group) => (
              <div key={group.label} className="space-y-1.5">
                <h3 className="px-2 text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase select-none">
                  {group.label}
                </h3>
                <div className="space-y-[2px]">
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        className={cn(
                          "group relative w-full flex items-center justify-between rounded-lg px-2.5 py-2.5 text-left text-xs transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-sidebar-hover text-sidebar-foreground shadow-sm font-semibold border border-sidebar-border/40"
                            : "hover:bg-sidebar-hover/60 text-muted-foreground hover:text-sidebar-foreground"
                        )}
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <span className="truncate pr-5 font-medium max-w-[190px]">
                          {conv.title}
                        </span>

                        {/* Delete Button (visible on hover) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conv.id);
                          }}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 hover:bg-sidebar rounded-md transition-all duration-150"
                          aria-label={`Supprimer ${conv.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer with Profile & Actions Menu */}
        <div className="relative p-3.5 border-t border-sidebar-border bg-sidebar">
          {/* Popup Menu */}
          {showSettings && (
            <div className="absolute bottom-[72px] left-3.5 right-3.5 bg-card border border-border rounded-xl p-1.5 shadow-xl animate-fade-in z-50 text-xs text-foreground">
              <button
                onClick={() => {
                  onToggleTheme();
                  setShowSettings(false);
                }}
                className="w-full flex items-center gap-2.5 rounded-lg hover:bg-muted px-3 py-2 text-left transition-colors"
              >
                {theme === "light" ? (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span>Mode sombre</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Mode clair</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  alert("Profil CAEB Natitingou - Kossi AI v1.0.0");
                  setShowSettings(false);
                }}
                className="w-full flex items-center gap-2.5 rounded-lg hover:bg-muted px-3 py-2 text-left transition-colors"
              >
                <User className="w-4 h-4 text-primary" />
                <span>Mon Profil</span>
              </button>

              <div className="h-[1px] bg-border my-1" />

              <a
                href="https://www.caebbenin.org"
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowSettings(false)}
                className="w-full flex items-center gap-2.5 rounded-lg hover:bg-muted px-3 py-2 text-left transition-colors text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Aide & Support</span>
              </a>
            </div>
          )}

          {/* Profile Trigger Button */}
          <div
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg p-2 cursor-pointer transition-all duration-200 select-none",
              showSettings ? "bg-sidebar-hover" : "hover:bg-sidebar-hover"
            )}
          >
            <div className="w-7.5 h-7.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-inner font-bold text-xs select-none">
              C
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-sidebar-foreground truncate">CAEB Bibliothèque</p>
              <p className="text-[10px] text-muted-foreground truncate">Kossi AI Assistant</p>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground hover:text-sidebar-foreground transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}
