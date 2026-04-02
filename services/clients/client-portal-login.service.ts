import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { findClientByEmail } from "./client-profile.service";
import { createInvitation } from "./client-project-invitation.service";
import { ensureSellerPortalAccessFromLead } from "./seller-project.service";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

type PreparedPortalAccess =
  | {
      mode: "login";
      email: string;
      nextPath: string;
      inviteToken: null;
      source: "linked_client_profile";
    }
  | {
      mode: "invite";
      email: string;
      nextPath: string;
      inviteToken: string;
      source:
        | "existing_client_project"
        | "seller_lead_backfill_created"
        | "seller_lead_backfill_existing";
    };

const getLatestClientProjectId = async (clientProfileId: string) => {
  const { data, error } = await supabaseAdmin
    .from("client_projects")
    .select("id")
    .eq("client_profile_id", clientProfileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
};

const getLatestSellerLeadIdByEmail = async (email: string) => {
  const { data, error } = await supabaseAdmin
    .from("seller_leads")
    .select("id")
    .eq("email", normalizeEmail(email))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
};

export const prepareClientPortalLogin = async (input: {
  email: string;
  nextPath?: string;
}): Promise<
  | { ok: true; data: PreparedPortalAccess }
  | { ok: false; code: "no_portal_access"; message: string }
> => {
  const email = normalizeEmail(input.email);
  const nextPath = input.nextPath && input.nextPath.startsWith("/") ? input.nextPath : "/espace-client";

  const existingClient = await findClientByEmail(email);
  if (existingClient?.auth_user_id) {
    return {
      ok: true,
      data: {
        mode: "login",
        email: existingClient.email,
        nextPath,
        inviteToken: null,
        source: "linked_client_profile",
      },
    };
  }

  if (existingClient) {
    const latestProjectId = await getLatestClientProjectId(existingClient.id);
    if (latestProjectId) {
      const invitation = await createInvitation({
        clientProjectId: latestProjectId,
        clientProfileId: existingClient.id,
        email: existingClient.email,
        providerHint: "email",
      });

      return {
        ok: true,
        data: {
          mode: "invite",
          email: existingClient.email,
          nextPath,
          inviteToken: invitation.token,
          source: "existing_client_project",
        },
      };
    }
  }

  const latestSellerLeadId = await getLatestSellerLeadIdByEmail(email);
  if (!latestSellerLeadId) {
    return {
      ok: false,
      code: "no_portal_access",
      message:
        "Aucun espace client n'est encore actif pour cette adresse email. Realisez d'abord une estimation vendeur ou demandez a Sillage Immo d'activer votre acces.",
    };
  }

  const provision = await ensureSellerPortalAccessFromLead(latestSellerLeadId);
  if (provision.portalAccess.mode === "login") {
    return {
      ok: true,
      data: {
        mode: "login",
        email: provision.portalAccess.email,
        nextPath,
        inviteToken: null,
        source: "linked_client_profile",
      },
    };
  }

  if (!provision.portalAccess.inviteToken) {
    throw new Error("Invitation introuvable pour finaliser l'acces portail.");
  }

  return {
    ok: true,
    data: {
      mode: "invite",
      email: provision.portalAccess.email,
      nextPath,
      inviteToken: provision.portalAccess.inviteToken,
      source:
        provision.clientProfileId === existingClient?.id
          ? "seller_lead_backfill_existing"
          : "seller_lead_backfill_created",
    },
  };
};
