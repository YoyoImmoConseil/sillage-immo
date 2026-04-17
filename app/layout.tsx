import type { Metadata } from "next";
import { Libre_Baskerville, Montserrat, Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "./components/site-header";
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

  return (
    <html lang={locale}>
      <body
        className={`${hkGrotesk.variable} ${montagna.variable} ${libreBaskerville.variable} ${montserrat.variable} ${openSans.variable} antialiased`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
