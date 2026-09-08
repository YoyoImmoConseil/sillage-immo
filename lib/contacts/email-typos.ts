/**
 * Correction des fautes de frappe évidentes sur le domaine d'un email.
 *
 * Pourquoi : un lead saisi « prenom@gmail.con » est perdu — l'email de
 * vérification ou d'invitation rebondit et personne ne s'en aperçoit. Sur des
 * fournisseurs aussi connus que Gmail, Hotmail, Outlook, Yahoo, iCloud, Orange,
 * Free ou SFR, un domaine qui N'EXISTE PAS (« gmail.con », « hotmail.fe »)
 * est corrigé automatiquement vers le domaine réel.
 *
 * Règles de prudence : on ne corrige que des domaines dont on est certain
 * qu'ils ne reçoivent pas de courrier (TLD inexistants ou fautes de frappe
 * sans ambiguïté). Un domaine plausible même s'il est rare (« gmail.co.uk »,
 * « orange.com ») n'est jamais touché. Module sans dépendance serveur : il
 * est utilisé aussi bien par les services que par les formulaires.
 */

/** Domaine mal saisi → domaine réel. Clés en minuscules. */
const DOMAIN_CORRECTIONS: Record<string, string> = {
  // Gmail
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmail.cim": "gmail.com",
  "gmail.vom": "gmail.com",
  "gmail.xom": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmail.coma": "gmail.com",
  "gmail.fe": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmeil.com": "gmail.com",
  "gmail.co.com": "gmail.com",
  // Hotmail / Outlook / Live
  "hotmail.con": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.cm": "hotmail.com",
  "hotmail.om": "hotmail.com",
  "hotmail.comm": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.fe": "hotmail.fr",
  "hotmail.ft": "hotmail.fr",
  "hotmail.fr.com": "hotmail.fr",
  "outlook.con": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.cm": "outlook.com",
  "outlook.comm": "outlook.com",
  "outlook.fe": "outlook.fr",
  "outlook.ft": "outlook.fr",
  "live.con": "live.com",
  "live.fe": "live.fr",
  "live.ft": "live.fr",
  // Yahoo
  "yahoo.con": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.cm": "yahoo.com",
  "yahoo.comm": "yahoo.com",
  "yahoo.fe": "yahoo.fr",
  "yahoo.ft": "yahoo.fr",
  "yaho.com": "yahoo.com",
  "yaho.fr": "yahoo.fr",
  "yahooo.com": "yahoo.com",
  "yahooo.fr": "yahoo.fr",
  // iCloud / Apple
  "icloud.con": "icloud.com",
  "icloud.co": "icloud.com",
  "icloud.cm": "icloud.com",
  "icloud.comm": "icloud.com",
  "iclod.com": "icloud.com",
  "icoud.com": "icloud.com",
  "me.con": "me.com",
  "mac.con": "mac.com",
  // Opérateurs français
  "orange.fe": "orange.fr",
  "orange.ft": "orange.fr",
  "orange.frr": "orange.fr",
  "orang.fr": "orange.fr",
  "ornage.fr": "orange.fr",
  "wanadoo.fe": "wanadoo.fr",
  "wanadoo.ft": "wanadoo.fr",
  "wanado.fr": "wanadoo.fr",
  "wanadoo.frr": "wanadoo.fr",
  "free.fe": "free.fr",
  "free.ft": "free.fr",
  "free.frr": "free.fr",
  "sfr.fe": "sfr.fr",
  "sfr.ft": "sfr.fr",
  "sfr.frr": "sfr.fr",
  "laposte.ne": "laposte.net",
  "laposte.nt": "laposte.net",
  "bbox.fe": "bbox.fr",
  "bbox.ft": "bbox.fr",
  "numericable.fe": "numericable.fr",
  "neuf.fe": "neuf.fr",
  "aol.con": "aol.com",
  "protonmail.con": "protonmail.com",
  "proton.con": "proton.me",
};

/**
 * Renvoie l'email avec son domaine corrigé si c'est une faute de frappe
 * connue, sinon l'email inchangé (espaces retirés, en minuscules).
 * Une valeur vide ou sans « @ » est renvoyée telle quelle (après trim).
 */
export function correctEmailDomainTypo(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  const corrected = DOMAIN_CORRECTIONS[domain];
  return corrected ? `${local}@${corrected}` : trimmed;
}

/** Indique si l'email serait modifié par la correction (utile pour l'UI). */
export function hasEmailDomainTypo(email: string): boolean {
  return correctEmailDomainTypo(email) !== email.trim();
}
