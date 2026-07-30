import { headers } from "next/headers";
import {
  PLATFORM_HEADER_NAME,
  isPlatform,
  type Platform,
} from "./config";
import { detectPlatform } from "./detect";

/**
 * Plateforme de la requête courante, à appeler depuis un composant serveur.
 *
 * Le calcul est fait une fois par `proxy.ts` ; on relit simplement son en-tête.
 * Le repli sur le user-agent couvre les chemins qui ne traversent pas le proxy
 * (rendu d'une route exclue du matcher, appel direct dans un test).
 */
export const getRequestPlatform = async (): Promise<Platform> => {
  const headerStore = await headers();
  const fromProxy = headerStore.get(PLATFORM_HEADER_NAME);
  if (isPlatform(fromProxy)) return fromProxy;
  return detectPlatform(headerStore.get("user-agent"));
};
