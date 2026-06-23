import { NextResponse } from "next/server";
import { resolveIntegrationKey } from "@/lib/integrations/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Connection test for the Sillage Immo Zapier app. Validates the API key and
// returns a human label + the key's scopes so Zapier can display a friendly
// connection name and so partners can confirm their key is wired correctly.
export const GET = async (request: Request) => {
  const key = await resolveIntegrationKey(request);
  if (!key) {
    return NextResponse.json(
      { ok: false, code: "invalid_key", message: "Clé API invalide ou révoquée." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    agency: "Sillage Immo",
    connectionLabel: `Sillage Immo — ${key.name}`,
    key: {
      name: key.name,
      canWrite: key.canWrite,
      scopes: key.toolAllowlist.filter((s) => s.startsWith("integrations:")),
    },
  });
};
