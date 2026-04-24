import type { NextConfig } from "next";

const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // SweepBright CDN + services de media (les URLs exactes varient selon
      // l'environnement ; on autorise les sous-domaines connus).
      { protocol: "https" as const, hostname: "website.sweepbright.com" },
      { protocol: "https" as const, hostname: "**.sweepbright.com" },
      { protocol: "https" as const, hostname: "**.sweepbright.app" },
      { protocol: "https" as const, hostname: "**.amazonaws.com" },
    ],
  },
};

export default nextConfig;
