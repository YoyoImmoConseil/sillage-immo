"use client";

import { usePathname } from "next/navigation";
import {
  SILLAGE_ADDRESS_DISPLAY,
  SILLAGE_MAPS_URL,
  SILLAGE_PHONE_DISPLAY,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";

export function SiteFooter() {
  const pathname = usePathname() ?? "/";
  const isAdminArea =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/auth/callback";

  if (isAdminArea) return null;

  return (
    <footer className="bg-navy text-sand touch:pb-28">
      <div className="flex flex-col gap-1 px-6 py-8 text-sm text-sand/80 md:px-10 xl:px-14 2xl:px-20">
        <p className="text-xs uppercase tracking-[0.18em] text-sand/90">Sillage Immo</p>
        <a
          href={SILLAGE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit underline-offset-2 hover:text-sand hover:underline"
        >
          {SILLAGE_ADDRESS_DISPLAY}
        </a>
        <a
          href={`tel:${SILLAGE_PHONE_RAW}`}
          className="w-fit underline-offset-2 hover:text-sand hover:underline"
        >
          {SILLAGE_PHONE_DISPLAY}
        </a>
      </div>
    </footer>
  );
}
