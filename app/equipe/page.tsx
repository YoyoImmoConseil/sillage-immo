import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";

/** /equipe seul n'a pas de contenu propre : on renvoie vers la page agence. */
export default async function EquipeIndexPage() {
  const locale = await getRequestLocale();
  redirect(localizePath("/agence", locale));
}
