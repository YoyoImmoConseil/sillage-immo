import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientPortalContextByAuthUserId } from "@/services/clients/client-portal.service";

export type ClientSpacePageContext = {
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

export const getClientSpacePageContext = async (): Promise<ClientSpacePageContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const clientProfile = await getClientPortalContextByAuthUserId(user.id);
  if (!clientProfile) {
    return null;
  }

  return {
    authUserId: user.id,
    email: user.email,
    clientProfile: {
      id: clientProfile.id,
      email: clientProfile.email,
      firstName: clientProfile.firstName,
      lastName: clientProfile.lastName,
      fullName: clientProfile.fullName,
      lastLoginAt: clientProfile.lastLoginAt,
    },
  };
};

export const requireClientSpacePageContext = async () => {
  const context = await getClientSpacePageContext();
  if (!context) {
    redirect("/espace-client/login");
  }

  return context;
};

export type SellerPageContext = ClientSpacePageContext;
export const getSellerPageContext = getClientSpacePageContext;
export const requireSellerPageContext = requireClientSpacePageContext;
