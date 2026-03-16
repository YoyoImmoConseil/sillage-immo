import { notFound } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { UserProfileForm } from "./user-profile-form";
import { hasAdminPermission, requireAdminPagePermission } from "@/lib/admin/auth";
import { getAdminUserById } from "@/services/admin/admin-user.service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const context = await requireAdminPagePermission("admin.users.view");
  const { id } = await params;
  const user = await getAdminUserById(id);

  if (!user) {
    notFound();
  }

  return (
    <AdminShell
      title="Fiche utilisateur"
      description="Photo portrait, presentation publique et coordonnees de l'equipe."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <UserProfileForm
        user={user}
        canManage={hasAdminPermission(context, "admin.users.manage")}
      />
    </AdminShell>
  );
}
