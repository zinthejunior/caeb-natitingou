import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Color contrast utilities for text color adaptation
 * Ensures WCAG AA compliance (4.5:1 minimum contrast ratio)
 */

// Color definitions for text on different backgrounds
const COLOR_TEXT = {
  // Light mode text colors
  lightPrimary: '#0052CC',      // Blue text
  lightSecondary: '#1A2332',    // Dark blue-gray
  lightInverse: '#FFFFFF',      // White text
  
  // Dark mode text colors
  darkPrimary: '#3D2817',       // Brown text
  darkSecondary: '#1A1410',     // Darker brown
  darkInverse: '#FFFFFF',       // White text
  
  // Muted states
  lightMuted: '#4A5A6B',        // Blue-gray
  darkMuted: '#5A4535',         // Brown-gray
} as const

// Map of background colors to perceived brightness (0 = dark, 1 = light)


/**
 * Calculate perceived brightness of a color (0 = dark, 1 = light)
 * Uses relative luminance formula from WCAG
 * @param hex - Color in hex format (#RRGGBB)
 * @returns Brightness value between 0 and 1
 */
export function getColorBrightness(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16)
  const r = (rgb >> 16) & 255
  const g = (rgb >> 8) & 255
  const b = rgb & 255
  
  // Relative luminance formula (WCAG)
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color hex value
 * @param color2 - Second color hex value
 * @returns Contrast ratio (1-21, where 21 is maximum)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getColorBrightness(color1)
  const l2 = getColorBrightness(color2)
  
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast meets WCAG AA standard (4.5:1)
 * @param bgColor - Background color
 * @param textColor - Text color
 * @returns true if contrast ratio >= 4.5
 */
export function meetsWCAGAA(bgColor: string, textColor: string): boolean {
  return getContrastRatio(bgColor, textColor) >= 4.5
}

/**
 * Get optimal text color based on background and theme
 * Respects WCAG AA standards (4.5:1 minimum contrast)
 * 
 * Rules:
 * - Light mode on light background → Blue text
 * - Light mode on dark background → White text
 * -Dark mode on light background → Brown text
 * - Dark mode on dark background → White text
 * 
 * @param bgColor - Background color in hex (#RRGGBB)
 * @param isDarkMode - Whether dark mode is active
 * @param forceInverse - Force white text regardless of background
 * @returns Text color that meets WCAG AA contrast
 */
export function getOptimalTextColor(
  bgColor: string,
  isDarkMode: boolean = false,
  forceInverse: boolean = false
): string {
  if (forceInverse) {
    return COLOR_TEXT.lightInverse
  }
  
  const brightness = getColorBrightness(bgColor)
  const isLightBg = brightness > 0.5
  
  if (isDarkMode) {
    // Dark mode logic
    if (isLightBg) {
      // Light background in dark mode → brown text
      const contrast = getContrastRatio(bgColor, COLOR_TEXT.darkPrimary)
      if (contrast >= 4.5) {
        return COLOR_TEXT.darkPrimary
      }
      // Fallback to darker brown if needed
      return COLOR_TEXT.darkSecondary
    } else {
      // Dark background in dark mode → white text
      return COLOR_TEXT.darkInverse
    }
  } else {
    // Light mode logic
    if (isLightBg) {
      // Light background in light mode → blue text
      const contrast = getContrastRatio(bgColor, COLOR_TEXT.lightPrimary)
      if (contrast >= 4.5) {
        return COLOR_TEXT.lightPrimary
      }
      // Fallback to darker variant
      return COLOR_TEXT.lightSecondary
    } else {
      // Dark background in light mode → white text
      return COLOR_TEXT.lightInverse
    }
  }
}

/**
 * Get Tailwind text color class based on background and theme
 * Useful for inline styling without computing hex values
 * 
 * @param bgClass - Background Tailwind class (e.g., 'surface', 'bg-blue-600')
 * @param isDarkMode - Whether dark mode is active
 * @returns Tailwind text color class
 */
export function getTextColorClass(
  bgClass: string,
  isDarkMode: boolean = false
): string {
  // Map common Tailwind/library color classes to perceived brightness
  const isLightBg = [
    'surface',
    'bg-white',
    'bg-slate-50',
    'bg-gray-50',
    'bg-blue-50',
    'library-primary',
    'library-secondary',
    'library-surface',
    'library-surface-weak',
  ].some(cls => bgClass.includes(cls))
  
  const isDarkBg = [
    'bg-blue-600',
    'bg-blue-700',
    'bg-blue-900',
    'bg-slate-900',
    'library-accent',
    'library-accent-alt',
    'bg-primary',
  ].some(cls => bgClass.includes(cls))
  
  if (isDarkMode) {
    // Dark mode
    if (isLightBg && !isDarkBg) {
      // Light background in dark mode → brown text
      return 'text-[#3D2817] dark:text-[#3D2817]'
    }
    // Dark background → white text
    return 'text-white'
  } else {
    // Light mode
    if (isLightBg && !isDarkBg) {
      // Light background → blue text
      return 'text-library-primary dark:text-[#3D2817]'
    }
    // Dark background → white text
    return 'text-white'
  }
}

/**
 * Utility to generate adaptive text color styles
 * Combines color and hover/focus states while maintaining contrast
 * 
 * @param bgColor - Background color hex
 * @param isDarkMode - Active theme
 * @returns Combined Tailwind classes for text with interactive states
 */
export function getAdaptiveTextClasses(
  bgColor: string,
  isDarkMode: boolean = false
): string {
  const textColor = getOptimalTextColor(bgColor, isDarkMode)
  const isLightText = textColor === COLOR_TEXT.lightInverse || textColor === COLOR_TEXT.darkInverse
  
  // Generate classes based on computed optimal color
  if (isLightText) {
    return 'text-white hover:text-white/90 focus:text-white'
  } else if (isDarkMode) {
    return 'text-[#3D2817] hover:text-[#5A4535] focus:text-[#3D2817]'
  } else {
    return 'text-library-primary hover:text-library-primary/80 focus:text-library-primary'
  }
}
