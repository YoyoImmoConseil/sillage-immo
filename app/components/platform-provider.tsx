"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PLATFORM, type Platform } from "@/lib/platform/config";

export type PlatformContextValue = {
  platform: Platform;
  /** Téléphone iOS ou Android : cible des variantes orientées conversion. */
  isTouch: boolean;
  isIos: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  /**
   * Lancée depuis l'écran d'accueil (PWA installée), donc sans barre d'URL.
   * Indéterminable côté serveur : vaut `false` au premier rendu, puis se
   * précise après hydratation.
   */
  isStandalone: boolean;
};

const buildValue = (
  platform: Platform,
  isStandalone: boolean
): PlatformContextValue => ({
  platform,
  isTouch: platform !== "desktop",
  isIos: platform === "ios",
  isAndroid: platform === "android",
  isDesktop: platform === "desktop",
  isStandalone,
});

// Défaut permissif plutôt qu'exception : un composant monté hors du provider
// (test unitaire, rendu isolé) obtient l'affichage complet.
const PlatformContext = createContext<PlatformContextValue>(
  buildValue(DEFAULT_PLATFORM, false)
);

export const usePlatform = (): PlatformContextValue =>
  useContext(PlatformContext);

export function PlatformProvider({
  platform,
  children,
}: Readonly<{ platform: Platform; children: React.ReactNode }>) {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(display-mode: standalone)");
    const sync = () => {
      // Safari iOS ignore display-mode et expose navigator.standalone.
      const iosStandalone =
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(query.matches || iosStandalone);
    };

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const value = useMemo(
    () => buildValue(platform, isStandalone),
    [platform, isStandalone]
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
