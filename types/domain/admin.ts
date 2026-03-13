export type AdminRole = "collaborateur" | "manager" | "administrateur";

export type AdminPermission =
  | "admin.dashboard.view"
  | "admin.users.view"
  | "admin.users.manage"
  | "leads.sellers.view"
  | "leads.sellers.manage"
  | "leads.buyers.view"
  | "leads.buyers.manage"
  | "properties.view"
  | "properties.manage"
  | "properties.publish"
  | "matching.view"
  | "matching.manage"
  | "operations.view";

export type AdminProfileSnapshot = {
  id: string;
  authUserId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  isActive: boolean;
  role: AdminRole;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  collaborateur: "Collaborateur",
  manager: "Manager",
  administrateur: "Administrateur",
};

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  collaborateur: [
    "admin.dashboard.view",
    "leads.sellers.view",
    "leads.sellers.manage",
    "leads.buyers.view",
    "leads.buyers.manage",
    "properties.view",
    "properties.manage",
    "matching.view",
  ],
  manager: [
    "admin.dashboard.view",
    "leads.sellers.view",
    "leads.sellers.manage",
    "leads.buyers.view",
    "leads.buyers.manage",
    "properties.view",
    "properties.manage",
    "properties.publish",
    "matching.view",
    "matching.manage",
    "operations.view",
  ],
  administrateur: [
    "admin.dashboard.view",
    "admin.users.view",
    "admin.users.manage",
    "leads.sellers.view",
    "leads.sellers.manage",
    "leads.buyers.view",
    "leads.buyers.manage",
    "properties.view",
    "properties.manage",
    "properties.publish",
    "matching.view",
    "matching.manage",
    "operations.view",
  ],
};
