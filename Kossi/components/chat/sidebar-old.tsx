"use client";

import type { Conversation } from "@/lib/types";
import { Plus, X, BookOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
}: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50",
          "w-64 bg-background flex flex-col border-r border-border",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border bg-background">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Kossi AI</p>
              <p className="text-xs text-muted-foreground">Historique</p>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors lg:hidden"
              aria-label="Fermer le menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-white px-4 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle discussion
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="rounded-lg border border-border border-dashed bg-secondary p-4 text-xs text-muted-foreground text-center">
              Aucune conversation. Posez une question pour démarrer.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors",
                  conv.id === activeConversationId
                    ? "bg-secondary text-foreground"
                    : "hover:bg-secondary text-foreground"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-sm">{conv.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.updatedAt.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-border rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={`Supprimer ${conv.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border bg-background">
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">CAEB</p>
              <p className="text-xs text-muted-foreground">Natitingou</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
      aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
    >
      {isOpen ? <X className="w-5 h-5" /> : <span className="w-5 h-5">☰</span>}
    </button>
  );
}

