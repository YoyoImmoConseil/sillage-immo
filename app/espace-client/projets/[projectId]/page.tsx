import { notFound } from "next/navigation";
import { getRequestLocale } from "@/lib/i18n/request";
import { requireClientSpacePageContext } from "@/lib/client-space/auth";
import { getClientPortalProjectDetail } from "@/services/clients/client-portal.service";
import { SellerProjectDetailView } from "./seller-project-detail-view";
import { BuyerProjectDetailView } from "./buyer-project-detail-view";

type SellerProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SellerProjectPage({ params }: SellerProjectPageProps) {
  const locale = await getRequestLocale();
  const context = await requireClientSpacePageContext();
  const { projectId } = await params;
  const detail = await getClientPortalProjectDetail({
    authUserId: context.authUserId,
    projectId,
    locale,
  });

  if (!detail) {
    notFound();
  }

  if (detail.kind === "seller") {
    return <SellerProjectDetailView detail={detail.detail} locale={locale} />;
  }

  return <BuyerProjectDetailView detail={detail} locale={locale} />;
}
