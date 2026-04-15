"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getPathLocale, localizePath } from "@/lib/i18n/routing";

export function SellerSignOutButton() {
  const router = useRouter();
  const pathname = usePathname() ?? "/espace-client";
  const locale = getPathLocale(pathname);
  const copy = {
    fr: { error: "Impossible de fermer la session.", pending: "Déconnexion...", action: "Se déconnecter" },
    en: { error: "Unable to close the session.", pending: "Signing out...", action: "Sign out" },
    es: { error: "No se puede cerrar la sesión.", pending: "Cerrando sesión...", action: "Cerrar sesión" },
    ru: { error: "Не удалось завершить сеанс.", pending: "Выход...", action: "Выйти" },
  }[locale];
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSignOut = () => {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push(localizePath("/espace-client/login", locale));
        router.refresh();
      } catch {
        setError(copy.error);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSignOut}
        disabled={isPending}
        className="rounded border border-[#141446]/20 px-3 py-2 text-sm text-[#141446] disabled:opacity-60"
      >
        {isPending ? copy.pending : copy.action}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
