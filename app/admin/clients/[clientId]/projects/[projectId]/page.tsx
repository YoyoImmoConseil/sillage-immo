import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission, hasAdminPermission } from "@/lib/admin/auth";
import { getClientById } from "@/services/clients/client-profile.service";
import { getClientProjectById } from "@/services/clients/client-project.service";
import {
  getSellerProjectDetail,
  getSellerProjectByClientProjectId,
} from "@/services/clients/seller-project.service";
import { getProjectEvents } from "@/services/clients/client-project-invitation.service";
import {
  SELLER_PROJECT_STATUS_LABELS,
  MANDATE_STATUS_LABELS,
} from "@/types/domain/client";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { SellerProjectActions } from "./seller-project-actions";
import { InviteButton } from "./invite-button";
import { AssignAdvisorForm } from "./assign-advisor-form";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ clientId: string; projectId: string }>;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const context = await requireAdminPagePermission("clients.view");
  const { clientId, projectId } = await params;

  const client = await getClientById(clientId);
  if (!client) notFound();

  const clientProject = await getClientProjectById(projectId);
  if (!clientProject || clientProject.client_profile_id !== clientId) notFound();

  const detail = await getSellerProjectDetail(projectId);
  if (!detail) notFound();

  const events = await getProjectEvents(projectId, 20);
  const canEdit = hasAdminPermission(context, "clients.edit");
  const canInvite = hasAdminPermission(context, "clients.invite");
  const canAssignAdvisor = hasAdminPermission(context, "clients.assign_advisor");

  const sellerProjectRow = await getSellerProjectByClientProjectId(projectId);

  return (
    <AdminShell
      title={detail.sellerLead?.full_name ?? "Projet vendeur"}
      description={`${detail.entryChannel} · ${SELLER_PROJECT_STATUS_LABELS[detail.projectStatus as keyof typeof SELLER_PROJECT_STATUS_LABELS] ?? detail.projectStatus}`}
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <Link href={`/admin/clients/${clientId}`} className="text-sm underline text-[#141446]">
          Retour au client
        </Link>
        {detail.sellerLead && (
          <Link
            href={`/admin/seller-leads/${detail.sellerLead.id}`}
            className="text-sm underline text-[#141446]"
          >
            Voir le lead vendeur
          </Link>
        )}
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Rattachements</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Lead vendeur</p>
              {detail.sellerLead ? (
                <p className="text-[#141446]">
                  <Link href={`/admin/seller-leads/${detail.sellerLead.id}`} className="underline">
                    {detail.sellerLead.full_name} · {detail.sellerLead.email}
                  </Link>
                  {detail.sellerLead.estimated_price && (
                    <span className="ml-2 text-[#141446]/70">
                      Estimation: {detail.sellerLead.estimated_price.toLocaleString("fr-FR")} €
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[#141446]/70">Aucun lead rattache</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Biens</p>
              {detail.properties.length === 0 ? (
                <p className="text-[#141446]/70">Aucun bien rattache</p>
              ) : (
                <ul className="space-y-2">
                  {detail.properties.map((pp) => (
                    <li key={pp.id} className="text-[#141446]">
                      <Link href={`/admin/properties/${pp.propertyId}`} className="underline">
                        {pp.property?.formatted_address ?? pp.propertyId}
                      </Link>
                      {pp.property?.property_type && (
                        <span className="ml-2 text-[#141446]/70">
                          {formatPropertyTypeLabel(pp.property.property_type)}
                          {pp.property.living_area && ` · ${pp.property.living_area} m²`}
                        </span>
                      )}
                      {pp.isPrimary && (
                        <span className="ml-2 text-xs text-[#141446]/60">(principal)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {canEdit && sellerProjectRow && (
            <div className="mt-4">
              <SellerProjectActions
                clientId={clientId}
                projectId={projectId}
                sellerProjectId={sellerProjectRow.id}
                hasLead={!!detail.sellerLead}
                hasProperties={detail.properties.length > 0}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Conseiller</h2>
          <div className="mt-4">
            {detail.assignedAdminProfileId ? (
              <p className="text-[#141446]">Conseiller affecte (ID: {detail.assignedAdminProfileId})</p>
            ) : (
              <p className="text-[#141446]/70">Aucun conseiller affecte</p>
            )}
          </div>
          {canAssignAdvisor && sellerProjectRow && (
            <div className="mt-4">
              <AssignAdvisorForm
                clientId={clientId}
                projectId={projectId}
                sellerProjectId={sellerProjectRow.id}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Invitation client</h2>
          <div className="mt-4">
            {detail.latestInvitation ? (
              <div>
                <p className="text-[#141446]">
                  Envoyee le {formatDate(detail.latestInvitation.createdAt)} · expire le{" "}
                  {formatDate(detail.latestInvitation.expiresAt)}
                </p>
                {detail.latestInvitation.acceptedAt && (
                  <p className="text-green-700">Acceptee le {formatDate(detail.latestInvitation.acceptedAt)}</p>
                )}
                {detail.latestInvitation.revokedAt && (
                  <p className="text-red-700">Revoquee</p>
                )}
              </div>
            ) : (
              <p className="text-[#141446]/70">Aucune invitation envoyee</p>
            )}
          </div>
          {canInvite && (
            <div className="mt-4">
              <InviteButton clientId={clientId} projectId={projectId} />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Timeline</h2>
          <div className="mt-4 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-[#141446]/70">Aucun evenement</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-[#141446]/60">{formatDate(ev.created_at)}</span>
                  <span className="text-[#141446]">{ev.event_name}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
