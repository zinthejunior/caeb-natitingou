/**
 * WCAG Contrast Utility Plugin for Tailwind CSS
 * 
 * Provides convenient utility classes for adaptive text colors
 * that respect WCAG AA/AAA contrast standards.
 * 
 * Usage:
 * <div className="bg-white">
 *   <p className="text-on-light">Adaptive text color</p>
 * </div>
 */

const plugin = require('tailwindcss/plugin');

module.exports = function contrastUtilitiesPlugin() {
  return plugin(function ({ addUtilities, theme }) {
    // Light Theme Colors
    const lightThemeColors = {
      '.text-on-light': {
        color: 'rgb(0 82 204 / 100%)', // #0052CC - Primary Blue
      },
      '.text-on-dark': {
        color: '#FFFFFF',
      },
      '.text-on-primary': {
        color: '#FFFFFF',
      },
      '.text-on-accent': {
        color: '#FFFFFF',
      },
      '.text-on-surface': {
        color: 'rgb(0 82 204 / 100%)', // #0052CC
      },
    };

    // Dark Theme Colors (Second Light Mode)
    const darkThemeColors = {
      '.dark .text-on-light': {
        color: '#3D2817', // Brand Brown
      },
      '.dark .text-on-dark': {
        color: '#FFFAF5', // Warm Cream
      },
      '.dark .text-on-primary': {
        color: '#1A1410', // Dark Brown
      },
      '.dark .text-on-accent': {
        color: '#1A1410', // Dark Brown
      },
      '.dark .text-on-surface': {
        color: '#3D2817', // Brand Brown
      },
    };

    // Interactive States - Light Theme
    const lightInteractiveStates = {
      '.text-interactive': {
        color: 'rgb(0 82 204 / 100%)',
        '@apply transition-colors duration-200 cursor-pointer': {},
      },
      '.text-interactive:hover': {
        color: '#0066E0',
      },
      '.text-interactive:focus-visible': {
        color: 'rgb(0 82 204 / 100%)',
        '@apply outline outline-2 outline-offset-2 outline-blue-400 rounded': {},
      },
      '.text-interactive:active': {
        color: '#003D99',
      },
      '.text-interactive:disabled': {
        color: 'rgb(0 82 204 / 0.5)',
        '@apply cursor-not-allowed': {},
      },
    };

    // Interactive States - Dark Theme
    const darkInteractiveStates = {
      '.dark .text-interactive': {
        color: '#FFE699',
      },
      '.dark .text-interactive:hover': {
        color: '#FFED99',
      },
      '.dark .text-interactive:focus-visible': {
        color: '#FFE699',
        '@apply outline outline-2 outline-offset-2 outline-yellow-200 rounded': {},
      },
      '.dark .text-interactive:active': {
        color: '#FFDD66',
      },
      '.dark .text-interactive:disabled': {
        color: 'rgb(255 230 153 / 0.5)',
      },
    };

    // Contrast Level Indicators
    const contrastIndicators = {
      '.contrast-aa': {
        fontWeight: '500',
      },
      '.contrast-aaa': {
        fontWeight: '600',
      },
    };

    addUtilities({
      ...lightThemeColors,
      ...darkThemeColors,
      ...lightInteractiveStates,
      ...darkInteractiveStates,
      ...contrastIndicators,
    });
  });
};
