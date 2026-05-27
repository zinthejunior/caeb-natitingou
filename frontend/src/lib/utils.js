import { useEffect } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const COLOR_TEXT = {
  // Couleurs texte mode clair
  lightPrimary: "#0052CC",
  // Texte bleu
  lightSecondary: "#1A2332",
  // Bleu-gris foncé
  lightInverse: "#FFFFFF",
  // Texte blanc
  // Couleurs texte mode sombre
  darkPrimary: "#3D2817",
  // Texte marron
  darkSecondary: "#1A1410",
  // Marron plus foncé
  darkInverse: "#FFFFFF",
  // Texte blanc
  // États atténués
  lightMuted: "#4A5A6B",
  // Bleu-gris
  darkMuted: "#5A4535"
  // Marron-gris
};
export function getColorBrightness(hex) {
  const rgb = parseInt(hex.slice(1), 16);
  const r = rgb >> 16 & 255;
  const g = rgb >> 8 & 255;
  const b = rgb & 255;
  const [rs, gs, bs] = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
export function getContrastRatio(color1, color2) {
  const l1 = getColorBrightness(color1);
  const l2 = getColorBrightness(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
export function meetsWCAGAA(bgColor, textColor) {
  return getContrastRatio(bgColor, textColor) >= 4.5;
}
export function getOptimalTextColor(bgColor, isDarkMode = false, forceInverse = false) {
  if (forceInverse) {
    return COLOR_TEXT.lightInverse;
  }
  const brightness = getColorBrightness(bgColor);
  const isLightBg = brightness > 0.5;
  if (isDarkMode) {
    if (isLightBg) {
      const contrast = getContrastRatio(bgColor, COLOR_TEXT.darkPrimary);
      if (contrast >= 4.5) {
        return COLOR_TEXT.darkPrimary;
      }
      return COLOR_TEXT.darkSecondary;
    } else {
      return COLOR_TEXT.darkInverse;
    }
  } else {
    if (isLightBg) {
      const contrast = getContrastRatio(bgColor, COLOR_TEXT.lightPrimary);
      if (contrast >= 4.5) {
        return COLOR_TEXT.lightPrimary;
      }
      return COLOR_TEXT.lightSecondary;
    } else {
      return COLOR_TEXT.lightInverse;
    }
  }
}
export function getTextColorClass(bgClass, isDarkMode = false) {
  const isLightBg = [
    "surface",
    "bg-white",
    "bg-slate-50",
    "bg-gray-50",
    "bg-blue-50",
    "library-primary",
    "library-secondary",
    "library-surface",
    "library-surface-weak"
  ].some((cls) => bgClass.includes(cls));
  const isDarkBg = [
    "bg-blue-600",
    "bg-blue-700",
    "bg-blue-900",
    "bg-slate-900",
    "library-accent",
    "library-accent-alt",
    "bg-primary"
  ].some((cls) => bgClass.includes(cls));
  if (isDarkMode) {
    if (isLightBg && !isDarkBg) {
      return "text-[#3D2817] dark:text-[#3D2817]";
    }
    return "text-white";
  } else {
    if (isLightBg && !isDarkBg) {
      return "text-library-primary dark:text-[#3D2817]";
    }
    return "text-white";
  }
}
export function getAdaptiveTextClasses(bgColor, isDarkMode = false) {
  const textColor = getOptimalTextColor(bgColor, isDarkMode);
  const isLightText = textColor === COLOR_TEXT.lightInverse || textColor === COLOR_TEXT.darkInverse;
  if (isLightText) {
    return "text-white hover:text-white/90 focus:text-white";
  } else if (isDarkMode) {
    return "text-[#3D2817] hover:text-[#5A4535] focus:text-[#3D2817]";
  } else {
    return "text-library-primary hover:text-library-primary/80 focus:text-library-primary";
  }
}
export function useSEO(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | CAEB Natitingou`;
    let metaDescription = document.querySelector('meta[name="description"]');
    const prevDescription = metaDescription?.getAttribute("content");
    if (description) {
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }
    return () => {
      document.title = prevTitle;
      if (prevDescription) {
        metaDescription?.setAttribute("content", prevDescription);
      }
    };
  }, [title, description]);
}
