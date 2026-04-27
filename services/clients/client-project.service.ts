import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClientProjectCreatedFrom, ClientProjectType } from "@/types/domain/client";

export type CreateClientProjectInput = {
  clientProfileId: string;
  projectType: ClientProjectType;
  title?: string;
  createdFrom: ClientProjectCreatedFrom;
  primaryAdminProfileId?: string;
  source?: string;
};

export type ClientProjectRecord = {
  id: string;
  clientProfileId: string;
  projectType: string;
  status: string;
  title: string | null;
  createdFrom: string;
  primaryAdminProfileId: string | null;
  createdAt: string;
  sellerProject: {
    id: string;
    sellerLeadId: string | null;
    assignedAdminProfileId: string | null;
    entryChannel: string;
    projectStatus: string;
    mandateStatus: string;
  } | null;
  propertyCount: number;
};

export type ClientProjectWithSeller = ClientProjectRecord;

type GetClientProjectsOptions = {
  projectTypes?: ClientProjectType[];
};

export const createClientProject = async (input: CreateClientProjectInput) => {
  const { data, error } = await supabaseAdmin
    .from("client_projects")
    .insert({
      client_profile_id: input.clientProfileId,
      project_type: input.projectType,
      title: input.title ?? null,
      created_from: input.createdFrom,
      primary_admin_profile_id: input.primaryAdminProfileId ?? null,
      source: input.source ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Mirror the historical primary into the indivision N:N table so portal
  // access resolution uses a single source of truth going forward.
  const { error: membershipError } = await supabaseAdmin
    .from("client_project_clients")
    .insert({
      client_project_id: data.id,
      client_profile_id: input.clientProfileId,
      role: "primary",
      added_by_admin_profile_id: input.primaryAdminProfileId ?? null,
    });
  if (membershipError) {
    // Roll back the project to keep both tables in sync.
    await supabaseAdmin.from("client_projects").delete().eq("id", data.id);
    throw membershipError;
  }

  return data.id;
};

export const getClientProjectsByClientId = async (
  clientProfileId: string,
  options?: GetClientProjectsOptions
) => {
  const projectTypes = options?.projectTypes ?? ["seller"];
  // Indivision: a client may see projects he owns historically AND
  // projects he is attached to via client_project_clients.
  const accessibleProjectIds = await resolveAccessibleClientProjectIds(clientProfileId);
  if (accessibleProjectIds.length === 0) return [];

  let query = supabaseAdmin
    .from("client_projects")
    .select("*")
    .in("id", accessibleProjectIds)
    .order("created_at", { ascending: false });

  if (projectTypes.length) {
    query = query.in("project_type", projectTypes);
  }

  const { data: projects, error } = await query;
  if (error) throw error;

  const rows = (projects ?? []) as Array<{
    id: string;
    client_profile_id: string;
    project_type: string;
    status: string;
    title: string | null;
    created_from: string;
    primary_admin_profile_id: string | null;
    created_at: string;
  }>;
  const projectIds = rows.map((p) => p.id);
  if (projectIds.length === 0) return [];

  const [sellerProjectsResult, propCountsResult] = await Promise.all([
    supabaseAdmin
      .from("seller_projects")
      .select("id, client_project_id, seller_lead_id, assigned_admin_profile_id, entry_channel, project_status, mandate_status")
      .in("client_project_id", projectIds),
    supabaseAdmin
      .from("project_properties")
      .select("client_project_id")
      .in("client_project_id", projectIds)
      .is("unlinked_at", null),
  ]);
  const sellerProjects = sellerProjectsResult.data;
  const propCounts = propCountsResult.data;

  const sellerByProject = (sellerProjects ?? []).reduce(
    (acc, sp) => {
      acc[sp.client_project_id] = sp;
      return acc;
    },
    {} as Record<string, { id: string; seller_lead_id: string | null; assigned_admin_profile_id: string | null; entry_channel: string; project_status: string; mandate_status: string }>
  );
  const countByProject = (propCounts ?? []).reduce(
    (acc, r) => {
      acc[r.client_project_id] = (acc[r.client_project_id] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return rows.map((p) => ({
    id: p.id,
    clientProfileId: p.client_profile_id,
    projectType: p.project_type,
    status: p.status,
    title: p.title,
    createdFrom: p.created_from,
    primaryAdminProfileId: p.primary_admin_profile_id,
    createdAt: p.created_at,
    sellerProject: sellerByProject[p.id]
      ? {
          id: sellerByProject[p.id].id,
          sellerLeadId: sellerByProject[p.id].seller_lead_id,
          assignedAdminProfileId: sellerByProject[p.id].assigned_admin_profile_id,
          entryChannel: sellerByProject[p.id].entry_channel,
          projectStatus: sellerByProject[p.id].project_status,
          mandateStatus: sellerByProject[p.id].mandate_status,
        }
      : null,
    propertyCount: countByProject[p.id] ?? 0,
  }));
};

export type ClientProjectRow = {
  id: string;
  client_profile_id: string;
  project_type: string;
  status: string;
  title: string | null;
  created_from: string;
  primary_admin_profile_id: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  metadata: Record<string, unknown>;
};

export const getClientProjectById = async (id: string): Promise<ClientProjectRow | null> => {
  const { data, error } = await supabaseAdmin
    .from("client_projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ClientProjectRow | null;
};

// =====================================================================
// Indivision (N:N client_project_clients)
// =====================================================================
//
// Source of truth for portal access: a client profile is considered
// attached to a project either via the legacy 1:1
// `client_projects.client_profile_id` (the "historical primary") OR via
// any active row in `client_project_clients` (role primary | co_owner,
// removed_at IS NULL). Always combine the two when resolving access.

export type ClientProjectClientRole = "primary" | "co_owner";

export type ClientProjectMembership = {
  id: string;
  clientProjectId: string;
  clientProfileId: string;
  role: ClientProjectClientRole;
  addedByAdminProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapMembershipRow = (row: {
  id: string;
  client_project_id: string;
  client_profile_id: string;
  role: ClientProjectClientRole;
  added_by_admin_profile_id: string | null;
  created_at: string;
  updated_at: string;
}): ClientProjectMembership => ({
  id: row.id,
  clientProjectId: row.client_project_id,
  clientProfileId: row.client_profile_id,
  role: row.role,
  addedByAdminProfileId: row.added_by_admin_profile_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Add a client_profile to a client_project. Idempotent: if an active
 * membership already exists (same project + same client), the row is
 * returned untouched.
 */
export const addClientToProject = async (input: {
  clientProjectId: string;
  clientProfileId: string;
  role: ClientProjectClientRole;
  adminProfileId?: string | null;
}): Promise<ClientProjectMembership> => {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("client_project_clients")
    .select("id, client_project_id, client_profile_id, role, added_by_admin_profile_id, created_at, updated_at")
    .eq("client_project_id", input.clientProjectId)
    .eq("client_profile_id", input.clientProfileId)
    .is("removed_at", null)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return mapMembershipRow(existing);

  const { data, error } = await supabaseAdmin
    .from("client_project_clients")
    .insert({
      client_project_id: input.clientProjectId,
      client_profile_id: input.clientProfileId,
      role: input.role,
      added_by_admin_profile_id: input.adminProfileId ?? null,
    })
    .select("id, client_project_id, client_profile_id, role, added_by_admin_profile_id, created_at, updated_at")
    .single();
  if (error || !data) {
    throw error ?? new Error("Impossible d'ajouter le client au projet.");
  }
  return mapMembershipRow(data);
};

export const removeClientFromProject = async (input: {
  clientProjectId: string;
  clientProfileId: string;
}) => {
  const { error } = await supabaseAdmin
    .from("client_project_clients")
    .update({
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("client_project_id", input.clientProjectId)
    .eq("client_profile_id", input.clientProfileId)
    .is("removed_at", null);
  if (error) throw error;
};

/**
 * List all client profiles attached to a project (legacy primary +
 * indivision rows). The legacy primary is always returned first when
 * present, regardless of the timestamp ordering.
 */
export const listClientsForProject = async (
  clientProjectId: string
): Promise<
  Array<{
    clientProfileId: string;
    role: ClientProjectClientRole;
    isLegacyPrimary: boolean;
  }>
> => {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("client_projects")
    .select("client_profile_id")
    .eq("id", clientProjectId)
    .maybeSingle();
  if (projectError) throw projectError;

  const legacyPrimaryId = project?.client_profile_id ?? null;

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("client_project_clients")
    .select("client_profile_id, role, created_at")
    .eq("client_project_id", clientProjectId)
    .is("removed_at", null)
    .order("created_at", { ascending: true });
  if (membershipsError) throw membershipsError;

  const seen = new Set<string>();
  const ordered: Array<{
    clientProfileId: string;
    role: ClientProjectClientRole;
    isLegacyPrimary: boolean;
  }> = [];

  if (legacyPrimaryId) {
    const legacyMembership = (memberships ?? []).find(
      (m) => m.client_profile_id === legacyPrimaryId
    );
    ordered.push({
      clientProfileId: legacyPrimaryId,
      role: (legacyMembership?.role as ClientProjectClientRole) ?? "primary",
      isLegacyPrimary: true,
    });
    seen.add(legacyPrimaryId);
  }

  for (const m of memberships ?? []) {
    if (seen.has(m.client_profile_id)) continue;
    ordered.push({
      clientProfileId: m.client_profile_id,
      role: m.role as ClientProjectClientRole,
      isLegacyPrimary: false,
    });
    seen.add(m.client_profile_id);
  }

  return ordered;
};

/**
 * True iff the given client_profile is attached to a client_project linked
 * to this property (via project_properties), either as legacy primary or
 * via an active client_project_clients membership.
 */
export const canClientAccessProperty = async (
  clientProfileId: string,
  propertyId: string
): Promise<boolean> => {
  const accessibleProjectIds = await resolveAccessibleClientProjectIds(clientProfileId);
  if (accessibleProjectIds.length === 0) return false;

  const { data, error } = await supabaseAdmin
    .from("project_properties")
    .select("client_project_id")
    .eq("property_id", propertyId)
    .is("unlinked_at", null)
    .in("client_project_id", accessibleProjectIds)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
};

/**
 * Resolve every client_project_id a given client_profile can legitimately
 * see in the portal. Combines:
 *   - legacy `client_projects.client_profile_id` (historical owner),
 *   - active rows in `client_project_clients` (indivision N:N).
 */
export const resolveAccessibleClientProjectIds = async (
  clientProfileId: string
): Promise<string[]> => {
  const [legacyResult, sharedResult] = await Promise.all([
    supabaseAdmin
      .from("client_projects")
      .select("id")
      .eq("client_profile_id", clientProfileId),
    supabaseAdmin
      .from("client_project_clients")
      .select("client_project_id")
      .eq("client_profile_id", clientProfileId)
      .is("removed_at", null),
  ]);
  if (legacyResult.error) throw legacyResult.error;
  if (sharedResult.error) throw sharedResult.error;

  const ids = new Set<string>();
  for (const row of (legacyResult.data ?? []) as Array<{ id: string }>) ids.add(row.id);
  for (const row of (sharedResult.data ?? []) as Array<{ client_project_id: string }>) {
    ids.add(row.client_project_id);
  }
  return Array.from(ids);
};

export const emitClientProjectEvent = async (params: {
  clientProjectId: string;
  sellerProjectId?: string;
  eventName: string;
  eventCategory: string;
  visibleToClient?: boolean;
  actorType?: string;
  actorId?: string;
  payload?: Record<string, unknown>;
}) => {
  const { error } = await supabaseAdmin.from("client_project_events").insert({
    client_project_id: params.clientProjectId,
    seller_project_id: params.sellerProjectId ?? null,
    event_name: params.eventName,
    event_category: params.eventCategory,
    visible_to_client: params.visibleToClient ?? true,
    actor_type: params.actorType ?? null,
    actor_id: params.actorId ?? null,
    payload: params.payload ?? {},
  });
  if (error) throw error;
};
