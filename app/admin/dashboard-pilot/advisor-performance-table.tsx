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
} from "@tremor/react";
import type { AdvisorRow } from "@/services/admin/dashboard-aggregator.service";

export function AdvisorPerformanceTable({ rows }: { rows: AdvisorRow[] }) {
  return (
    <Card className="bg-white/80">
      <Title className="text-[#141446]">
        Performance conseillers (90 j) — manager &amp; admin uniquement
      </Title>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[#141446]/60">
          Aucun conseiller actif sur la période.
        </p>
      ) : (
        <Table className="mt-3">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Conseiller</TableHeaderCell>
              <TableHeaderCell className="text-right">Projets</TableHeaderCell>
              <TableHeaderCell className="text-right">
                Mandats signés
              </TableHeaderCell>
              <TableHeaderCell className="text-right">
                Mandats en cours
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.adminProfileId}>
                <TableCell>{row.displayName}</TableCell>
                <TableCell className="text-right">{row.projectsTotal}</TableCell>
                <TableCell className="text-right font-semibold">
                  {row.mandatesSigned}
                </TableCell>
                <TableCell className="text-right">
                  {row.mandatesPending}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
