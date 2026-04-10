import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission, hasAdminPermission } from "@/lib/admin/auth";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";
import { SellerLeadStatusForm } from "./status-form";
import { SellerLeadScoreCard } from "./score-card";
import { PropertyDetailsForm } from "./property-details-form";
import { ValuationSyncCard } from "./valuation-sync-card";
import { buildSellerLeadDetailViewModel } from "./seller-lead-detail-view-model";
import { CreateClientSpaceButton } from "./create-client-space-button";

export const dynamic = "force-dynamic";

const formatDate = (value: string) => {
  return new Date(value).toLocaleString("fr-FR");
};

type SellerLeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellerLeadDetailPage({ params }: SellerLeadDetailPageProps) {
  const context = await requireAdminPagePermission("leads.sellers.view");

  const { id } = await params;
  const { data: leadData, error } = await supabaseAdmin
    .from("seller_leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: latestScoreEventData } = await supabaseAdmin
    .from("seller_scoring_events")
    .select("created_at, score, segment, next_best_action, breakdown")
    .eq("seller_lead_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestScoreEvent = latestScoreEventData as
    | Pick<
        Database["public"]["Tables"]["seller_scoring_events"]["Row"],
        "created_at" | "score" | "segment" | "next_best_action" | "breakdown"
      >
    | null;

  if (error) {
    return (
      <main className="min-h-screen bg-[#f4ece4] p-6 md:p-10 xl:p-14 2xl:p-20">
        <div className="w-full rounded-2xl border border-[rgba(20,20,70,0.22)] p-6">
          <h1 className="text-2xl font-semibold">Lead vendeur</h1>
          <p className="mt-3 text-sm text-red-700">
            Erreur de chargement: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const lead = leadData as Database["public"]["Tables"]["seller_leads"]["Row"] | null;
  if (!lead) notFound();
  const viewModel = buildSellerLeadDetailViewModel(lead, latestScoreEvent);

  const { data: sellerProjectData } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id")
    .eq("seller_lead_id", lead.id)
    .maybeSingle();
  const sellerProject = sellerProjectData as { id: string; client_project_id: string } | null;

  let clientProfileId: string | null = null;
  if (sellerProject) {
    const { data: cp } = await supabaseAdmin
      .from("client_projects")
      .select("client_profile_id")
      .eq("id", sellerProject.client_project_id)
      .single();
    clientProfileId = (cp as { client_profile_id?: string } | null)?.client_profile_id ?? null;
  }

  const canCreateClient = hasAdminPermission(context, "clients.create");

  return (
    <AdminShell
      title={lead.full_name}
      description={`Cree le ${formatDate(lead.created_at)} · ${lead.email}`}
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="w-full space-y-6">
        <section className="rounded-2xl bg-[#141446] p-6 text-[#f4ece4] space-y-2">
          <div className="flex gap-2">
            <Link
              className="inline-block rounded border border-[#f4ece4] px-3 py-1 text-sm"
              href="/admin/seller-leads"
            >
              Retour a la liste
            </Link>
            <Link className="inline-block rounded border border-[#f4ece4] px-3 py-1 text-sm" href="/">
              Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{lead.full_name}</h1>
          <p className="text-sm text-[#f4ece4]/75">
            Cree le {formatDate(lead.created_at)} - {lead.email}
          </p>
        </section>

        {canCreateClient && (
          <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] bg-white/70 p-6">
            <h2 className="sillage-section-title">Espace client</h2>
            {sellerProject && clientProfileId ? (
              <p className="mt-4">
                <Link
                  href={`/admin/clients/${clientProfileId}/projects/${sellerProject.client_project_id}`}
                  className="sillage-btn inline-block rounded px-4 py-2 text-sm"
                >
                  Ouvrir l&apos;espace client vendeur
                </Link>
              </p>
            ) : (
              <CreateClientSpaceButton sellerLeadId={lead.id} />
            )}
          </section>
        )}

        <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6 space-y-4">
          <h2 className="sillage-section-title">Pilotage commercial</h2>
          <p className="text-sm opacity-70">
            Statut actuel: {viewModel.statusLabel}
          </p>
          <SellerLeadStatusForm sellerLeadId={lead.id} initialStatus={lead.status} />
        </section>

        <SellerLeadScoreCard
          sellerLeadId={lead.id}
          latestScore={viewModel.latestScore}
          aiInsight={viewModel.aiInsight}
        />

        <PropertyDetailsForm
          sellerLeadId={lead.id}
          initial={viewModel.propertyDetailsFormInitial}
        />

        <ValuationSyncCard
          sellerLeadId={lead.id}
          valuation={viewModel.valuationSummary}
        />

        <section className="rounded-2xl border border-[rgba(20,20,70,0.22)] p-6">
          <h2 className="sillage-section-title">Informations vendeur</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="opacity-70">Telephone</dt>
              <dd>{lead.phone ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Type de bien</dt>
              <dd>{formatPropertyTypeLabel(lead.property_type) ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Adresse</dt>
              <dd>{lead.property_address ?? "-"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Ville</dt>
              <dd>
                {lead.city ?? "-"} {lead.postal_code ?? ""}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Delai de vente</dt>
              <dd>{viewModel.timelineLabel}</dd>
            </div>
            <div>
              <dt className="opacity-70">Occupation</dt>
              <dd>{viewModel.occupancyLabel}</dd>
            </div>
            <div>
              <dt className="opacity-70">Ascenseur</dt>
              <dd>{viewModel.propertyDetailsView.elevator}</dd>
            </div>
            <div>
              <dt className="opacity-70">Etat appartement</dt>
              <dd>{viewModel.propertyDetailsView.apartmentCondition}</dd>
            </div>
            <div>
              <dt className="opacity-70">Age immeuble</dt>
              <dd>{viewModel.propertyDetailsView.buildingAge}</dd>
            </div>
            <div>
              <dt className="opacity-70">Vue mer</dt>
              <dd>{viewModel.propertyDetailsView.seaView}</dd>
            </div>
            <div>
              <dt className="opacity-70">Nombre d&apos;etages immeuble</dt>
              <dd>{viewModel.propertyDetailsView.buildingTotalFloors}</dd>
            </div>
            <div>
              <dt className="opacity-70">Dernier etage</dt>
              <dd>{viewModel.propertyDetailsView.isTopFloor}</dd>
            </div>
            <div>
              <dt className="opacity-70">Terrasse</dt>
              <dd>{viewModel.propertyDetailsView.terrace}</dd>
            </div>
            <div>
              <dt className="opacity-70">Taille terrasse</dt>
              <dd>{viewModel.propertyDetailsView.terraceArea}</dd>
            </div>
            <div>
              <dt className="opacity-70">Balcon</dt>
              <dd>{viewModel.propertyDetailsView.balcony}</dd>
            </div>
            <div>
              <dt className="opacity-70">Taille balcon</dt>
              <dd>{viewModel.propertyDetailsView.balconyArea}</dd>
            </div>
            <div>
              <dt className="opacity-70">Exposition sejour</dt>
              <dd>{viewModel.propertyDetailsView.livingExposure}</dd>
            </div>
            <div>
              <dt className="opacity-70">Temporalite projet</dt>
              <dd>{viewModel.propertyDetailsView.projectTemporality}</dd>
            </div>
            <div>
              <dt className="opacity-70">Diagnostics prets</dt>
              <dd>{lead.diagnostics_ready === null ? "-" : lead.diagnostics_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement diagnostics</dt>
              <dd>
                {lead.diagnostics_support_needed === null
                  ? "-"
                  : lead.diagnostics_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div>
              <dt className="opacity-70">Documents syndic prets</dt>
              <dd>{lead.syndic_docs_ready === null ? "-" : lead.syndic_docs_ready ? "Oui" : "Non"}</dd>
            </div>
            <div>
              <dt className="opacity-70">Accompagnement syndic</dt>
              <dd>
                {lead.syndic_support_needed === null
                  ? "-"
                  : lead.syndic_support_needed
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="opacity-70">Message</dt>
              <dd>{lead.message ?? "-"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </AdminShell>
  );
}
