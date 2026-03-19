import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission, hasAdminPermission } from "@/lib/admin/auth";
import { getClientById } from "@/services/clients/client-profile.service";
import { getClientProjectsByClientId } from "@/services/clients/client-project.service";
import { ClientDetailForm } from "./client-detail-form";

export const dynamic = "force-dynamic";

type ClientDetailPageProps = { params: Promise<{ id: string }> };

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const context = await requireAdminPagePermission("clients.view");
  const { id } = await params;

  const client = await getClientById(id);
  if (!client) notFound();

  const projects = await getClientProjectsByClientId(id);
  const canEdit = hasAdminPermission(context, "clients.edit");
  const canCreate = hasAdminPermission(context, "clients.create");

  return (
    <AdminShell
      title={client.full_name ?? client.email}
      description={`${client.email}${client.phone ? ` · ${client.phone}` : ""}`}
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/clients" className="text-sm underline text-[#141446]">
          Retour aux clients
        </Link>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Identite</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Nom</p>
              <p className="text-[#141446]">{client.full_name ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Email</p>
              <p className="text-[#141446]">{client.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Telephone</p>
              <p className="text-[#141446]">{client.phone ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Statut compte</p>
              <p className="text-[#141446]">{client.auth_user_id ? "Compte active" : "Prospect"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-[#141446]/60">Derniere connexion</p>
              <p className="text-[#141446]">{client.last_login_at ? formatDate(client.last_login_at) : "-"}</p>
            </div>
          </div>
          {canEdit && (
            <div className="mt-4">
              <ClientDetailForm
                clientId={id}
                initial={{
                  firstName: client.first_name ?? "",
                  lastName: client.last_name ?? "",
                  email: client.email,
                  phone: client.phone ?? "",
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#141446]">Projets vendeur</h2>
            {canCreate && (
              <Link
                href={`/admin/clients/${id}/projects/new`}
                className="sillage-btn rounded px-4 py-2 text-sm"
              >
                Creer un projet vendeur
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {projects.length === 0 ? (
              <p className="text-sm text-[#141446]/70">Aucun projet vendeur.</p>
            ) : (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/clients/${id}/projects/${p.id}`}
                  className="block rounded-xl border border-[rgba(20,20,70,0.12)] p-4 transition hover:border-[rgba(20,20,70,0.25)]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#141446]">
                        {p.title ?? `Projet ${p.id.slice(0, 8)}`}
                      </p>
                      <p className="text-sm text-[#141446]/70">
                        {p.sellerProject?.projectStatus ?? "-"} · {p.propertyCount} bien(s)
                      </p>
                    </div>
                    <span className="text-sm text-[#141446]/60">Ouvrir →</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
