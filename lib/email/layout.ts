import "server-only";

/**
 * Premium email layout helpers shared across Sillage Immo transactional emails.
 *
 * Design tokens (kept in sync with the web client space):
 * - background:   #f4ece4 (sillage beige)
 * - card:         #ffffff
 * - text primary: #141446
 * - text muted:   #5b5b78
 * - borders:      rgba(20,20,70,0.12)
 *
 * Constraints:
 * - Inline styles only (no external CSS, no JS).
 * - Tables with role="presentation" for maximum email-client compatibility.
 * - Brand displayed as plain text ("SILLAGE IMMO") to avoid remote image
 *   dependency. No image is required for the message to be readable.
 */

export const escapeHtml = (input: string): string =>
  input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export type EmailCtaDescriptor = {
  label: string;
  href: string;
};

export type EmailFallbackLinkDescriptor = {
  intro: string;
  href: string;
  expirationNote?: string | null;
};

export type EmailLayoutInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  bodyHtml: string;
  cta?: EmailCtaDescriptor | null;
  fallbackLink?: EmailFallbackLinkDescriptor | null;
  footerHtml: string;
  brandName?: string;
};

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

export const renderButton = (label: string, href: string): string => {
  const safeLabel = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
      <tr>
        <td style="border-radius:999px;background:#141446;">
          <a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${FONT_STACK};font-size:15px;font-weight:600;line-height:1;color:#f4ece4;text-decoration:none;border-radius:999px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
};

export const renderFallbackLink = (input: EmailFallbackLinkDescriptor): string => {
  const safeIntro = escapeHtml(input.intro);
  const safeNote = input.expirationNote ? escapeHtml(input.expirationNote) : null;
  return `
    <p style="margin:24px 0 6px;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:#5b5b78;">
      ${safeIntro}
    </p>
    <p style="margin:0 0 4px;font-family:${FONT_STACK};font-size:13px;line-height:1.6;word-break:break-all;">
      <a href="${input.href}" style="color:#141446;text-decoration:underline;">${escapeHtml(
        input.href
      )}</a>
    </p>
    ${
      safeNote
        ? `<p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#5b5b78;">${safeNote}</p>`
        : ""
    }
  `;
};

const renderPreheader = (preheader: string): string => {
  return `
    <div style="display:none;font-size:1px;color:#f4ece4;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
      ${escapeHtml(preheader)}
    </div>
  `;
};

export const renderEmailLayout = (input: EmailLayoutInput): string => {
  const brandName = input.brandName ?? "SILLAGE IMMO";
  const preheaderBlock = renderPreheader(input.preheader);
  const ctaBlock = input.cta ? renderButton(input.cta.label, input.cta.href) : "";
  const fallbackBlock = input.fallbackLink ? renderFallbackLink(input.fallbackLink) : "";
  const separator = `<hr style="border:none;border-top:1px solid rgba(20,20,70,0.12);margin:28px 0;" />`;

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4ece4;font-family:${FONT_STACK};color:#141446;">
    ${preheaderBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4ece4;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
            <tr>
              <td align="center" style="padding:0 4px 20px;">
                <span style="font-family:${FONT_STACK};font-size:13px;font-weight:600;letter-spacing:0.18em;color:#141446;text-transform:uppercase;">
                  ${escapeHtml(brandName)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:18px;padding:36px 32px;box-shadow:0 1px 2px rgba(20,20,70,0.04);">
                <p style="margin:0 0 12px;font-family:${FONT_STACK};font-size:13px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#5b5b78;">
                  ${escapeHtml(input.eyebrow)}
                </p>
                <h1 style="margin:0 0 18px;font-family:${FONT_STACK};font-size:24px;line-height:1.25;font-weight:700;color:#141446;">
                  ${escapeHtml(input.title)}
                </h1>
                <div style="font-family:${FONT_STACK};font-size:15px;line-height:1.65;color:#141446;">
                  ${input.bodyHtml}
                </div>
                ${ctaBlock ? `<div style="margin-top:24px;">${ctaBlock}</div>` : ""}
                ${fallbackBlock}
                ${separator}
                <div style="font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#5b5b78;">
                  ${input.footerHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 4px 0;">
                <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.5;color:#5b5b78;">
                  Sillage Immo &middot; Nice &middot; Cote d'Azur
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};
