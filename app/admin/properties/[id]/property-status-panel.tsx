"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ADMIN_AVAILABILITY_STATUSES,
  ADMIN_AVAILABILITY_STATUS_LABELS_FR,
  isPublicAvailabilityStatus,
  type AdminAvailabilityStatus,
} from "@/lib/properties/canonical-types";

type PropertyStatusPanelProps = {
  propertyId: string;
  source: string;
  initialAvailabilityStatus: string | null;
  initialIsPublished: boolean;
};

const isKnownStatus = (value: string | null): value is AdminAvailabilityStatus => {
  if (!value) return false;
  return (ADMIN_AVAILABILITY_STATUSES as readonly string[]).includes(value);
};

export function PropertyStatusPanel({
  propertyId,
  source,
  initialAvailabilityStatus,
  initialIsPublished,
}: PropertyStatusPanelProps) {
  const router = useRouter();
  const initialNormalized = useMemo<AdminAvailabilityStatus>(
    () => (isKnownStatus(initialAvailabilityStatus) ? initialAvailabilityStatus : "available"),
    [initialAvailabilityStatus]
  );
  const [status, setStatus] = useState<AdminAvailabilityStatus>(initialNormalized);
  const [savedStatus, setSavedStatus] = useState<AdminAvailabilityStatus>(initialNormalized);
  const [isPublished, setIsPublished] = useState<boolean>(initialIsPublished);
  const [unknownLegacyStatus, setUnknownLegacyStatus] = useState<string | null>(
    initialAvailabilityStatus && !isKnownStatus(initialAvailabilityStatus)
      ? initialAvailabilityStatus
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = status !== savedStatus;
  const willBePublic = isPublicAvailabilityStatus(status);

  const save = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/properties/${propertyId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ availabilityStatus: status }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          availabilityStatus?: string;
          isPublished?: boolean;
        };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Mise a jour du statut impossible.");
          return;
        }
        setSavedStatus(status);
        setIsPublished(Boolean(payload.isPublished));
        setUnknownLegacyStatus(null);
        setMessage(
          willBePublic
            ? "Statut enregistre. Le bien est visible sur le site public."
            : "Statut enregistre. Le bien est masque du site public."
        );
        router.refresh();
      } catch {
        setError("Mise a jour du statut impossible.");
      }
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#141446]">Statut & publication</h2>
          <p className="text-sm text-[#141446]/70">
            Le statut pilote la visibilite publique. Seuls les statuts {" "}
            <span className="font-medium">Disponible</span>,{" "}
            <span className="font-medium">Sous compromis</span> et{" "}
            <span className="font-medium">Sous offre</span> sont diffuses sur le site public et dans les
            alertes acquereurs.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            isPublished
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              isPublished ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          {isPublished ? "Visible publiquement" : "Non publie"}
        </span>
      </div>

      {unknownLegacyStatus ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Statut actuel inconnu de l&apos;application :{" "}
          <code className="rounded bg-amber-100 px-1">{unknownLegacyStatus}</code>. Il sera remplace par
          le statut choisi ci-dessous des l&apos;enregistrement.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Statut du bien (SweepBright)
          <select
            className="mt-1 w-full rounded border px-3 py-2"
            value={status}
            onChange={(event) => setStatus(event.target.value as AdminAvailabilityStatus)}
            disabled={isPending}
          >
            {ADMIN_AVAILABILITY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ADMIN_AVAILABILITY_STATUS_LABELS_FR[value]}
                {isPublicAvailabilityStatus(value) ? " · public" : " · interne"}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <span className="block">Apres enregistrement</span>
          <p
            className={`mt-1 rounded border px-3 py-2 ${
              willBePublic
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-gray-300 bg-gray-50 text-gray-800"
            }`}
          >
            {willBePublic
              ? "Le bien sera visible sur le site public."
              : "Le bien sera masque du site public."}
          </p>
        </div>
      </div>

      {source === "sweepbright" ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
          Bien d&apos;origine SweepBright : si vous modifiez le statut ici, le prochain webhook
          SweepBright ecrasera votre choix avec la valeur du CRM. C&apos;est un override
          &laquo;&nbsp;one-shot&nbsp;&raquo; jusqu&apos;a la prochaine synchronisation.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!isDirty || isPending}
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        >
          {isPending ? "Enregistrement..." : "Enregistrer le statut"}
        </button>
        {message ? <span className="text-sm text-green-700">{message}</span> : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>
    </section>
  );
}
