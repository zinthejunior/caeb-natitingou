/**
 * WCAG Contrast Utilities
 * 
 * Implements WCAG AA/AAA contrast ratio calculations and adaptive text color selection
 * based on background color and current theme (light/dark mode).
 * 
 * Specifications:
 * - WCAG AA: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
 * - WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 * 
 * Reference: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
 */

export interface ContrastInfo {
  color: string;
  contrastRatio: number;
  meetsWCAG: boolean;
}

/**
 * Convert hex color to RGB
 * @param hex Color in hex format (#RRGGBB or RRGGBB)
 * @returns RGB as [R, G, B] or null if invalid
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * @param r Red channel (0-255)
 * @param g Green channel (0-255)
 * @param b Blue channel (0-255)
 * @returns Relative luminance (0-1)
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 * @param rgb1 First color RGB
 * @param rgb2 Second color RGB
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard
 * @param contrastRatio The contrast ratio to check
 * @param isLargeText Whether the text is large (18pt+ or 14pt+ bold)
 * @returns true if meets AA standard
 */
export function meetsWCAG_AA(contrastRatio: number, isLargeText = false): boolean {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard
 * @param contrastRatio The contrast ratio to check
 * @param isLargeText Whether the text is large (18pt+ or 14pt+ bold)
 * @returns true if meets AAA standard
 */
export function meetsWCAG_AAA(contrastRatio: number, isLargeText = false): boolean {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}

/**
 * Parse CSS color (hex, rgb, hsl, or CSS variable)
 * @param color Color string
 * @returns RGB tuple or null
 */
export function parseColor(color: string): [number, number, number] | null {
  // Handle hex colors
  if (color.startsWith('#')) {
    return hexToRgb(color);
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  // Default to white if can't parse
  return [255, 255, 255];
}

/**
 * Adaptive text color selection based on background and theme
 * 
 * Rules:
 * - Light Theme:
 *   - White/light background → Primary Blue (#0052CC)
 *   - Dark/blue background → White (#FFFFFF)
 * 
 * - Thème sombre (Second mode clair) :
 *   - Fond clair (blanc/crème) → Marron (#3D2817)
 *   - Fond sombre/bleu → Blanc chaud/crème (#FFFAF5)
 * 
 * Toutes les couleurs respectent le minimum WCAG AA (4.5:1)
 * 
 * @param backgroundColor Couleur CSS du fond
 * @param isDarkMode Indique si le thème sombre est actif
 * @returns Couleur de texte adaptée au format hex
 */
export function getAdaptiveTextColor(
  backgroundColor: string,
  isDarkMode: boolean
): string {
  const bgRgb = parseColor(backgroundColor);
  if (!bgRgb) return isDarkMode ? '#FFFAF5' : '#0052CC';

  const luminance = getRelativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);

  if (isDarkMode) {
    // Thème sombre (mode clair secondaire) : jaune/marron/blanc chaud dominants
    if (luminance > 0.5) {
      // Fond clair → marron pour l'élégance
      return '#3D2817'; // Marron de marque
    } else {
      // Fond sombre → blanc chaud/crème
      return '#FFFAF5'; // Crème claire
    }
  } else {
    // Thème clair : bleu professionnel et blanc
    if (luminance > 0.5) {
      // Fond clair → bleu principal
      return '#0052CC'; // Bleu principal
    } else {
      // Fond sombre → blanc pour le contraste
      return '#FFFFFF'; // Blanc
    }
  }
}

/**
 * Get adaptive text color with WCAG verification
 * Ensures contrast ratio meets WCAG AA minimum
 * 
 * @param backgroundColor CSS color of the background
 * @param isDarkMode Whether dark theme is active
 * @param isLargeText Whether text is large (18pt+ or 14pt+ bold)
 * @returns { color: string, contrastRatio: number, meetsWCAG: boolean }
 */
export function getAdaptiveTextColorWithContrast(
  backgroundColor: string,
  isDarkMode: boolean,
  isLargeText = false
): {
  color: string;
  contrastRatio: number;
  meetsWCAG: boolean;
} {
  const textColor = getAdaptiveTextColor(backgroundColor, isDarkMode);
  const bgRgb = parseColor(backgroundColor);
  const textRgb = parseColor(textColor);

  if (!bgRgb || !textRgb) {
    return {
      color: textColor,
      contrastRatio: 0,
      meetsWCAG: false,
    };
  }

  const contrastRatio = getContrastRatio(bgRgb, textRgb);
  const meetsWCAG = meetsWCAG_AA(contrastRatio, isLargeText);

  return {
    color: textColor,
    contrastRatio: parseFloat(contrastRatio.toFixed(2)),
    meetsWCAG,
  };
}

/**
 * Get all color information for a background
 * Useful for debugging and documentation
 * 
 * @param backgroundColor CSS color of the background
 * @param isDarkMode Whether dark theme is active
 * @returns Comprehensive color information
 */
export function getColorInfo(backgroundColor: string, isDarkMode: boolean) {
  const result = getAdaptiveTextColorWithContrast(backgroundColor, isDarkMode);
  const bgRgb = parseColor(backgroundColor);

  return {
    backgroundColor,
    isDarkMode,
    theme: isDarkMode ? 'dark' : 'light',
    ...result,
    backgroundLuminance: bgRgb
      ? parseFloat(getRelativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]).toFixed(3))
      : null,
  };
}
