import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission, hasAdminPermission } from "@/lib/admin/auth";
import { isClientPortalDirectAccessEnabled } from "@/lib/client-space/direct-access";
import { serverEnv } from "@/lib/env/server";
import { getClientById } from "@/services/clients/client-profile.service";
import {
  getClientProjectById,
  listProjectMembersForAdmin,
} from "@/services/clients/client-project.service";
import { getBuyerProjectDetailForAdmin } from "@/services/buyers/buyer-lead.service";
import { listMatchesForBuyerLead } from "@/services/buyers/buyer-matching.service";
import { BuyerProjectView } from "./buyer-project-view";
import { ProjectMembersManager } from "./project-members";
import {
  getSellerProjectDetail,
  getSellerProjectByClientProjectId,
} from "@/services/clients/seller-project.service";
import { getProjectEvents } from "@/services/clients/client-project-invitation.service";
import { listActiveAdvisors } from "@/services/admin/admin-user.service";
import { SELLER_PROJECT_STATUS_LABELS } from "@/types/domain/client";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import { computePropertyGoldenRecord } from "@/services/properties/golden-record.service";
import { SellerProjectActions } from "./seller-project-actions";
import { InviteButton } from "./invite-button";
import { AssignAdvisorForm } from "./assign-advisor-form";
import { MilestonesForm } from "./milestones-form";
import { UnifiedPropertyCard } from "./unified-property-card";

export const dynamic = "force-dynamic";

type ProjectDetailPageProps = {
  params: Promise<{ id: string; projectId: string }>;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

const formatInvitationStatus = (input: {
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
}) => {
  if (input.revokedAt) return "Révoquée";
  if (input.acceptedAt) return "Acceptée";
  if (new Date(input.expiresAt).getTime() < Date.now()) return "Expirée";
  return "En attente";
};

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const context = await requireAdminPagePermission("clients.view");
  const { id: clientId, projectId } = await params;

  const client = await getClientById(clientId);
  if (!client) notFound();

  const clientProject = await getClientProjectById(projectId);
  if (!clientProject || clientProject.client_profile_id !== clientId) notFound();

  if (clientProject.project_type === "buyer") {
    const buyerDetail = await getBuyerProjectDetailForAdmin(projectId);
    if (!buyerDetail) notFound();
    const [matches, buyerMembers] = await Promise.all([
      listMatchesForBuyerLead(buyerDetail.buyerLeadId),
      listProjectMembersForAdmin(projectId),
    ]);
    const canEditBuyer = hasAdminPermission(context, "clients.edit");
    const canInviteBuyer = hasAdminPermission(context, "clients.invite");
    return (
      <AdminShell
        title={client.full_name ?? client.email}
        description="Projet acquéreur · recherche et rapprochements."
        role={context.role}
        profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
      >
        <div className="mb-4 flex flex-wrap gap-4">
          <Link href={`/admin/clients/${clientId}`} className="text-sm underline text-navy">
            Retour au client
          </Link>
          <Link
            href={`/admin/buyer-leads/${buyerDetail.buyerLeadId}`}
            className="text-sm underline text-navy"
          >
            Voir le lead acquéreur
          </Link>
        </div>
        <div className="space-y-6">
          <ProjectMembersManager
            clientId={clientId}
            projectId={projectId}
            members={buyerMembers}
            canEdit={canEditBuyer}
            canInvite={canInviteBuyer}
          />
          <BuyerProjectView
            buyerLeadId={buyerDetail.buyerLeadId}
            project={{
              title: clientProject.title,
              status: clientProject.status,
              createdAt: clientProject.created_at,
            }}
            client={{
              fullName: client.full_name,
              email: client.email,
              phone: client.phone,
              authUserId: client.auth_user_id,
              lastLoginAt: client.last_login_at,
            }}
            lead={buyerDetail.lead}
            searchProfile={buyerDetail.searchProfile}
            matches={matches}
          />
        </div>
      </AdminShell>
    );
  }

  const detail = await getSellerProjectDetail(projectId);
  if (!detail) notFound();

  const events = await getProjectEvents(projectId, 20);
  const canEdit = hasAdminPermission(context, "clients.edit");
  const canInvite = hasAdminPermission(context, "clients.invite");
  const canAssignAdvisor = hasAdminPermission(context, "clients.assign_advisor");
  const canUseDirectAccessLink = isClientPortalDirectAccessEnabled(
    serverEnv.PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL
  );

  const sellerProjectRow = await getSellerProjectByClientProjectId(projectId);
  const goldenRecord = await computePropertyGoldenRecord(projectId);
  const advisors = canAssignAdvisor ? await listActiveAdvisors() : [];
  const sellerMembers = await listProjectMembersForAdmin(projectId);

  return (
    <AdminShell
      title={detail.sellerLead?.full_name ?? "Projet vendeur"}
      description={`${detail.entryChannel} · ${SELLER_PROJECT_STATUS_LABELS[detail.projectStatus as keyof typeof SELLER_PROJECT_STATUS_LABELS] ?? detail.projectStatus}`}
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <Link href={`/admin/clients/${clientId}`} className="text-sm underline text-navy">
          Retour au client
        </Link>
        {detail.sellerLead && (
          <Link
            href={`/admin/seller-leads/${detail.sellerLead.id}`}
            className="text-sm underline text-navy"
          >
            Voir le lead vendeur
          </Link>
        )}
      </div>

      <div className="space-y-6">
        <ProjectMembersManager
          clientId={clientId}
          projectId={projectId}
          members={sellerMembers}
          canEdit={canEdit}
          canInvite={canInvite}
        />
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-navy">Rattachements</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase text-navy/60">Lead vendeur</p>
              {detail.sellerLead ? (
                <p className="text-navy">
                  <Link href={`/admin/seller-leads/${detail.sellerLead.id}`} className="underline">
                    {detail.sellerLead.full_name} · {detail.sellerLead.email}
                  </Link>
                  {detail.sellerLead.estimated_price && (
                    <span className="ml-2 text-navy/70">
                      Estimation : {detail.sellerLead.estimated_price.toLocaleString("fr-FR")} EUR
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-navy/70">Aucun lead rattaché</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-navy/60">Biens</p>
              {detail.properties.length === 0 ? (
                <p className="text-navy/70">Aucun bien rattaché</p>
              ) : (
                <ul className="space-y-2">
                  {detail.properties.map((pp) => (
                    <li key={pp.id} className="text-navy">
                      <Link href={`/admin/properties/${pp.propertyId}`} className="underline">
                        {pp.property?.formatted_address ?? pp.propertyId}
                      </Link>
                      {pp.property?.property_type && (
                        <span className="ml-2 text-navy/70">
                          {formatPropertyTypeLabel(pp.property.property_type)}
                          {pp.property.living_area && ` · ${pp.property.living_area} m²`}
                        </span>
                      )}
                      {pp.isPrimary && (
                        <span className="ml-2 text-xs text-navy/60">(principal)</span>
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

        {goldenRecord ? (
          <UnifiedPropertyCard
            clientProjectId={projectId}
            sellerProjectId={sellerProjectRow?.id ?? null}
            initialGolden={goldenRecord}
            canEdit={canEdit}
          />
        ) : null}

        {canEdit ? (
          <MilestonesForm
            sellerProjectId={detail.id}
            initialMilestones={detail.milestones}
          />
        ) : detail.milestones.mandateSignedAt ||
          detail.milestones.offerReceivedAt ||
          detail.milestones.preliminarySaleSignedAt ||
          detail.milestones.deedSignedAt ? (
          <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
            <h2 className="text-xl font-semibold text-navy">Étapes du projet</h2>
            <ul className="mt-3 space-y-1 text-sm text-navy">
              {detail.milestones.mandateSignedAt ? (
                <li>Mandat signé le {formatDate(detail.milestones.mandateSignedAt)}</li>
              ) : null}
              {detail.milestones.offerReceivedAt ? (
                <li>
                  Offre reçue le {formatDate(detail.milestones.offerReceivedAt)}
                  {detail.milestones.offerBuyerLead
                    ? ` — ${detail.milestones.offerBuyerLead.fullName ?? detail.milestones.offerBuyerLead.email}`
                    : detail.milestones.offerBuyerName
                      ? ` — ${detail.milestones.offerBuyerName}`
                      : ""}
                </li>
              ) : null}
              {detail.milestones.preliminarySaleSignedAt ? (
                <li>
                  Compromis signé le {formatDate(detail.milestones.preliminarySaleSignedAt)}
                </li>
              ) : null}
              {detail.milestones.deedSignedAt ? (
                <li>Acte signé le {formatDate(detail.milestones.deedSignedAt)}</li>
              ) : null}
            </ul>
          </section>
        ) : null}

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-navy">Conseiller</h2>
          <div className="mt-4">
            {detail.assignedAdvisor ? (
              <div className="space-y-1 text-navy">
                {(() => {
                  const advisorName =
                    detail.assignedAdvisor.fullName ??
                    ([detail.assignedAdvisor.firstName, detail.assignedAdvisor.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || detail.assignedAdvisor.email);

                  return <p className="font-medium">{advisorName}</p>;
                })()}
                <p className="text-sm">
                  <a href={`mailto:${detail.assignedAdvisor.email}`} className="underline">
                    {detail.assignedAdvisor.email}
                  </a>
                </p>
                <p className="text-sm">{detail.assignedAdvisor.phone ?? "Téléphone non renseigné"}</p>
                <p className="text-sm text-navy/75">
                  Rendez-vous : {detail.assignedAdvisor.bookingUrl ? "lien configuré" : "non configuré"}
                </p>
                {detail.assignedAdvisor.bookingUrl ? (
                  <a
                    href={detail.assignedAdvisor.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    Ouvrir le lien de réservation
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-navy/70">Aucun conseiller affecté</p>
            )}
          </div>
          {canAssignAdvisor && sellerProjectRow && (
            <div className="mt-4">
              <AssignAdvisorForm
                clientId={clientId}
                projectId={projectId}
                advisors={advisors}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-navy">Invitation client</h2>
          <div className="mt-4">
            {detail.latestInvitation ? (
              <div>
                <p className="text-navy">
                  Envoyée le {formatDate(detail.latestInvitation.createdAt)} · expire le{" "}
                  {formatDate(detail.latestInvitation.expiresAt)}
                </p>
                <p className="text-sm text-navy/75">
                  Statut :{" "}
                  {formatInvitationStatus({
                    acceptedAt: detail.latestInvitation.acceptedAt,
                    revokedAt: detail.latestInvitation.revokedAt,
                    expiresAt: detail.latestInvitation.expiresAt,
                  })}
                </p>
                {detail.latestInvitation.acceptedAt && (
                  <p className="text-green-700">Acceptée le {formatDate(detail.latestInvitation.acceptedAt)}</p>
                )}
                {detail.latestInvitation.revokedAt && (
                  <p className="text-red-700">Révoquée</p>
                )}
              </div>
            ) : (
              <p className="text-navy/70">Aucune invitation envoyée</p>
            )}
          </div>
          {canInvite && (
            <div className="mt-4">
              <InviteButton
                clientId={clientId}
                projectId={projectId}
                latestInvitation={detail.latestInvitation}
                showDirectAccessButton={canUseDirectAccessLink}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-navy">Timeline</h2>
          <div className="mt-4 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-navy/70">Aucun événement</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-navy/60">{formatDate(ev.created_at)}</span>
                  <span className="text-navy">{ev.event_name}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
