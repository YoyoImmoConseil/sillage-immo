"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSignOutButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSignOut = () => {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        await fetch("/api/admin/auth/logout", {
          method: "POST",
        });
        router.push("/admin/login");
        router.refresh();
      } catch {
        setError("Impossible de fermer la session.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onSignOut}
        disabled={isPending}
        className="rounded border border-[#141446]/20 px-3 py-2 text-sm disabled:opacity-60"
      >
        {isPending ? "Deconnexion..." : "Se deconnecter"}
      </button>
      {error ? <span className="text-xs text-red-700">{error}</span> : null}
    </div>
  );
}
