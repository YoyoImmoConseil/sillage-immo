import Link from "next/link";

export function AdminLoginForm({
  canBootstrap,
  googleAuthHref,
}: {
  canBootstrap: boolean;
  googleAuthHref: string;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] p-4 text-sm text-[#141446]/78">
        Connecte-toi avec Google en utilisant une adresse deja autorisee dans le back-office.
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={googleAuthHref} className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60">
          Continuer avec Google
        </Link>
        {canBootstrap ? (
          <Link href="/admin/bootstrap" className="text-sm underline">
            Creer le premier administrateur
          </Link>
        ) : null}
      </div>
    </div>
  );
}
