"use client";

import {
  Card,
  Title,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
} from "@tremor/react";
import type { ZoneRow } from "@/services/admin/dashboard-aggregator.service";

export function TopZonesTable({ rows }: { rows: ZoneRow[] }) {
  return (
    <Card className="bg-white/80">
      <Title className="text-[#141446]">Top zones (90 j)</Title>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[#141446]/60">
          Aucune zone identifiée sur la période.
        </p>
      ) : (
        <Table className="mt-3">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ville</TableHeaderCell>
              <TableHeaderCell className="text-right">Vendeurs</TableHeaderCell>
              <TableHeaderCell className="text-right">Acquéreurs</TableHeaderCell>
              <TableHeaderCell className="text-right">Total</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.cityKey}>
                <TableCell>
                  <Badge color="indigo">{row.cityLabel}</Badge>
                </TableCell>
                <TableCell className="text-right">{row.sellerLeads}</TableCell>
                <TableCell className="text-right">{row.buyerLeads}</TableCell>
                <TableCell className="text-right font-semibold">
                  {row.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
