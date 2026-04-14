"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "new", label: "Nouveau" },
  { value: "to_call", label: "A rappeler" },
  { value: "qualified", label: "Qualifié" },
  { value: "closed", label: "Clos" },
] as const;

type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

type StatusFormProps = {
  sellerLeadId: string;
  initialStatus: string;
};

export function SellerLeadStatusForm({ sellerLeadId, initialStatus }: StatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusValue>(
    STATUS_OPTIONS.some((option) => option.value === initialStatus)
      ? (initialStatus as StatusValue)
      : "new"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/seller-leads/${sellerLeadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Impossible de mettre à jour le statut.");
          return;
        }
        router.refresh();
      } catch {
        setError("Erreur réseau pendant la mise à jour du statut.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusValue)}
          className="rounded border px-3 py-2 text-sm"
          disabled={isPending}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Mise à jour..." : "Mettre à jour le statut"}
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
