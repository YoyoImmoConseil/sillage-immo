import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SellerLeadStatusForm } from "./status-form";

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

type SellerLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellerLeadDetailPage({ params }: SellerLeadDetailPageProps) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border p-6">
          <h1 className="text-2xl font-semibold">Lead vendeur</h1>
          <p className="mt-3 text-sm text-red-700">
            Erreur de chargement: {error.message}
          </p>
        </div>
      </main>
    );
  }

  if (!data) notFound();

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border p-6 space-y-2">
          <div className="flex gap-2">
            <Link
              className="inline-block rounded border px-3 py-1 text-sm"
              href="/admin/seller-leads"
            >
              Retour a la liste
            </Link>
            <Link className="inline-block rounded border px-3 py-1 text-sm" href="/">
              Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{data.full_name}</h1>
          <p className="text-sm opacity-70">
            Cree le {formatDate(data.created_at)} - {data.email}
          </p>
        </section>

        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-lg font-medium">Pilotage commercial</h2>
          <p className="text-sm opacity-70">
            Statut actuel: {formatStatusLabel(data.status)}
          </p>
          <SellerLeadStatusForm sellerLeadId={data.id} initialStatus={data.status} />
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="text-lg font-medium">Informations vendeur</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-70">Telephone</dt>
              <dd>{data.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Type de bien</dt>
              <dd>{data.property_type ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Adresse</dt>
              <dd>{data.property_address ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Ville</dt>
              <dd>
                {data.city ?? "-"} {data.postal_code ?? ""}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Delai de vente</dt>
              <dd>{data.timeline ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Occupation</dt>
              <dd>{data.occupancy_status ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Diagnostics prets</dt>
              <dd>{data.diagnostics_ready === null ? "-" : data.diagnostics_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement diagnostics</dt>
              <dd>
                {data.diagnostics_support_needed === null
                  ? "-"
                  : data.diagnostics_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Documents syndic prets</dt>
              <dd>{data.syndic_docs_ready === null ? "-" : data.syndic_docs_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement syndic</dt>
              <dd>
                {data.syndic_support_needed === null
                  ? "-"
                  : data.syndic_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="opacity-70">Message</dt>
              <dd>{data.message ?? "-"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
