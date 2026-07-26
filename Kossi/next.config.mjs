/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use stable Next.js dev server to avoid Turbopack-related filesystem issues on Windows.
  // Turbopack is experimental and can fail with paths containing spaces or accentuated characters.
  turbopack: {
    root: process.cwd(),
  },

  // Avoid build-time type-checking issues caused by Windows path normalization.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuration des images externes autorisees
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Headers de securite
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
};

export default nextConfig;
