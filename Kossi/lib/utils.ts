import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine et fusionne les classes Tailwind de maniere intelligente.
 * 
 * Cette fonction utilise clsx pour combiner les classes conditionnellement,
 * puis tailwind-merge pour resoudre les conflits entre classes Tailwind.
 * 
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", "px-6")
 * // Resultat: "py-2 px-6 bg-primary" (px-6 ecrase px-4)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date en format relatif ou absolu selon l'anciennete.
 * 
 * @param date - La date a formater
 * @returns Une chaine formatee ("il y a 2 min", "14:30", "Hier", etc.)
 */
export function formatMessageTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) {
    return "A l'instant";
  } else if (diffMin < 60) {
    return `Il y a ${diffMin} min`;
  } else if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Hier";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("fr-FR", { weekday: "long" });
  } else {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
}

/**
 * Tronque un texte a une longueur maximale avec ellipsis.
 * 
 * @param text - Le texte a tronquer
 * @param maxLength - La longueur maximale (defaut: 100)
 * @returns Le texte tronque avec "..." si necessaire
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
