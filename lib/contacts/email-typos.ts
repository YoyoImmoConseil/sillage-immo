/**
 * Correction des fautes de frappe évidentes sur le domaine d'un email.
 *
 * Pourquoi : un lead saisi « prenom@gmail.con » est perdu — l'email de
 * vérification ou d'invitation rebondit et personne ne s'en aperçoit. Sur des
 * fournisseurs connus (Gmail, Hotmail, Outlook, Live, Yahoo, iCloud, Orange,
 * Free, SFR…), un domaine qui N'EXISTE PAS est corrigé automatiquement vers
 * le domaine réel.
 *
 * Deux règles, combinables :
 * 1. Extension mal tapée d'un fournisseur connu : « live.con » → « live.com »,
 *    « orange.ft » → « orange.fr ». On ne corrige que vers une extension que
 *    ce fournisseur utilise réellement (hotmail.fr existe, gmail.fr non).
 * 2. Nom du fournisseur mal tapé : « gmial.com » → « gmail.com ».
 *
 * Prudence : un domaine plausible même s'il est rare (« gmail.co.uk »,
 * « orange.com », « laposte.fr ») n'est jamais touché. Module sans dépendance
 * serveur : utilisé par les services et par les formulaires.
 */

/** Fournisseurs grand public → extensions qui reçoivent réellement du courrier. */
const KNOWN_PROVIDERS: Record<string, readonly string[]> = {
  gmail: ["com"],
  googlemail: ["com"],
  hotmail: ["com", "fr", "co.uk", "it", "es", "de", "be", "ch"],
  outlook: ["com", "fr", "be", "es", "it", "de", "pt"],
  live: ["com", "fr", "be", "co.uk", "it", "es", "de", "nl"],
  msn: ["com"],
  yahoo: ["com", "fr", "co.uk", "it", "es", "de", "ca"],
  ymail: ["com"],
  rocketmail: ["com"],
  icloud: ["com"],
  me: ["com"],
  mac: ["com"],
  aol: ["com"],
  protonmail: ["com", "ch"],
  proton: ["me"],
  pm: ["me"],
  gmx: ["com", "fr", "de", "net", "at", "ch"],
  orange: ["fr"],
  wanadoo: ["fr"],
  free: ["fr"],
  sfr: ["fr"],
  neuf: ["fr"],
  bbox: ["fr"],
  numericable: ["fr"],
  laposte: ["net"],
};

/** Fournisseurs sans aucun autre domaine légitime (voir resolveDomain). */
const SINGLE_DOMAIN_PROVIDERS = new Set([
  "gmail",
  "googlemail",
  "icloud",
  "me",
  "mac",
  "msn",
  "ymail",
  "rocketmail",
  "aol",
]);

/** Extension mal tapée → extension réelle (clé et valeur en minuscules). */
const TLD_TYPOS: Record<string, string> = {
  con: "com",
  cm: "com",
  co: "com",
  om: "com",
  cim: "com",
  vom: "com",
  xom: "com",
  comm: "com",
  coma: "com",
  ocm: "com",
  cpm: "com",
  cok: "com",
  clm: "com",
  fe: "fr",
  ft: "fr",
  frr: "fr",
  fd: "fr",
  rf: "fr",
  ne: "net",
  nt: "net",
  met: "net",
  nte: "net",
  mr: "me",
};

/** Nom de fournisseur mal tapé → fournisseur réel. */
const PROVIDER_TYPOS: Record<string, string> = {
  gmai: "gmail",
  gmial: "gmail",
  gmali: "gmail",
  gamil: "gmail",
  gnail: "gmail",
  gmaill: "gmail",
  gmeil: "gmail",
  gmil: "gmail",
  gemail: "gmail",
  hotmial: "hotmail",
  hotmal: "hotmail",
  hotmai: "hotmail",
  hotamil: "hotmail",
  homail: "hotmail",
  hotmaill: "hotmail",
  outlok: "outlook",
  outllok: "outlook",
  oultook: "outlook",
  yaho: "yahoo",
  yahooo: "yahoo",
  yhoo: "yahoo",
  iclod: "icloud",
  icoud: "icloud",
  icloude: "icloud",
  icluod: "icloud",
  ornage: "orange",
  orang: "orange",
  oranje: "orange",
  wanado: "wanadoo",
  wandoo: "wanadoo",
  wanadooo: "wanadoo",
  lapost: "laposte",
  lapposte: "laposte",
};

const resolveDomain = (domain: string): string | null => {
  const dot = domain.indexOf(".");
  if (dot <= 0) return null;
  const rawProvider = domain.slice(0, dot);
  const rawTld = domain.slice(dot + 1);

  const provider = PROVIDER_TYPOS[rawProvider] ?? rawProvider;
  const validTlds = KNOWN_PROVIDERS[provider];
  if (!validTlds || validTlds.length === 0) return null;

  // Extension déjà valide : on ne corrige que le nom du fournisseur, s'il y a lieu.
  if (validTlds.includes(rawTld)) {
    return provider === rawProvider ? null : `${provider}.${rawTld}`;
  }

  const fixedTld = TLD_TYPOS[rawTld];
  if (fixedTld && validTlds.includes(fixedTld)) {
    return `${provider}.${fixedTld}`;
  }

  // Fournisseur qui n'existe que sous UNE adresse dans le monde (gmail.com,
  // icloud.com…) : « gmail.fr », « icloud.fe » → la seule extension réelle.
  // Volontairement exclu pour orange, laposte, free… dont le « .com » ou le
  // « .fr » d'entreprise reçoit du courrier.
  if (SINGLE_DOMAIN_PROVIDERS.has(provider) && !rawTld.includes(".")) {
    return `${provider}.${validTlds[0]}`;
  }

  return null;
};

/**
 * Renvoie l'email avec son domaine corrigé si c'est une faute de frappe
 * connue, sinon l'email inchangé (espaces retirés).
 * Une valeur vide ou sans « @ » est renvoyée telle quelle (après trim).
 */
export function correctEmailDomainTypo(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  const corrected = resolveDomain(domain);
  return corrected ? `${local}@${corrected}` : trimmed;
}

/** Indique si l'email serait modifié par la correction (utile pour l'UI). */
export function hasEmailDomainTypo(email: string): boolean {
  return correctEmailDomainTypo(email) !== email.trim();
}
