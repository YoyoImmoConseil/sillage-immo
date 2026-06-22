import { NextResponse } from "next/server";
import { getAdminRequestContext, hasAdminPermission } from "@/lib/admin/auth";
import { revokeMcpApiKey } from "@/services/mcp/mcp-api-key.service";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAdminRequestContext(request);
  if (!context || !hasAdminPermission(context, "admin.users.manage")) {
    return NextResponse.json({ ok: false, message: "Accès refusé." }, { status: 403 });
  }
  const { id } = await params;
  try {
    await revokeMcpApiKey(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
