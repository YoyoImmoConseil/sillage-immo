import type { Metadata } from "next";
import { Suspense } from "react";
import { Libre_Baskerville, Montserrat, Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import { GoogleTagManager } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "./components/site-header";
import { RouteProgressBar } from "./components/route-progress-bar";
import { getRequestLocale } from "@/lib/i18n/request";

const hkGrotesk = localFont({
  variable: "--font-hk-grotesk",
  src: [
    { path: "./fonts/HKGrotesk-Regular.otf", weight: "400", style: "normal" },
    { path: "./fonts/HKGrotesk-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/HKGrotesk-SemiBold.otf", weight: "600", style: "normal" },
    { path: "./fonts/HKGrotesk-Bold.otf", weight: "700", style: "normal" },
  ],
  display: "swap",
});

const montagna = localFont({
  variable: "--font-montagna",
  src: [{ path: "./fonts/MontagnaLTD.woff2", weight: "400", style: "normal" }],
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sillage Immo",
  description:
    "Sillage Immo, boutique immobiliere a Nice: estimation vendeur et accompagnement acquereur sur-mesure.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  // Only inject GTM when an ID is configured (prod). Empty / unset on local
  // and preview branches avoids polluting analytics with non-prod traffic.
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang={locale}>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      <body
        className={`${hkGrotesk.variable} ${montagna.variable} ${libreBaskerville.variable} ${montserrat.variable} ${openSans.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        <SiteHeader />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
