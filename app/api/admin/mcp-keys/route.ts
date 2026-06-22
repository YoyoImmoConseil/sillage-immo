import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import {
  createMcpApiKey,
  listMcpApiKeys,
} from "@/services/mcp/mcp-api-key.service";

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
};

export async function GET(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "admin.users.manage")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }
  try {
    const keys = await listMcpApiKeys();
    return NextResponse.json({ ok: true, keys });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "admin.users.manage")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Corps JSON invalide." }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ ok: false, message: "Nom requis." }, { status: 422 });
  }

  const toolAllowlist = sanitizeStringArray(body?.toolAllowlist);
  if (toolAllowlist.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Au moins un outil dans l'allowlist est requis." },
      { status: 422 }
    );
  }

  const rateLimitRaw = body?.rateLimitPerMinute;
  const rateLimitPerMinute =
    typeof rateLimitRaw === "number" && Number.isFinite(rateLimitRaw) && rateLimitRaw > 0
      ? Math.floor(rateLimitRaw)
      : null;
  const ipAllowlist = sanitizeStringArray(body?.ipAllowlist);

  try {
    const { summary, plaintextKey } = await createMcpApiKey({
      name,
      toolAllowlist,
      canWrite: body?.canWrite === true,
      canReadPii: body?.canReadPii === true,
      ipAllowlist: ipAllowlist.length > 0 ? ipAllowlist : null,
      rateLimitPerMinute,
      createdByAdminProfileId: context.profile?.id ?? null,
    });
    // plaintextKey is returned exactly once.
    return NextResponse.json({ ok: true, key: summary, plaintextKey });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
