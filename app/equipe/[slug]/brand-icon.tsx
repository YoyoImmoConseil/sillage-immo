import { siGoogle, siInstagram, siWhatsapp } from "simple-icons";

/**
 * Pictogrammes de marques (Simple Icons, CC0) en SVG inline : pas de police
 * d'icônes à charger, couleur héritée du texte. Les icônes génériques
 * (téléphone, e-mail…) viennent de lucide-react.
 */
const ICONS = {
  instagram: siInstagram,
  whatsapp: siWhatsapp,
  google: siGoogle,
} as const;

export type BrandIconName = keyof typeof ICONS;

export function BrandIcon({ name, className }: { name: BrandIconName; className?: string }) {
  const icon = ICONS[name];
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor" focusable="false">
      <path d={icon.path} />
    </svg>
  );
}
