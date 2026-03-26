import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSellerPageContext } from "@/lib/client-space/auth";
import { listSellerPortalProjects } from "@/services/clients/seller-portal.service";
import { MANDATE_STATUS_LABELS, SELLER_PROJECT_STATUS_LABELS } from "@/types/domain/client";

export default async function SellerPortalHomePage() {
  const context = await requireSellerPageContext();
  const projects = await listSellerPortalProjects(context.clientProfile.id);

  if (projects.length === 1) {
    redirect(`/espace-client/projets/${projects[0].id}`);
  }

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-2xl font-semibold text-[#141446]">
          Bonjour {context.clientProfile.firstName ?? context.clientProfile.fullName ?? "et bienvenue"}
        </h2>
        <p className="mt-2 text-sm text-[#141446]/75">
          Retrouvez ici vos projets vendeurs, votre valuation et les prochains echanges avec Sillage Immo.
        </p>
      </section>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-8">
        <h2 className="text-xl font-semibold text-[#141446]">Vos projets</h2>
        {projects.length === 0 ? (
          <p className="mt-4 text-sm text-[#141446]/75">
            Aucun projet vendeur n'est encore rattache a votre compte.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/espace-client/projets/${project.id}`}
                className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-5 transition hover:border-[rgba(20,20,70,0.28)]"
              >
                <p className="text-sm font-semibold text-[#141446]">
                  {project.title ?? "Projet vendeur"}
                </p>
                <p className="mt-2 text-sm text-[#141446]/75">
                  {project.projectStatus
                    ? SELLER_PROJECT_STATUS_LABELS[
                        project.projectStatus as keyof typeof SELLER_PROJECT_STATUS_LABELS
                      ] ?? project.projectStatus
                    : "Statut a definir"}
                </p>
                <p className="mt-1 text-sm text-[#141446]/70">
                  Mandat :{" "}
                  {project.mandateStatus
                    ? MANDATE_STATUS_LABELS[
                        project.mandateStatus as keyof typeof MANDATE_STATUS_LABELS
                      ] ?? project.mandateStatus
                    : "Aucun"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
