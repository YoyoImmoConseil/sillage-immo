import "server-only";
import { randomBytes } from "crypto";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitClientProjectEvent } from "./client-project.service";
import { linkClientProfileToAuthUser } from "./client-profile.service";

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

export type ClientProjectInvitationRecord = {
  id: string;
  client_project_id: string;
  client_profile_id: string;
  email: string;
  provider_hint: "google" | "apple" | "microsoft" | "email" | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ClientProjectInvitationStatus =
  | "invalid"
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

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
      provider_hint: input.providerHint ?? "email",
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

export const getInvitationByToken = async (
  token: string
): Promise<(ClientProjectInvitationRecord & { status: ClientProjectInvitationStatus }) | null> => {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const { data, error } = await supabaseAdmin
    .from("client_project_invitations")
    .select(
      "id, client_project_id, client_profile_id, email, provider_hint, expires_at, accepted_at, revoked_at, created_at"
    )
    .eq("token_hash", hashToken(normalizedToken))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const now = Date.now();
  const expiresAtMs = new Date(data.expires_at).getTime();
  const status: ClientProjectInvitationStatus = data.revoked_at
    ? "revoked"
    : data.accepted_at
      ? "accepted"
      : Number.isFinite(expiresAtMs) && expiresAtMs < now
        ? "expired"
        : "pending";

  return {
    ...(data as ClientProjectInvitationRecord),
    status,
  };
};

export const acceptInvitation = async (input: {
  token: string;
  authUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}) => {
  const invitation = await getInvitationByToken(input.token);
  if (!invitation || invitation.status === "invalid") {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (invitation.status === "revoked") {
    return { ok: false as const, reason: "revoked" as const };
  }

  if (invitation.status === "expired") {
    return { ok: false as const, reason: "expired" as const };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail !== invitation.email.trim().toLowerCase()) {
    return { ok: false as const, reason: "email_mismatch" as const };
  }

  const clientProfile = await linkClientProfileToAuthUser({
    clientProfileId: invitation.client_profile_id,
    authUserId: input.authUserId,
    email: normalizedEmail,
    firstName: input.firstName,
    lastName: input.lastName,
    fullName: input.fullName,
  });

  if (!clientProfile) {
    return { ok: false as const, reason: "profile_link_failed" as const };
  }

  if (!invitation.accepted_at) {
    const nowIso = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("client_project_invitations")
      .update({
        accepted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", invitation.id);

    if (error) {
      throw new Error(error.message);
    }

    await emitClientProjectEvent({
      clientProjectId: invitation.client_project_id,
      eventName: "client_invitation.accepted",
      eventCategory: "invitation",
      actorType: "client",
      actorId: clientProfile.id,
      payload: {
        invitation_id: invitation.id,
        email: normalizedEmail,
      },
    });
  }

  return {
    ok: true as const,
    clientProfileId: clientProfile.id,
    clientProjectId: invitation.client_project_id,
  };
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
