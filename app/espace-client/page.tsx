import Link from "next/link";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import {
  getClientPortalMandateLabel,
  groupClientPortalProjects,
  listClientPortalProjects,
} from "@/services/clients/client-portal.service";

const formatDate = (value: string) => new Date(value).toLocaleDateString("fr-FR");

const formatPrice = (value: number | null) =>
  typeof value === "number" ? `${value.toLocaleString("fr-FR")} EUR` : "Aucune estimation détaillée";

export default async function SellerPortalHomePage() {
  const context = await requireClientSpacePageContext();
  const projects = await listClientPortalProjects(context.clientProfile.id);
  const groups = groupClientPortalProjects(projects);
  const sellerProjects = projects.filter((project) => project.projectType === "seller");

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-2xl font-semibold text-[#141446]">
          Bonjour {context.clientProfile.firstName ?? context.clientProfile.fullName ?? "et bienvenue"}
        </h2>
        <p className="mt-2 text-sm text-[#141446]/75">
          Retrouvez ici tous vos projets rattachés à Sillage Immo, leurs prochaines étapes et vos points de
          contact.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Projets rattachés</p>
            <p className="mt-2 text-2xl font-semibold text-[#141446]">{projects.length}</p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Derniere connexion</p>
            <p className="mt-2 text-sm text-[#141446]">
              {context.clientProfile.lastLoginAt
                ? formatDate(context.clientProfile.lastLoginAt)
                : "Première connexion"}
            </p>
          </div>
          <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4">
            <p className="text-xs uppercase text-[#141446]/60">Prochaine étape</p>
            <p className="mt-2 text-sm text-[#141446]">
              {sellerProjects.some((project) => project.seller?.hasAppointmentLink)
                ? "Un rendez-vous peut être réservé en ligne."
                : projects.length > 0
                  ? "Consultez vos projets pour voir la prochaine action recommandée."
                  : "Votre espace client est prêt à accueillir vos prochains projets."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-xl font-semibold text-[#141446]">Vos projets</h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-[#141446]/75">
            Aucun projet n&apos;est encore rattaché à votre compte.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {groups.map((group) => (
              <section key={group.projectType} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#141446]/70">
                    {group.projectTypeLabel}
                  </h3>
                  <span className="text-xs text-[#141446]/55">
                    {group.projects.length} projet{group.projects.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {group.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={project.href}
                      className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-5 transition hover:border-[rgba(20,20,70,0.28)]"
                    >
                      <p className="text-xs uppercase tracking-[0.16em] text-[#141446]/55">
                        {project.projectTypeLabel}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#141446]">
                        {project.title ??
                          (project.projectType === "seller" ? "Projet vendeur" : "Projet client")}
                      </p>
                      <p className="mt-1 text-sm text-[#141446]/70">
                        {project.primaryDescriptor ?? "Projet en cours de qualification"}
                      </p>
                      <p className="mt-2 text-sm text-[#141446]/75">{project.statusLabel}</p>
                      {project.seller ? (
                        <>
                          <p className="mt-1 text-sm text-[#141446]/70">
                            Mandat : {getClientPortalMandateLabel(project.seller.mandateStatus)}
                          </p>
                          <p className="mt-3 text-sm text-[#141446]/80">
                            Estimation : <strong>{formatPrice(project.seller.latestValuationPrice)}</strong>
                          </p>
                        </>
                      ) : null}
                      {project.secondaryDescriptor ? (
                        <p className="mt-1 text-sm text-[#141446]/70">{project.secondaryDescriptor}</p>
                      ) : null}
                      {project.nextAction ? (
                        <p className="mt-1 text-sm text-[#141446]/70">{project.nextAction}</p>
                      ) : null}
                      {project.seller?.latestValuationSyncedAt ? (
                        <p className="mt-1 text-xs text-[#141446]/60">
                          Mise à jour le {formatDate(project.seller.latestValuationSyncedAt)}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
