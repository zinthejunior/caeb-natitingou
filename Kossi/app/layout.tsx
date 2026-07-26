import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION DES POLICES
// Geist est la police officielle de Vercel, optimisee pour la lisibilite
// ══════════════════════════════════════════════════════════════════════════════

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// ══════════════════════════════════════════════════════════════════════════════
// METADATA SEO
// Informations pour les moteurs de recherche et le partage social
// ══════════════════════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Kossi AI - Bibliotheque CAEB de Natitingou",
  description:
    "Kossi est votre assistant bibliothecaire virtuel intelligent. " +
    "Trouvez des livres, obtenez des recommandations personnalisees et " +
    "explorez le catalogue de la Bibliotheque CAEB de Natitingou au Benin.",
  keywords: [
    "bibliotheque",
    "CAEB",
    "Natitingou",
    "Benin",
    "livres",
    "lecture",
    "assistant IA",
    "Kossi",
    "recommandation",
  ],
  authors: [{ name: "Bibliotheque CAEB de Natitingou" }],
  openGraph: {
    title: "Kossi AI - Votre Bibliothecaire Virtuel",
    description:
      "Decouvrez le catalogue de la Bibliotheque CAEB avec Kossi, " +
      "votre assistant intelligent qui vous aide a trouver le livre parfait.",
    type: "website",
    locale: "fr_BJ",
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// VIEWPORT
// Configuration pour les appareils mobiles
// ══════════════════════════════════════════════════════════════════════════════

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e0e7ff" },
    { media: "(prefers-color-scheme: dark)", color: "#312e81" },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// LAYOUT RACINE
// Structure HTML de base pour toutes les pages
// ══════════════════════════════════════════════════════════════════════════════

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
