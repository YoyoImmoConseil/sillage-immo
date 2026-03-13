import { AdminShell } from "@/app/components/admin-shell";
import { hasAdminPermission, requireAdminPagePermission } from "@/lib/admin/auth";
import { listAdminUsers } from "@/services/admin/admin-user.service";
import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const context = await requireAdminPagePermission("admin.users.view");
  const users = await listAdminUsers();

  return (
    <AdminShell
      title="Utilisateurs & roles"
      description="Gestion simple des acces internes collaborateur, manager et administrateur."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <UsersManager users={users} canManage={hasAdminPermission(context, "admin.users.manage")} />
    </AdminShell>
  );
}
