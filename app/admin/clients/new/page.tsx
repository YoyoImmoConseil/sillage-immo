import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { CreateClientForm } from "./create-client-form";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const context = await requireAdminPagePermission("clients.create");

  return (
    <AdminShell
      title="Creer un client"
      description="Ajouter un client manuellement (cas CRM direct)."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/clients" className="text-sm underline text-[#141446]">
          Retour aux clients
        </Link>
      </div>
      <CreateClientForm />
    </AdminShell>
  );
}
