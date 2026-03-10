import Image from "next/image";

type SillageLogoProps = {
  className?: string;
  priority?: boolean;
};

export function SillageLogo({ className, priority }: SillageLogoProps) {
  return (
    <Image
      src="/logo-sillage.png"
      alt="Logo Sillage Immo"
      width={1024}
      height={817}
      priority={priority}
      className={className ?? "h-auto w-full"}
    />
  );
}
