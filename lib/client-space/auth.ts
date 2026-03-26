import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSellerPortalClientByAuthUserId } from "@/services/clients/seller-portal.service";

export type SellerPageContext = {
  authUserId: string;
  email: string;
  clientProfile: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    lastLoginAt: string | null;
  };
};

export const getSellerPageContext = async (): Promise<SellerPageContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const clientProfile = await getSellerPortalClientByAuthUserId(user.id);
  if (!clientProfile) {
    return null;
  }

  return {
    authUserId: user.id,
    email: user.email,
    clientProfile: {
      id: clientProfile.id,
      email: clientProfile.email,
      firstName: clientProfile.first_name,
      lastName: clientProfile.last_name,
      fullName: clientProfile.full_name,
      lastLoginAt: clientProfile.last_login_at,
    },
  };
};

export const requireSellerPageContext = async () => {
  const context = await getSellerPageContext();
  if (!context) {
    redirect("/espace-client/login");
  }

  return context;
};
