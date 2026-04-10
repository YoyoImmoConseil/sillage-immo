import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { getClientById } from "@/services/clients/client-profile.service";
import { CreateProjectForm } from "./create-project-form";

export const dynamic = "force-dynamic";

type NewProjectPageProps = { params: Promise<{ id: string }> };

export default async function NewProjectPage({ params }: NewProjectPageProps) {
  const context = await requireAdminPagePermission("clients.create");
  const { id: clientId } = await params;

  const client = await getClientById(clientId);
  if (!client) redirect("/admin/clients");

  return (
    <AdminShell
      title="Creer un projet vendeur"
      description={`Client: ${client.full_name ?? client.email}`}
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href={`/admin/clients/${clientId}`} className="text-sm underline text-[#141446]">
          Retour au client
        </Link>
      </div>
      <CreateProjectForm clientId={clientId} clientEmail={client.email} />
    </AdminShell>
  );
}
