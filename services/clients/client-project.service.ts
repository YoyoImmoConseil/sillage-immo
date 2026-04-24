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
  return data.id;
};

export const getClientProjectsByClientId = async (
  clientProfileId: string,
  options?: GetClientProjectsOptions
) => {
  const projectTypes = options?.projectTypes ?? ["seller"];
  let query = supabaseAdmin
    .from("client_projects")
    .select("*")
    .eq("client_profile_id", clientProfileId)
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
