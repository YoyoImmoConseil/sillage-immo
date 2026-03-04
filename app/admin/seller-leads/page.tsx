import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("fr-FR");
};

const formatStatusLabel = (status: string) => {
  switch (status) {
    case "new":
      return "Nouveau";
    case "to_call":
      return "A rappeler";
    case "qualified":
      return "Qualifié";
    case "closed":
      return "Clos";
    default:
      return status;
  }
};

export default async function SellerLeadsAdminPage() {
  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .select("id, created_at, full_name, email, city, timeline, status")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-6xl rounded-2xl border p-6">
          <h1 className="text-2xl font-semibold">Leads vendeurs</h1>
          <p className="mt-3 text-sm text-red-700">
            Impossible de charger les leads vendeurs: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border p-6">
          <div className="mb-3">
            <Link className="inline-block rounded border px-3 py-1 text-sm" href="/">
              Retour accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Back-office leads vendeurs</h1>
          <p className="mt-2 text-sm opacity-70">
            Vue operationnelle minimale du sprint 1.1.
          </p>
        </section>

        <section className="rounded-2xl border p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Nom</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Ville</th>
                <th className="p-3 font-medium">Delai</th>
                <th className="p-3 font-medium">Statut</th>
                <th className="p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="p-3 opacity-70" colSpan={7}>
                    Aucun lead vendeur pour le moment.
                  </td>
                </tr>
              ) : (
                data.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0">
                    <td className="p-3">{formatDate(lead.created_at)}</td>
                    <td className="p-3">{lead.full_name}</td>
                    <td className="p-3">{lead.email}</td>
                    <td className="p-3">{lead.city ?? "-"}</td>
                    <td className="p-3">{lead.timeline ?? "-"}</td>
                    <td className="p-3">{formatStatusLabel(lead.status)}</td>
                    <td className="p-3">
                      <Link className="underline" href={`/admin/seller-leads/${lead.id}`}>
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
