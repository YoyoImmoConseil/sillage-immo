"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPropertyTypeLabel } from "@/lib/properties/property-type-label";
import type { AdminPropertyListItem } from "@/services/properties/manual-property.service";

type SortKey = "title" | "status" | "city" | "type" | "price" | "updatedAt";
type SortDirection = "asc" | "desc";

type Column = { key: SortKey; label: string; align?: "right" };

const COLUMNS: Column[] = [
  { key: "title", label: "Titre" },
  { key: "status", label: "Statut" },
  { key: "city", label: "Ville" },
  { key: "type", label: "Type" },
  { key: "price", label: "Prix", align: "right" },
  { key: "updatedAt", label: "Mis à jour" },
];

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

const businessTypeLabel = (value: string) => (value === "rental" ? "Location" : value === "sale" ? "Vente" : value);

const formatPrice = (item: AdminPropertyListItem) => {
  if (typeof item.priceAmount !== "number") return "—";
  const amount = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(item.priceAmount);
  return item.businessType === "rental" ? `${amount} € / mois` : `${amount} €`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(date);
};

const sortValue = (item: AdminPropertyListItem, key: SortKey): string | number | null => {
  switch (key) {
    case "title":
      return item.title ?? "";
    case "status":
      return `${item.availabilityLabel} ${item.isPublished ? "0" : "1"}`;
    case "city":
      return item.city ?? "";
    case "type":
      return `${businessTypeLabel(item.businessType)} ${formatPropertyTypeLabel(item.propertyType) ?? ""}`;
    case "price":
      return item.priceAmount;
    case "updatedAt":
      return item.updatedAt;
  }
};

const compare = (left: AdminPropertyListItem, right: AdminPropertyListItem, key: SortKey, direction: SortDirection) => {
  const a = sortValue(left, key);
  const b = sortValue(right, key);
  // Les valeurs absentes vont toujours en fin de liste, quel que soit le sens.
  if (a === null || a === "") return b === null || b === "" ? 0 : 1;
  if (b === null || b === "") return -1;
  const result = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));
  return direction === "asc" ? result : -result;
};

type PropertiesTableProps = {
  items: AdminPropertyListItem[];
  emptyLabel: string;
  /** Tri initial : date de mise à jour, du plus récent au plus ancien. */
  initialSort?: { key: SortKey; direction: SortDirection };
};

/**
 * Table triable : un clic sur une colonne trie en croissant, un second clic en
 * décroissant ; cliquer sur une autre colonne repart en croissant.
 */
export function PropertiesTable({ items, emptyLabel, initialSort }: PropertiesTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>(
    initialSort ?? { key: "updatedAt", direction: "desc" }
  );

  const sorted = useMemo(() => [...items].sort((a, b) => compare(a, b, sort.key, sort.direction)), [items, sort]);

  const toggle = (key: SortKey) => {
    setSort((current) =>
      current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" }
    );
  };

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[rgba(20,20,70,0.14)] text-left">
          {COLUMNS.map((column) => {
            const active = sort.key === column.key;
            return (
              <th key={column.key} className={`p-3 ${column.align === "right" ? "text-right" : ""}`} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
                <button
                  type="button"
                  onClick={() => toggle(column.key)}
                  className={`inline-flex items-center gap-1 font-semibold hover:underline ${active ? "text-navy" : "text-navy/80"}`}
                  title={active ? (sort.direction === "asc" ? "Tri croissant — cliquer pour décroissant" : "Tri décroissant — cliquer pour croissant") : "Trier"}
                >
                  {column.label}
                  <span aria-hidden="true" className={`text-xs ${active ? "opacity-100" : "opacity-30"}`}>
                    {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
            );
          })}
          <th className="p-3">Source</th>
          <th className="p-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td className="p-3 opacity-70" colSpan={COLUMNS.length + 2}>
              {emptyLabel}
            </td>
          </tr>
        ) : (
          sorted.map((item) => (
            <tr key={item.id} className="border-b border-[rgba(20,20,70,0.1)] last:border-0">
              <td className="p-3">
                <Link href={`/admin/properties/${item.id}`} className="hover:underline">
                  {item.title ?? "Bien sans titre"}
                </Link>
              </td>
              <td className="p-3">
                <span className="whitespace-nowrap">{item.availabilityLabel}</span>
                <span className="ml-2 text-xs text-navy/60">{item.isPublished ? "· publié" : item.listingId ? "· non publié" : "· sans annonce"}</span>
              </td>
              <td className="p-3">{item.city ?? "—"}</td>
              <td className="p-3">
                {businessTypeLabel(item.businessType)} · {formatPropertyTypeLabel(item.propertyType) ?? "—"}
              </td>
              <td className="p-3 text-right tabular-nums">{formatPrice(item)}</td>
              <td className="p-3 tabular-nums">{formatDate(item.updatedAt)}</td>
              <td className="p-3">{item.source === "sweepbright" ? "SweepBright" : item.source === "manual" ? "Manuel" : item.source === "seller_estimation" ? "Estimation" : item.source}</td>
              <td className="p-3">
                <Link href={`/admin/properties/${item.id}`} className="underline">
                  Ouvrir
                </Link>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
