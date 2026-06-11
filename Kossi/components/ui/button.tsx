// =============================================================================
// BUTTON - Composant bouton reutilisable
// =============================================================================
// Bouton avec plusieurs variantes (default, outline, ghost, etc.)
// Utilise class-variance-authority pour la gestion des variantes
// =============================================================================

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// VARIANTS - Definition des styles du bouton
// ---------------------------------------------------------------------------

const buttonVariants = cva(
  // Classes de base communes a toutes les variantes
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      // Variantes de style
      variant: {
        // Bouton principal avec couleur primaire
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        // Bouton destructif (suppression, danger)
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Bouton avec bordure, fond transparent
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        // Bouton secondaire, moins proéminent
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        // Bouton fantome, sans fond ni bordure
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // Bouton lien, style de lien hypertexte
        link: "text-primary underline-offset-4 hover:underline",
      },
      // Variantes de taille
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        // Bouton icone (carre)
        icon: "h-9 w-9",
      },
    },
    // Valeurs par defaut
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// ---------------------------------------------------------------------------
// TYPES - Types du composant
// ---------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // Permet d'utiliser le bouton comme conteneur pour un autre element
  asChild?: boolean;
}

// ---------------------------------------------------------------------------
// COMPOSANT - Le bouton lui-meme
// ---------------------------------------------------------------------------

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Si asChild est true, on rend juste les props sans le button
    // Sinon, on rend un button normal
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// ---------------------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------------------

export { Button, buttonVariants };
