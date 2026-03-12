import Image from "next/image";

type SillageLogoProps = {
  className?: string;
  priority?: boolean;
};

export function SillageLogo({ className, priority }: SillageLogoProps) {
  return (
    <Image
      src="/logo-sillage-print.svg"
      alt="Logo Sillage Immo"
      width={1280}
      height={1024}
      priority={priority}
      className={className ?? "h-auto w-full"}
    />
  );
}
