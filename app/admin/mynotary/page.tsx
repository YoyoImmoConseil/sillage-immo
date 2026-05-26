import { redirect } from "next/navigation";
import { AdminShell } from "@/app/components/admin-shell";
import { getAdminPageContext, hasAdminPermission } from "@/lib/admin/auth";
import { listSignedDocuments } from "@/services/admin/mynotary-list.service";
import { MyNotaryListClient } from "./list-client";

export const dynamic = "force-dynamic";

const FALLBACK_PAGE_SIZE = 25;

type SearchParams = {
  kind?: string;
  matched?: string;
  page?: string;
  since?: string;
  until?: string;
};

const parseKind = (raw: string | undefined) => {
  if (raw === "mandate" || raw === "purchase_offer" || raw === "preliminary_sale")
    return raw;
  return "all";
};

const parseMatched = (raw: string | undefined) => {
  if (raw === "matched" || raw === "unmatched") return raw;
  return "all";
};

export default async function AdminMyNotaryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const context = await getAdminPageContext();
  if (!context) redirect("/admin/login");
  if (!hasAdminPermission(context, "admin.mynotary.view")) {
    redirect("/admin/forbidden");
  }

  const params = await searchParams;
  const kind = parseKind(params.kind);
  const matched = parseMatched(params.matched);
  const page = Math.max(1, Number(params.page) || 1);

  const result = await listSignedDocuments({
    kind,
    matched,
    since: params.since,
    until: params.until,
    page,
    pageSize: FALLBACK_PAGE_SIZE,
  });

  const canManage = hasAdminPermission(context, "admin.mynotary.manage");
  const canSync = hasAdminPermission(context, "admin.mynotary.sync");

  return (
    <AdminShell
      title="MyNotary — Contrats signés"
      description="Mandats, offres et compromis signés ingérés depuis MyNotary."
      role={context.role}
    >
      <MyNotaryListClient
        initialRows={result.rows}
        initialTotal={result.total}
        initialPage={result.page}
        pageSize={result.pageSize}
        filters={{ kind, matched, since: params.since, until: params.until }}
        canManage={canManage}
        canSync={canSync}
      />
    </AdminShell>
  );
}
