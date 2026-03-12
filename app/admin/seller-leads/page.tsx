import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

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

const formatTimelineLabel = (timeline: string | null) => {
  switch (timeline) {
    case "immediate":
      return "Immediat";
    case "3_months":
      return "Sous 3 mois";
    case "6_months":
      return "Sous 6 mois";
    case "future":
      return "Projet futur";
    default:
      return timeline ?? "-";
  }
};

export default async function SellerLeadsAdminPage() {
  const { data: rows, error } = await supabaseAdmin
    .from("seller_leads")
    .select("id, created_at, full_name, email, city, timeline, status")
    .order("created_at", { ascending: false })
    .limit(100);
  const data =
    (rows as Array<
      Pick<
        Database["public"]["Tables"]["seller_leads"]["Row"],
        "id" | "created_at" | "full_name" | "email" | "city" | "timeline" | "status"
      >
    > | null) ?? [];

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4ece4] p-6 md:p-10 xl:p-14 2xl:p-20">
        <div className="w-full rounded-2xl border border-[rgba(20,20,70,0.22)] p-6">
          <h1 className="text-2xl font-semibold">Leads vendeurs</h1>
          <p className="mt-3 text-sm text-red-700">
            Impossible de charger les leads vendeurs: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <section className="bg-[#141446] text-[#f4ece4]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20">
          <div className="mb-3">
            <Link className="inline-block rounded border border-[#f4ece4] px-3 py-1 text-sm" href="/">
              Retour accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Back-office leads vendeurs</h1>
          <p className="mt-2 text-sm text-[#f4ece4]/75">
            Vue operationnelle minimale du sprint 1.1.
          </p>
        </div>
      </section>
      <section className="bg-[#f4ece4]">
        <div className="w-full px-6 py-8 md:px-10 xl:px-14 2xl:px-20">
          <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-2">
            <div className="mb-3">
              <p className="px-3 pt-2 text-sm opacity-75">Derniers leads vendeurs</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(20,20,70,0.2)] text-left">
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
                    <tr key={lead.id} className="border-b border-[rgba(20,20,70,0.15)] last:border-0">
                      <td className="p-3">{formatDate(lead.created_at)}</td>
                      <td className="p-3">{lead.full_name}</td>
                      <td className="p-3">{lead.email}</td>
                      <td className="p-3">{lead.city ?? "-"}</td>
                      <td className="p-3">{formatTimelineLabel(lead.timeline)}</td>
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
      </section>
    </main>
  );
}
