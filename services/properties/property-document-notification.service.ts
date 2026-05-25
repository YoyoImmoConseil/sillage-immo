import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  sendClientUploadedDocumentAdvisorEmail,
  sendNewPropertyDocumentEmail,
  sendNewPropertyDocumentToProspectEmail,
} from "@/lib/email/property-document";
import { emitClientProjectEvent } from "@/services/clients/client-project.service";
import { createInvitation } from "@/services/clients/client-project-invitation.service";
import { createClientPortalAccessLink } from "@/services/clients/client-portal-magic-link.service";
import type { PropertyDocument } from "@/services/properties/property-documents.service";

type PropertyRow = {
  id: string;
  title: string | null;
  formatted_address: string | null;
  street_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
};

type ClientProfileNotificationRow = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  auth_user_id: string | null;
  is_active: boolean;
};

/**
 * Notify every co-owner (client_profile) attached to a property — via the
 * legacy primary on `client_projects` OR via the indivision N:N table
 * `client_project_clients` — that an admin has added a new document
 * visible to the client side.
 *
 * Two recipient kinds:
 *   - "active" (auth_user_id IS NOT NULL): direct CTA to the property
 *     inside the espace client.
 *   - "prospect": same content, but the CTA is a fresh signup magic-link
 *     bound to a per-recipient invitation on the project that links the
 *     property, so they can activate their espace client and land on the
 *     document in one click.
 *
 * Best-effort: the function never throws. A transient SMTP/DB hiccup must
 * not make the surrounding "upload document" admin flow fail.
 */
export const notifyOwnersOfNewPropertyDocument = async (input: {
  propertyId: string;
  document: Pick<PropertyDocument, "id" | "label" | "kind" | "visibility">;
  adminProfileId: string | null;
}): Promise<void> => {
  if (input.document.visibility !== "admin_and_client") {
    return;
  }

  try {
    const [
      { data: propertyRow },
      { data: projectLinks },
      uploaderName,
    ] = await Promise.all([
      supabaseAdmin
        .from("properties")
        .select("id, title, formatted_address, street_number, street, postal_code, city")
        .eq("id", input.propertyId)
        .maybeSingle(),
      supabaseAdmin
        .from("project_properties")
        .select("client_project_id")
        .eq("property_id", input.propertyId)
        .is("unlinked_at", null),
      resolveAdminUploaderName(input.adminProfileId),
    ]);

    if (!propertyRow) return;

    const projectIds = Array.from(
      new Set((projectLinks ?? []).map((row) => row.client_project_id))
    );
    if (projectIds.length === 0) return;

    const projectByClientProfileId = await resolveProjectsByClientProfile(projectIds);
    if (projectByClientProfileId.size === 0) return;

    const { data: clientProfiles } = await supabaseAdmin
      .from("client_profiles")
      .select("id, email, first_name, full_name, auth_user_id, is_active")
      .in("id", Array.from(projectByClientProfileId.keys()));

    const recipients = (clientProfiles ?? []).filter(
      (row): row is ClientProfileNotificationRow =>
        Boolean(
          row &&
            row.is_active &&
            typeof row.email === "string" &&
            row.email.trim().length > 0
        )
    );
    if (recipients.length === 0) return;

    const propertyLabel = resolvePropertyLabel(propertyRow as PropertyRow);
    const propertyAddress = buildAddressLine(propertyRow as PropertyRow);
    const propertyUrl = buildClientPropertyUrl(input.propertyId);

    const seenEmails = new Set<string>();
    const sendResults = await Promise.all(
      recipients.map(async (recipient) => {
        const normalizedEmail = recipient.email.trim().toLowerCase();
        if (seenEmails.has(normalizedEmail)) return null;
        seenEmails.add(normalizedEmail);

        const firstName =
          recipient.first_name?.trim() ||
          firstNameFromFullName(recipient.full_name);

        if (recipient.auth_user_id) {
          return sendActivePropertyDocumentEmail({
            recipient,
            firstName,
            propertyLabel,
            propertyAddress,
            propertyUrl,
            document: input.document,
            uploaderName,
          });
        }

        const projectIdForInvite = projectByClientProfileId.get(recipient.id);
        if (!projectIdForInvite) return null;

        return sendProspectPropertyDocumentEmail({
          recipient,
          firstName,
          propertyId: input.propertyId,
          clientProjectId: projectIdForInvite,
          propertyLabel,
          propertyAddress,
          document: input.document,
          uploaderName,
        });
      })
    );

    const sentCount = sendResults.reduce(
      (acc, result) => (result && "sent" in result && result.sent ? acc + 1 : acc),
      0
    );

    if (sentCount > 0) {
      await logProjectsEvent({
        projectIds,
        eventName: "property_document.notification_sent",
        actorType: input.adminProfileId ? "admin" : "system",
        actorId: input.adminProfileId,
        payload: {
          property_id: input.propertyId,
          property_document_id: input.document.id,
          recipient_count: sentCount,
          document_kind: input.document.kind,
        },
      });
    }
  } catch (error) {
    console.error("[property-document-notification] dispatch failed", {
      propertyId: input.propertyId,
      documentId: input.document.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Notify the advisor in charge of the seller project linked to a property
 * (fallback: the primary admin on the client_project) when a client has
 * just uploaded a document on that property. Best-effort, never throws.
 */
export const notifyAssignedAdvisorOfClientUploadedDocument = async (input: {
  propertyId: string;
  document: Pick<
    PropertyDocument,
    "id" | "label" | "kind" | "visibility" | "uploadedByClientProfileId"
  >;
}): Promise<void> => {
  if (!input.document.uploadedByClientProfileId) {
    return;
  }

  try {
    const [{ data: propertyRow }, { data: projectLinks }] = await Promise.all([
      supabaseAdmin
        .from("properties")
        .select("id, title, formatted_address, street_number, street, postal_code, city")
        .eq("id", input.propertyId)
        .maybeSingle(),
      supabaseAdmin
        .from("project_properties")
        .select("client_project_id")
        .eq("property_id", input.propertyId)
        .is("unlinked_at", null),
    ]);
    if (!propertyRow) return;

    const projectIds = Array.from(
      new Set((projectLinks ?? []).map((row) => row.client_project_id))
    );
    if (projectIds.length === 0) return;

    const advisorByProjectId = await resolveAdvisorIdsByProject(projectIds);
    const distinctAdvisorIds = Array.from(
      new Set(
        Array.from(advisorByProjectId.values()).filter(
          (value): value is string => typeof value === "string" && value.length > 0
        )
      )
    );
    if (distinctAdvisorIds.length === 0) return;

    const [{ data: advisors }, { data: clientProfile }] = await Promise.all([
      supabaseAdmin
        .from("admin_profiles")
        .select("id, email, first_name, last_name, full_name, is_active")
        .in("id", distinctAdvisorIds),
      supabaseAdmin
        .from("client_profiles")
        .select("first_name, last_name, full_name, email")
        .eq("id", input.document.uploadedByClientProfileId)
        .maybeSingle(),
    ]);

    const propertyLabel = resolvePropertyLabel(propertyRow as PropertyRow);
    const propertyAddress = buildAddressLine(propertyRow as PropertyRow);
    const adminPropertyUrl = buildAdminPropertyUrl(input.propertyId);
    const clientName = formatPersonName({
      firstName: clientProfile?.first_name ?? null,
      lastName: clientProfile?.last_name ?? null,
      fullName: clientProfile?.full_name ?? null,
      email: clientProfile?.email ?? null,
    });
    const clientEmail = clientProfile?.email ?? null;

    const advisorRecipients = (advisors ?? []).filter(
      (row): row is {
        id: string;
        email: string;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
        is_active: boolean;
      } =>
        Boolean(
          row &&
            row.is_active &&
            typeof row.email === "string" &&
            row.email.trim().length > 0
        )
    );

    const seenEmails = new Set<string>();
    const sendResults = await Promise.all(
      advisorRecipients.map(async (advisor) => {
        const normalizedEmail = advisor.email.trim().toLowerCase();
        if (seenEmails.has(normalizedEmail)) return null;
        seenEmails.add(normalizedEmail);
        try {
          return await sendClientUploadedDocumentAdvisorEmail({
            to: advisor.email,
            advisorFirstName:
              advisor.first_name?.trim() ||
              firstNameFromFullName(advisor.full_name),
            propertyLabel,
            propertyAddress,
            documentLabel: input.document.label,
            documentKind: input.document.kind,
            clientName,
            clientEmail,
            adminPropertyUrl,
          });
        } catch (error) {
          console.error(
            "[property-document-notification] advisor send failed",
            {
              propertyId: input.propertyId,
              documentId: input.document.id,
              adminProfileId: advisor.id,
              error: error instanceof Error ? error.message : String(error),
            }
          );
          return null;
        }
      })
    );

    const sentCount = sendResults.reduce(
      (acc, result) => (result && "sent" in result && result.sent ? acc + 1 : acc),
      0
    );

    if (sentCount > 0) {
      await logProjectsEvent({
        projectIds,
        eventName: "property_document.advisor_notified",
        actorType: "client",
        actorId: input.document.uploadedByClientProfileId,
        payload: {
          property_id: input.propertyId,
          property_document_id: input.document.id,
          recipient_count: sentCount,
          document_kind: input.document.kind,
          uploader_client_profile_id: input.document.uploadedByClientProfileId,
        },
      });
    }
  } catch (error) {
    console.error("[property-document-notification] advisor dispatch failed", {
      propertyId: input.propertyId,
      documentId: input.document.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const sendActivePropertyDocumentEmail = async (input: {
  recipient: ClientProfileNotificationRow;
  firstName: string | null;
  propertyLabel: string;
  propertyAddress: string | null;
  propertyUrl: string;
  document: Pick<PropertyDocument, "id" | "label" | "kind" | "visibility">;
  uploaderName: string | null;
}) => {
  try {
    return await sendNewPropertyDocumentEmail({
      to: input.recipient.email,
      recipientFirstName: input.firstName,
      propertyLabel: input.propertyLabel,
      propertyAddress: input.propertyAddress,
      documentLabel: input.document.label,
      documentKind: input.document.kind,
      uploaderName: input.uploaderName,
      propertyUrl: input.propertyUrl,
    });
  } catch (error) {
    console.error("[property-document-notification] active send failed", {
      clientProfileId: input.recipient.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

const sendProspectPropertyDocumentEmail = async (input: {
  recipient: ClientProfileNotificationRow;
  firstName: string | null;
  propertyId: string;
  clientProjectId: string;
  propertyLabel: string;
  propertyAddress: string | null;
  document: Pick<PropertyDocument, "id" | "label" | "kind" | "visibility">;
  uploaderName: string | null;
}) => {
  try {
    const invitation = await createInvitation({
      clientProjectId: input.clientProjectId,
      clientProfileId: input.recipient.id,
      email: input.recipient.email,
      providerHint: "email",
    });

    const nextPath = `/espace-client/biens/${input.propertyId}`;
    const origin = (process.env.PUBLIC_SITE_URL ?? "").trim();
    const linkResult = await createClientPortalAccessLink({
      email: input.recipient.email,
      nextPath,
      inviteToken: invitation.token,
      origin,
    });
    if (!linkResult.ok) {
      console.error("[property-document-notification] magic-link build failed", {
        clientProfileId: input.recipient.id,
        code: linkResult.code,
        message: linkResult.message,
      });
      return null;
    }

    return await sendNewPropertyDocumentToProspectEmail({
      to: input.recipient.email,
      recipientFirstName: input.firstName,
      propertyLabel: input.propertyLabel,
      propertyAddress: input.propertyAddress,
      documentLabel: input.document.label,
      documentKind: input.document.kind,
      uploaderName: input.uploaderName,
      activationLink: linkResult.data.link,
    });
  } catch (error) {
    console.error("[property-document-notification] prospect send failed", {
      clientProfileId: input.recipient.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Map each client_profile attached to one of the property's projects to a
 * specific client_project_id that they can legitimately claim. The legacy
 * primary (`client_projects.client_profile_id`) wins over the indivision
 * membership when both exist, since it identifies the project that
 * originally belongs to that client.
 */
const resolveProjectsByClientProfile = async (
  projectIds: string[]
): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  if (projectIds.length === 0) return map;

  const [legacyOwnersResult, sharedMembersResult] = await Promise.all([
    supabaseAdmin
      .from("client_projects")
      .select("id, client_profile_id")
      .in("id", projectIds),
    supabaseAdmin
      .from("client_project_clients")
      .select("client_project_id, client_profile_id, created_at")
      .in("client_project_id", projectIds)
      .is("removed_at", null)
      .order("created_at", { ascending: true }),
  ]);

  for (const row of (legacyOwnersResult.data ?? []) as Array<{
    id: string;
    client_profile_id: string | null;
  }>) {
    if (row.client_profile_id && !map.has(row.client_profile_id)) {
      map.set(row.client_profile_id, row.id);
    }
  }
  for (const row of (sharedMembersResult.data ?? []) as Array<{
    client_project_id: string;
    client_profile_id: string | null;
  }>) {
    if (row.client_profile_id && !map.has(row.client_profile_id)) {
      map.set(row.client_profile_id, row.client_project_id);
    }
  }
  return map;
};

/**
 * Resolve the admin profile id in charge of each project. The seller
 * project's `assigned_admin_profile_id` wins; if there is none, fall back
 * to the legacy `client_projects.primary_admin_profile_id`.
 */
const resolveAdvisorIdsByProject = async (
  projectIds: string[]
): Promise<Map<string, string | null>> => {
  const map = new Map<string, string | null>();
  if (projectIds.length === 0) return map;

  const [sellerProjects, clientProjects] = await Promise.all([
    supabaseAdmin
      .from("seller_projects")
      .select("client_project_id, assigned_admin_profile_id")
      .in("client_project_id", projectIds),
    supabaseAdmin
      .from("client_projects")
      .select("id, primary_admin_profile_id")
      .in("id", projectIds),
  ]);

  const fallbackByProject = new Map<string, string | null>();
  for (const row of (clientProjects.data ?? []) as Array<{
    id: string;
    primary_admin_profile_id: string | null;
  }>) {
    fallbackByProject.set(row.id, row.primary_admin_profile_id ?? null);
  }
  for (const row of (sellerProjects.data ?? []) as Array<{
    client_project_id: string;
    assigned_admin_profile_id: string | null;
  }>) {
    if (row.assigned_admin_profile_id) {
      map.set(row.client_project_id, row.assigned_admin_profile_id);
    }
  }
  for (const [projectId, fallback] of fallbackByProject) {
    if (!map.has(projectId) && fallback) {
      map.set(projectId, fallback);
    }
  }
  return map;
};

const resolveAdminUploaderName = async (
  adminProfileId: string | null
): Promise<string | null> => {
  if (!adminProfileId) return null;
  const { data } = await supabaseAdmin
    .from("admin_profiles")
    .select("first_name, last_name, full_name, email")
    .eq("id", adminProfileId)
    .maybeSingle();
  if (!data) return null;
  return formatPersonName({
    firstName: data.first_name,
    lastName: data.last_name,
    fullName: data.full_name,
    email: data.email,
  });
};

const formatPersonName = (input: {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
}): string | null => {
  const fullName = input.fullName?.trim();
  if (fullName) return fullName;
  const composed = [input.firstName, input.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();
  if (composed) return composed;
  const email = input.email?.trim();
  return email || null;
};

const buildAddressLine = (row: PropertyRow): string | null => {
  if (row.formatted_address?.trim()) return row.formatted_address.trim();
  const parts = [
    [row.street_number, row.street].filter(Boolean).join(" ").trim(),
    [row.postal_code, row.city].filter(Boolean).join(" ").trim(),
  ].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
};

const resolvePropertyLabel = (row: PropertyRow): string =>
  row.title?.trim() || row.formatted_address?.trim() || "Votre bien";

const firstNameFromFullName = (fullName: string | null): string | null => {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
};

const buildClientPropertyUrl = (propertyId: string): string => {
  const base = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}/espace-client/biens/${propertyId}`;
};

const buildAdminPropertyUrl = (propertyId: string): string => {
  const base = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${base}/admin/properties/${propertyId}`;
};

const logProjectsEvent = async (input: {
  projectIds: string[];
  eventName: string;
  actorType: "admin" | "client" | "system";
  actorId: string | null;
  payload: Record<string, unknown>;
}): Promise<void> => {
  for (const clientProjectId of input.projectIds) {
    try {
      await emitClientProjectEvent({
        clientProjectId,
        eventName: input.eventName,
        eventCategory: "document",
        visibleToClient: false,
        actorType: input.actorType,
        actorId: input.actorId ?? undefined,
        payload: input.payload,
      });
    } catch (error) {
      console.error("[property-document-notification] event log failed", {
        clientProjectId,
        eventName: input.eventName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};
