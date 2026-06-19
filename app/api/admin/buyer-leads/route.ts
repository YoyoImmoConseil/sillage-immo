import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  buyerSearchCriteriaSchema,
  toBuyerSignupCriteria,
} from "@/lib/buyers/buyer-search-payload";
import { sendClientPortalMagicLink } from "@/services/clients/client-portal-magic-link.service";
import { createBuyerSearchSignup } from "@/services/buyers/buyer-signup.service";
import { createClientProfile } from "@/services/clients/client-profile.service";
import { addClientToProject } from "@/services/clients/client-project.service";
import { createInvitation } from "@/services/clients/client-project-invitation.service";

export const dynamic = "force-dynamic";

const ADMIN_ORIGIN = "admin_manual_creation";

// Création manuelle d'un acquéreur depuis le back-office. Réutilise le rail
// public (createBuyerSearchSignup) : lead + profil client + projet + espace
// Sillage + invitation, puis envoi du magic link d'activation.
//
// Différence avec le flux public : le consentement RGPD est recueilli hors
// ligne par l'utilisateur admin (champ `rgpdConsentCollected`), pas via la
// case cochée par le client lui-même.
const coBuyerSchema = z.object({
  email: z.string().trim().email().max(240),
  firstName: z.string().trim().max(120).optional().nullable(),
  lastName: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(60).optional().nullable(),
});

const payloadSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(240),
  phone: z.string().trim().max(60).optional().nullable(),
  rgpdConsentCollected: z.literal(true),
  criteria: buyerSearchCriteriaSchema,
  coBuyers: z.array(coBuyerSchema).max(5).optional(),
});

export const POST = async (request: Request) => {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "leads.buyers.manage")) {
    return NextResponse.json(
      { ok: false, code: "forbidden", message: "Acces refuse." },
      { status: 403 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: "invalid_json", message: "Corps JSON invalide." },
      { status: 400 }
    );
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "invalid_payload",
        message: "Donnees de recherche invalides.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  const input = parsed.data;
  const requestUrl = new URL(request.url);

  try {
    const signup = await createBuyerSearchSignup({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? null,
      rgpdAcceptedAt: new Date().toISOString(),
      sourceUrl: null,
      initialFilters: {
        createdByAdminProfileId: context.profile?.id ?? null,
        rgpdConsentSource: "admin_manual",
      },
      criteria: toBuyerSignupCriteria(input.criteria),
      origin: ADMIN_ORIGIN,
      createdByAdminId: context.profile?.id ?? null,
    });

    const email = input.email.trim().toLowerCase();
    const nextPath = `/espace-client/recherches/${signup.clientProjectId}`;

    // Co-acquéreurs : rattachés au même projet (co_owner) puis invités sur
    // LEUR propre espace. Chaque échec est non bloquant — l'acquéreur
    // principal est déjà créé ; on remonte simplement le compte attaché.
    let coBuyersAttached = 0;
    for (const co of input.coBuyers ?? []) {
      const coEmail = co.email.trim().toLowerCase();
      if (!coEmail || coEmail === email) continue;
      try {
        const coProfile = await createClientProfile({
          email: coEmail,
          phone: co.phone ?? undefined,
          firstName: co.firstName ?? undefined,
          lastName: co.lastName ?? undefined,
        });
        await addClientToProject({
          clientProjectId: signup.clientProjectId,
          clientProfileId: coProfile.clientProfileId,
          role: "co_owner",
          adminProfileId: context.profile?.id ?? null,
        });
        coBuyersAttached += 1;
        try {
          const invitation = await createInvitation({
            clientProjectId: signup.clientProjectId,
            clientProfileId: coProfile.clientProfileId,
            email: coEmail,
            createdByAdminId: context.profile?.id,
          });
          await sendClientPortalMagicLink({
            email: coEmail,
            nextPath,
            inviteToken: invitation.token,
            origin: requestUrl.origin,
          });
        } catch (error) {
          console.error(
            "[admin/buyer-leads] co-buyer invitation failed:",
            error instanceof Error ? error.message : error
          );
        }
      } catch (error) {
        console.error(
          "[admin/buyer-leads] co-buyer attach failed:",
          error instanceof Error ? error.message : error
        );
      }
    }

    let emailSent = true;
    let emailFailureCode: string | undefined;
    try {
      const sent = await sendClientPortalMagicLink({
        email,
        nextPath,
        inviteToken: signup.invitationToken,
        origin: requestUrl.origin,
      });
      if (!sent.ok) {
        emailSent = false;
        emailFailureCode = sent.code;
      }
    } catch (error) {
      emailSent = false;
      console.error(
        "[admin/buyer-leads] invitation email failed:",
        error instanceof Error ? error.message : error
      );
    }

    return NextResponse.json(
      {
        ok: true,
        code: emailSent ? "created" : "created_email_failed",
        message: emailSent
          ? "Acquereur cree et invitation envoyee."
          : "Acquereur cree mais l'envoi de l'invitation a echoue. Vous pouvez renvoyer un lien depuis la fiche.",
        data: {
          buyerLeadId: signup.buyerLeadId,
          clientProjectId: signup.clientProjectId,
          buyerSearchProfileId: signup.buyerSearchProfileId,
          email,
          emailSent,
          emailFailureCode,
          coBuyersAttached,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[admin/buyer-leads] manual creation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        ok: false,
        code: "creation_failed",
        message: "Impossible de creer l'acquereur. Merci de reessayer.",
      },
      { status: 500 }
    );
  }
};
