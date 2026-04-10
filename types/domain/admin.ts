export type AdminRole = "collaborateur" | "manager" | "administrateur";

export type AdminTeamTitle =
  | "Directeur"
  | "Manager"
  | "Conseiller Senior"
  | "Conseiller Junior"
  | "Stagiaire";

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
  | "operations.view"
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.invite"
  | "clients.assign_advisor";

export type AdminProfileSnapshot = {
  id: string;
  authUserId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  isActive: boolean;
  role: AdminRole;
  title: AdminTeamTitle | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bookingUrl: string | null;
};

export const ADMIN_TEAM_TITLES: AdminTeamTitle[] = [
  "Directeur",
  "Manager",
  "Conseiller Senior",
  "Conseiller Junior",
  "Stagiaire",
];

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
    "clients.view",
    "clients.assign_advisor",
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
    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.invite",
    "clients.assign_advisor",
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
    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.invite",
    "clients.assign_advisor",
  ],
};
