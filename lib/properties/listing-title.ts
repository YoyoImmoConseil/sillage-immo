/**
 * Titres d'annonces lisibles.
 *
 * SweepBright livre des titres tout en capitales (« NICE MUSICIENS – SUPERBE
 * 5 PIÈCES BELLE ÉPOQUE – PARKING – BALCON »). On les repasse en casse
 * normale pour l'affichage : première lettre de chaque segment, noms propres
 * connus (quartiers de Nice, styles), « m² ». Un titre déjà en casse mixte
 * est rendu tel quel.
 */

const PROPER_NOUNS = [
  "Nice", "Cannes", "Antibes", "Menton", "Beaulieu", "Villefranche", "Èze", "Eze",
  "Monaco", "Beausoleil", "Cagnes", "Saint-Laurent", "Vence", "Grasse", "Mougins",
  "Musiciens", "Port", "Mont-Alban", "Mont Alban", "Mont-Boron", "Mont Boron", "Cimiez",
  "Libération", "Liberation", "Carré", "Or", "Saint-Augustin", "Riquier", "Rimiez",
  "Fabron", "Gairaut", "Église", "Eglise", "Russe", "Paul", "Arène", "Arene", "Palais",
  "Expositions", "Promenade", "Anglais", "Wilson", "Magnan", "Chambrun", "Vernier",
  "Pasteur", "Saint-Roch", "Jean", "Médecin", "Medecin", "Victor", "Hugo", "Gambetta",
  "Borriglione", "Valrose", "Saint-Isidore", "Lanterne", "Sainte-Marguerite",
  "Californie", "Arènes", "Arenes", "Cap", "Vinaigrier", "Gorbella", "Saint-Sylvestre",
  "Saint-Philippe", "Saint-Pierre", "Sainte-Hélène", "Bellet", "Ferber", "Lympia",
  "Garibaldi", "Masséna", "Massena", "Rossetti", "Belle", "Époque", "Epoque", "Art",
  "Déco", "Deco", "Haussmannien", "Niçois", "Nicois", "Riviera", "Côte", "Azur",
];

const PROPER_BY_LOWER = new Map(PROPER_NOUNS.map((word) => [word.toLowerCase(), word]));

const SEGMENT_SEPARATOR = /(\s[–—|-]\s|\s:\s|\s•\s)/;

const isMostlyUppercase = (value: string) => {
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length < 6) return false;
  const upper = letters.replace(/[^\p{Lu}]/gu, "").length;
  return upper / letters.length > 0.8;
};

const capitalize = (word: string) =>
  word.length === 0 ? word : word.charAt(0).toLocaleUpperCase("fr-FR") + word.slice(1);

const normalizeWord = (word: string, isFirstOfSegment: boolean) => {
  // Conserve la ponctuation collée (virgule, parenthèse) autour du mot.
  const match = word.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  const [, lead = "", core = word, trail = ""] = match ?? [];
  const lower = core.toLocaleLowerCase("fr-FR");
  const proper = PROPER_BY_LOWER.get(lower);
  let out: string;
  if (proper) out = proper;
  else if (/^m2$|^m²$/.test(lower)) out = "m²";
  else if (isFirstOfSegment) out = capitalize(lower);
  else out = lower;
  return `${lead}${out}${trail}`;
};

export const humanizeListingTitle = (title: string | null | undefined): string | null => {
  if (!title) return null;
  const trimmed = title.replace(/\s+/g, " ").trim();
  if (!isMostlyUppercase(trimmed)) return trimmed;

  return trimmed
    .split(SEGMENT_SEPARATOR)
    .map((part, index) => {
      if (index % 2 === 1) return part; // séparateur conservé tel quel
      const words = part.split(" ");
      let firstSeen = false;
      return words
        .map((word) => {
          if (!word) return word;
          const isFirst = !firstSeen;
          firstSeen = true;
          return normalizeWord(word, isFirst);
        })
        .join(" ");
    })
    .join("");
};
