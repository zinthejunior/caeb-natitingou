/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {

      /* ══════════════════════════════════════════
         COULEURS — CAEB Design System
         Mode clair  : Bleu institutionnel + Blanc
         Mode sombre : Chocolat/Marron + Or/Jaune
         ══════════════════════════════════════════ */
      colors: {

        /* ── Variables shadcn/ui (conservées) ── */
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',

        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* ══════════════════════════════════════════
           TOKENS LIBRARY — référencés via CSS vars
           ══════════════════════════════════════════ */
        library: {
          /* Fonds & surfaces */
          bg:              'var(--library-bg)',
          surface:         'var(--library-surface)',
          'surface-alt':   'var(--library-surface-alt)',
          'surface-weak':  'var(--library-surface-weak)',

          /* Couleurs principales */
          primary:         'var(--library-primary)',
          'primary-dark':  'var(--library-primary-dark)',
          'primary-light': 'var(--library-primary-light)',
          'primary-pale':  'var(--library-primary-pale)',

          /* Accents */
          accent:           'var(--library-accent)',
          'accent-alt':     'var(--library-accent-alt)',
          'accent-light':   'var(--library-accent-light)',
          'accent-sky':     'var(--library-accent-sky)',
          'accent-secondary': 'var(--library-accent-secondary)', /* ← CORRIGÉ : était manquant */

          /* Textes */
          text:             'var(--library-text)',
          'text-muted':     'var(--library-text-muted)',
          muted:            'var(--library-muted)',

          /* Bordures */
          border:           'var(--border-color)',
          'border-strong':  'var(--border-strong)',

          /* Sur fonds colorés */
          'on-accent':      'var(--library-on-accent)',

          /* ── Alias dark (compatibilité code existant) ── */
          /* Ces alias pointent vers les mêmes vars CSS,
             qui changent de valeur selon html.dark */
          'dark-primary':    'var(--library-primary)',
          'dark-secondary':  'var(--library-surface)',
          'dark-bg':         'var(--library-bg)',
          'dark-accent':     'var(--library-accent)',
          'dark-muted':      'var(--library-muted)',
          'dark-light':      'var(--library-surface-weak)',
        },
      },

      /* ══════════════════════════════════════════
         TYPOGRAPHIE
         ══════════════════════════════════════════ */
      fontFamily: {
        sans:    ['Poppins', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },

      /* ══════════════════════════════════════════
         BORDER RADIUS
         ══════════════════════════════════════════ */
      borderRadius: {
        xs:   'calc(var(--radius) - 6px)',   /* ~6px */
        sm:   'calc(var(--radius) - 4px)',   /* ~8px */
        md:   'calc(var(--radius) - 2px)',   /* ~10px */
        lg:   'var(--radius)',               /* ~12px */
        xl:   'calc(var(--radius) + 4px)',   /* ~16px */
        '2xl':'1rem',
        '3xl':'1.5rem',
        '4xl':'2rem',
      },

      /* ══════════════════════════════════════════
         OMBRES — CORRIGÉES (shadow-card manquait)
         ══════════════════════════════════════════ */
      boxShadow: {
        'xs':         'var(--shadow-xs)',
        'subtle':     'var(--shadow-subtle)',
        'soft':       'var(--shadow-soft)',
        'medium':     'var(--shadow-medium)',
        'elevated':   'var(--shadow-elevated)',
        'glow':       'var(--shadow-glow)',
        'halo':       'var(--shadow-halo)',
        'card':       'var(--shadow-card)',         /* ← CORRIGÉ : était manquant */
        'card-hover': 'var(--shadow-card-hover)',   /* ← CORRIGÉ : était manquant */
      },

      /* ══════════════════════════════════════════
         KEYFRAMES (pour Tailwind animate-*)
         ══════════════════════════════════════════ */
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%':     { opacity: '0' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'flow-in': {
          '0%':   { opacity: '0', transform: 'translateY(14px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-800px 0' },
          '100%': { backgroundPosition: '800px 0' },
        },
        'glow-light': {
          '0%, 100%': { boxShadow: 'var(--shadow-card)' },
          '50%':      { boxShadow: 'var(--shadow-glow)' },
        },
        'glow-dark': {
          '0%, 100%': { boxShadow: 'var(--shadow-medium)' },
          '50%':      { boxShadow: '0 0 40px rgba(245,197,24,0.20), var(--shadow-glow)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.75' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'halo': {
          '0%, 100%': { boxShadow: 'var(--shadow-subtle)' },
          '50%':      { boxShadow: 'var(--shadow-halo)' },
        },
        'marquee-left': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-right': {
          '0%':   { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scrollX': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'velvet-pulse': {
          '0%':   { transform: 'scale(1)', opacity: '1' },
          '50%':  { transform: 'scale(1.006)', opacity: '0.96' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'float-blob': {
          '0%':   { transform: 'translateY(0) scale(1)' },
          '50%':  { transform: 'translateY(-20px) scale(1.03)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
      },

      /* ══════════════════════════════════════════
         ANIMATIONS
         ══════════════════════════════════════════ */
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'caret-blink':     'caret-blink 1.25s ease-out infinite',
        'slide-up':        'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down':      'slide-down 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':         'fade-in 0.4s ease-out',
        'scale-in':        'scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'flow-in':         'flow-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'float':           'float 4s ease-in-out infinite',
        'shimmer':         'shimmer 2s linear infinite',
        'glow-light':      'glow-light 2.5s ease-in-out infinite',
        'glow-dark':       'glow-dark 2.5s ease-in-out infinite',
        'pulse-soft':      'pulse-soft 2s ease-in-out infinite',
        'bounce-subtle':   'bounce-subtle 2s ease-in-out infinite',
        'halo':            'halo 3s ease-in-out infinite',
        'marquee-left':    'marquee-left 30s linear infinite',
        'marquee-right':   'marquee-right 30s linear infinite',
        'scroll-x':        'scrollX 20s linear infinite',
        'velvet-fade':     'velvet-pulse 3.5s ease-in-out infinite',
        'float-blob':      'float-blob 12s ease-in-out infinite',
      },

      /* ══════════════════════════════════════════
         TRANSITIONS
         ══════════════════════════════════════════ */
      transitionTimingFunction: {
        'custom-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth-flow':  'cubic-bezier(0.65, 0, 0.35, 1)',
        'silk':         'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'spring':       'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
      },

      /* ══════════════════════════════════════════
         ESPACEMENT SUPPLÉMENTAIRE
         ══════════════════════════════════════════ */
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },

      /* ══════════════════════════════════════════
         BACKDROP BLUR
         ══════════════════════════════════════════ */
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('./src/lib/tailwindContrastPlugin'),
  ],
};
