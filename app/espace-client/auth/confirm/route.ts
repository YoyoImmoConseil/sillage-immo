import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { copyResponseCookies, createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSellerPortalClientByAuthUserId } from "@/services/clients/seller-portal.service";
import { acceptInvitation } from "@/services/clients/client-project-invitation.service";
import { touchClientProfileLastLogin } from "@/services/clients/client-profile.service";
import { runBuyerPostVerificationTasks } from "@/services/buyers/sweepbright-sync.service";

const getSafeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/espace-client";
  }

  return value;
};

const getSafeOtpType = (value: string | null): EmailOtpType | null => {
  if (
    value === "signup" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "invite" ||
    value === "email_change" ||
    value === "email"
  ) {
    return value;
  }

  return null;
};

const runPostVerificationBuyerTasks = async (clientProfileId: string) => {
  try {
    await runBuyerPostVerificationTasks(clientProfileId);
  } catch (error) {
    console.error("[buyer-post-verify] failed", error);
  }
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const inviteToken = requestUrl.searchParams.get("inviteToken");
  const otpType = getSafeOtpType(requestUrl.searchParams.get("type")) ?? "email";
  const authResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const redirectToLogin = (error: string) => {
    const loginUrl = new URL("/espace-client/login", requestUrl.origin);
    loginUrl.searchParams.set("error", error);
    return copyResponseCookies(authResponse, NextResponse.redirect(loginUrl));
  };

  const redirectToInvitation = (error: string) => {
    const invitationUrl = new URL("/espace-client/invitation", requestUrl.origin);
    if (inviteToken) {
      invitationUrl.searchParams.set("token", inviteToken);
    }
    invitationUrl.searchParams.set("error", error);
    return copyResponseCookies(authResponse, NextResponse.redirect(invitationUrl));
  };

  if (!tokenHash) {
    return inviteToken ? redirectToInvitation("missing_token_hash") : redirectToLogin("missing_token_hash");
  }

  try {
    const supabase = createSupabaseRouteHandlerClient(request, authResponse);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (verifyError) {
      return inviteToken ? redirectToInvitation("magic_link_invalid") : redirectToLogin("magic_link_invalid");
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      await supabase.auth.signOut();
      return inviteToken ? redirectToInvitation("missing_user") : redirectToLogin("missing_user");
    }

    if (inviteToken) {
      const result = await acceptInvitation({
        token: inviteToken,
        authUserId: user.id,
        email: user.email,
        firstName: typeof user.user_metadata.first_name === "string" ? user.user_metadata.first_name : null,
        lastName: typeof user.user_metadata.last_name === "string" ? user.user_metadata.last_name : null,
        fullName: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : null,
      });

      if (!result.ok) {
        await supabase.auth.signOut();
        return redirectToInvitation(result.reason);
      }

      await runPostVerificationBuyerTasks(result.clientProfileId);
    } else {
      const clientProfile = await getSellerPortalClientByAuthUserId(user.id);
      if (!clientProfile) {
        await supabase.auth.signOut();
        return redirectToLogin("no_portal_access");
      }
      await touchClientProfileLastLogin(clientProfile.id);
      await runPostVerificationBuyerTasks(clientProfile.id);
    }

    return copyResponseCookies(authResponse, NextResponse.redirect(new URL(nextPath, requestUrl.origin)));
  } catch {
    return inviteToken ? redirectToInvitation("magic_link_invalid") : redirectToLogin("magic_link_invalid");
  }
}
