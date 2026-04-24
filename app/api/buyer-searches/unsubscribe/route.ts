import { NextResponse } from "next/server";
import {
  pauseBuyerSearchByUnsubscribe,
  verifyUnsubscribeToken,
} from "@/services/buyers/buyer-alert.service";

const renderHtmlPage = (title: string, body: string) =>
  `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #f4ece4; color: #141446; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
      main { background: #ffffff; padding: 32px; border-radius: 16px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(20,20,70,0.1); }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0; color: rgba(20,20,70,0.75); }
    </style>
  </head>
  <body>
    <main>${body}</main>
  </body>
</html>`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const token = url.searchParams.get("token");

  if (!projectId || !token) {
    return new NextResponse(
      renderHtmlPage(
        "Lien invalide",
        "<h1>Lien invalide</h1><p>Impossible de traiter votre demande. Le lien semble incomplet.</p>"
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  if (!verifyUnsubscribeToken(projectId, token)) {
    return new NextResponse(
      renderHtmlPage(
        "Lien invalide",
        "<h1>Lien invalide</h1><p>Ce lien de désabonnement a expiré ou n'est pas valide.</p>"
      ),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  try {
    await pauseBuyerSearchByUnsubscribe(projectId);
    return new NextResponse(
      renderHtmlPage(
        "Alerte mise en pause",
        "<h1>Alerte mise en pause</h1><p>Votre alerte est désormais en pause. Vous pouvez la réactiver à tout moment depuis votre espace Sillage Immo.</p>"
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  } catch {
    return new NextResponse(
      renderHtmlPage(
        "Erreur",
        "<h1>Erreur</h1><p>Une erreur est survenue. Merci de réessayer plus tard.</p>"
      ),
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
}

export const POST = GET;
