// =============================================================================
// TEXTAREA - Composant zone de texte reutilisable
// =============================================================================
// Zone de texte multi-lignes avec styles cohérents
// Utilisé pour la saisie des messages dans le chat
// =============================================================================

import * as React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// TYPES - Types du composant
// ---------------------------------------------------------------------------

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

// ---------------------------------------------------------------------------
// COMPOSANT - La zone de texte
// ---------------------------------------------------------------------------

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Styles de base
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Focus
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Classes personnalisées
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

export { Textarea };
