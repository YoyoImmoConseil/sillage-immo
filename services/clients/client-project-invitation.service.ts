import "server-only";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitClientProjectEvent } from "./client-project.service";

export type CreateInvitationInput = {
  clientProjectId: string;
  clientProfileId: string;
  email: string;
  createdByAdminId?: string;
  providerHint?: "google" | "apple" | "microsoft" | "email";
  expiresInDays?: number;
};

const generateToken = () => randomBytes(32).toString("hex");
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const createInvitation = async (input: CreateInvitationInput) => {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7));

  const { data, error } = await supabaseAdmin
    .from("client_project_invitations")
    .insert({
      client_project_id: input.clientProjectId,
      client_profile_id: input.clientProfileId,
      email: input.email.trim().toLowerCase(),
      token_hash: tokenHash,
      provider_hint: input.providerHint ?? null,
      expires_at: expiresAt.toISOString(),
      created_by_admin_profile_id: input.createdByAdminId ?? null,
    })
    .select("id, expires_at")
    .single();
  if (error) throw error;

  await emitClientProjectEvent({
    clientProjectId: input.clientProjectId,
    eventName: "client_invitation.sent",
    eventCategory: "invitation",
    actorType: "admin",
    actorId: input.createdByAdminId,
    payload: { email: input.email },
  });

  return {
    invitationId: data.id,
    token,
    expiresAt: data.expires_at,
  };
};

export const revokeInvitation = async (
  invitationId: string,
  adminProfileId?: string
) => {
  const { data: inv } = await supabaseAdmin
    .from("client_project_invitations")
    .select("client_project_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) throw new Error("Invitation introuvable");

  const { error } = await supabaseAdmin
    .from("client_project_invitations")
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId);
  if (error) throw error;

  await emitClientProjectEvent({
    clientProjectId: inv.client_project_id,
    eventName: "client_invitation.revoked",
    eventCategory: "invitation",
    actorType: "admin",
    actorId: adminProfileId,
    payload: { invitation_id: invitationId },
  });
};

export type ClientProjectEventRow = {
  id: string;
  created_at: string;
  event_name: string;
  event_category: string;
};

export const getProjectEvents = async (
  clientProjectId: string,
  limit = 20
): Promise<ClientProjectEventRow[]> => {
  const { data, error } = await supabaseAdmin
    .from("client_project_events")
    .select("id, created_at, event_name, event_category")
    .eq("client_project_id", clientProjectId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClientProjectEventRow[];
};
