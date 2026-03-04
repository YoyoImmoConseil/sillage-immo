export type ZoneCatalogEntry = {
  slug: string;
  city: string;
  score: number;
  aliases: string[];
};

export const ZONE_CATALOG_VERSION = "2026-03-03-b";

const normalize = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
};

const entry = (
  city: string,
  slug: string,
  score: number,
  aliases: string[] = []
): ZoneCatalogEntry => ({
  city,
  slug,
  score,
  aliases: [slug.replace(/-/g, " "), ...aliases].map(normalize),
});

const nice: ZoneCatalogEntry[] = [
  entry("nice", "mont-boron", 15),
  entry("nice", "cap-de-nice", 15),
  entry("nice", "cimiez", 12),
  entry("nice", "carre-dor", 12),
  entry("nice", "promenade-des-anglais", 15, ["promenade des anglais"]),
  entry("nice", "vieux-nice", 10),
  entry("nice", "fabron", 9),
  entry("nice", "gairaut", 10),
  entry("nice", "port-de-nice", 10, ["port lympia", "port de nice"]),
  entry("nice", "liberation", 8),
  entry("nice", "riquier", 8),
  entry("nice", "saint-roch", 8, ["st roch"]),
  entry("nice", "nice-ouest", 8),
  entry("nice", "pasteur", 4),
  entry("nice", "ariane", 1),
  entry("nice", "chambrun", 10),
  entry("nice", "valrose", 8),
  entry("nice", "carras", 6),
  entry("nice", "ferber", 6),
  entry("nice", "magnan", 4),
  entry("nice", "californie", 6),
  entry("nice", "musiciens", 10),
  entry("nice", "jean-medecin", 10, ["jean medecin"]),
  entry("nice", "le-ray", 8, ["ray"]),
  entry("nice", "saint-sylvestre", 8),
  entry("nice", "corniche-fleurie", 9),
  entry("nice", "saint-isidore", 8, ["st isidore"]),
  entry("nice", "caucade", 6),
  entry("nice", "madeleine", 4),
  entry("nice", "lingostiere", 4),
];

const capFerrat: ZoneCatalogEntry[] = [
  entry("saint-jean-cap-ferrat", "saint-jean-cap-ferrat", 15, [
    "saint jean cap ferrat",
    "st jean cap ferrat",
    "cap ferrat",
  ]),
];

const cannes: ZoneCatalogEntry[] = [
  entry("cannes", "croisette", 15),
  entry("cannes", "californie", 12),
  entry("cannes", "super-cannes", 9),
  entry("cannes", "palm-beach", 11),
  entry("cannes", "banane", 10),
  entry("cannes", "cannes-centre", 10),
  entry("cannes", "carnot", 7),
  entry("cannes", "montfleury", 8),
  entry("cannes", "basse-californie", 8),
  entry("cannes", "la-bocca", 5),
  entry("cannes", "le-suquet", 6),
  entry("cannes", "croix-des-gardes", 5),
  entry("cannes", "riou-petit-juas-av-de-grasse", 5, [
    "riou",
    "petit juas",
    "av de grasse",
    "avenue de grasse",
  ]),
  entry("cannes", "oxford", 6),
  entry("cannes", "isola-bella", 7),
];

const antibes: ZoneCatalogEntry[] = [
  entry("antibes", "cap-d-antibes", 15, ["cap antibes"]),
  entry("antibes", "vieil-antibes", 12),
  entry("antibes", "centre-antibes", 10),
  entry("antibes", "juan-les-pins", 11),
  entry("antibes", "iles-de-lerins", 0, ["ilerins", "lerins"]),
  entry("antibes", "la-garoupe", 10),
  entry("antibes", "salis", 8),
  entry("antibes", "combes", 7),
  entry("antibes", "fontonne", 7),
  entry("antibes", "rastines", 8),
  entry("antibes", "saint-jean", 6),
  entry("antibes", "les-brusquets", 7),
  entry("antibes", "antibes-hauteurs", 9),
  entry("antibes", "route-de-grasse", 9),
  entry("antibes", "pont-du-lys", 6),
];

const cagnes: ZoneCatalogEntry[] = [
  entry("cagnes-sur-mer", "cros-de-cagnes", 12),
  entry("cagnes-sur-mer", "hippodrome", 8),
  entry("cagnes-sur-mer", "val-fleuri", 8),
  entry("cagnes-sur-mer", "centre-ville", 9),
  entry("cagnes-sur-mer", "hauts-de-cagnes", 8),
  entry("cagnes-sur-mer", "saint-veran", 8),
  entry("cagnes-sur-mer", "les-vaux", 6),
  entry("cagnes-sur-mer", "polygone-riviera", 7),
  entry("cagnes-sur-mer", "breguieres", 7, ["breguieres"]),
  entry("cagnes-sur-mer", "la-pinede", 8),
  entry("cagnes-sur-mer", "beal", 8, ["beal"]),
  entry("cagnes-sur-mer", "l-hubac", 8, ["hubac"]),
  entry("cagnes-sur-mer", "route-de-grasse", 10),
  entry("cagnes-sur-mer", "bord-de-mer", 12),
  entry("cagnes-sur-mer", "gare", 6),
];

const mouginsSlugs = [
  "mougins-village",
  "le-val-de-mougins",
  "les-cabrieres",
  "tournamy",
  "la-grande-bastide",
  "saint-basile",
  "pibonson",
  "l-etang-de-fontmerle",
  "camp-lauvas",
  "les-colles",
  "la-roquette-sur-siagne-limite",
  "chemin-des-bruyeres",
  "haut-mougins",
  "mougins-le-bas",
  "route-de-cannes",
] as const;
const mougins: ZoneCatalogEntry[] = mouginsSlugs.map((slug) =>
  entry("mougins", slug, 9)
);

const mandelieuSlugs = [
  "la-napoule",
  "cannes-marina",
  "minelle",
  "capitou",
  "centre-ville",
  "les-termes",
  "les-groules",
  "cottage",
  "saint-jean-de-cannes",
  "avenue-de-frejus",
  "les-ecureuils",
  "les-vignerons",
  "bord-de-siagne",
  "riviera-golf",
  "hauteurs-de-mandelieu",
] as const;
const mandelieu: ZoneCatalogEntry[] = mandelieuSlugs.map((slug) =>
  entry("mandelieu-la-napoule", slug, 8)
);

const menton: ZoneCatalogEntry[] = [
  entry("menton", "garavan", 6),
  entry("menton", "centre-ville", 12),
  entry("menton", "vieille-ville", 12),
  entry("menton", "borrigo", 6),
  entry("menton", "carei", 6),
  entry("menton", "saint-paul", 6),
  entry("menton", "route-de-castellar", 6),
  entry("menton", "hauteurs-de-menton", 6),
  entry("menton", "madone", 6),
  entry("menton", "terres-chaudes", 6),
  entry("menton", "riviera", 6),
  entry("menton", "bioves", 6),
  entry("menton", "annnonciade", 6, ["annonciade"]),
  entry("menton", "val-du-carei", 6),
  entry("menton", "bord-de-mer", 15),
];

export const zoneCatalog: ZoneCatalogEntry[] = [
  ...nice,
  ...capFerrat,
  ...cannes,
  ...antibes,
  ...cagnes,
  ...mougins,
  ...mandelieu,
  ...menton,
];

export const getZoneBySlug = (
  zoneSlug?: string | null,
  catalog: ZoneCatalogEntry[] = zoneCatalog
) => {
  if (!zoneSlug) return null;
  const bySlug = new Map(catalog.map((item) => [item.slug, item]));
  return bySlug.get(zoneSlug.trim().toLowerCase()) ?? null;
};

export const inferZoneFromText = (
  zoneText?: string | null,
  catalog: ZoneCatalogEntry[] = zoneCatalog
) => {
  if (!zoneText || !zoneText.trim()) return null;

  const normalizedText = normalize(zoneText);
  const cityTokens: Array<{ city: string; tokens: string[] }> = [
    { city: "nice", tokens: ["nice"] },
    { city: "cannes", tokens: ["cannes"] },
    { city: "antibes", tokens: ["antibes", "juan les pins", "juan-les-pins"] },
    { city: "cagnes-sur-mer", tokens: ["cagnes sur mer", "cagnes-sur-mer"] },
    { city: "mougins", tokens: ["mougins"] },
    {
      city: "mandelieu-la-napoule",
      tokens: ["mandelieu", "la napoule", "mandelieu la napoule"],
    },
    { city: "menton", tokens: ["menton"] },
    {
      city: "saint-jean-cap-ferrat",
      tokens: ["saint jean cap ferrat", "st jean cap ferrat", "cap ferrat"],
    },
  ];
  const mentionedCities = new Set(
    cityTokens
      .filter((item) => item.tokens.some((token) => normalizedText.includes(normalize(token))))
      .map((item) => item.city)
  );

  const matches = catalog
    .map((zone) => {
      const bestAliasLength = zone.aliases
        .filter((alias) => normalizedText.includes(alias))
        .reduce((best, alias) => Math.max(best, alias.length), 0);
      return { zone, bestAliasLength };
    })
    .filter((item) => item.bestAliasLength > 0)
    .sort((a, b) => {
      const aCityBoost = mentionedCities.has(a.zone.city) ? 1 : 0;
      const bCityBoost = mentionedCities.has(b.zone.city) ? 1 : 0;
      if (bCityBoost !== aCityBoost) return bCityBoost - aCityBoost;
      if (b.bestAliasLength !== a.bestAliasLength) {
        return b.bestAliasLength - a.bestAliasLength;
      }
      return b.zone.score - a.zone.score;
    });

  if (matches.length === 0) return null;

  const top = matches[0];
  const second = matches[1];
  if (
    second &&
    top.bestAliasLength === second.bestAliasLength &&
    top.zone.city !== second.zone.city &&
    !mentionedCities.has(top.zone.city) &&
    !mentionedCities.has(second.zone.city)
  ) {
    return null;
  }

  return top.zone;
};
