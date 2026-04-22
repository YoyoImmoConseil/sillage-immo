"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  buyerLeadId: string;
  origin: string | null;
  emailVerifiedAt: string | null;
  sweepbrightContactId: string | null;
  sweepbrightSyncedAt: string | null;
  sweepbrightLastError: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

export function BuyerLeadAdminPanel(props: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const triggerSync = async () => {
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/admin/buyer-leads/${encodeURIComponent(props.buyerLeadId)}/sweepbright-sync`,
        { method: "POST" }
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; data?: { status?: string } }
        | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? "Synchronisation impossible.");
      }
      setFeedback({
        kind: "success",
        message: `Synchronisation lancée (${payload.data?.status ?? "ok"}).`,
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Erreur inattendue.",
      });
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[#141446]">
          Observabilité CRM
        </h2>
        <button
          type="button"
          onClick={() => void triggerSync()}
          className="rounded bg-[#141446] px-4 py-2 text-sm font-semibold text-[#f4ece4] disabled:opacity-60"
          disabled={isPending}
        >
          Re-synchroniser SweepBright
        </button>
      </div>

      <dl className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
        <div>
          <dt className="font-medium text-[#141446]/70">Origine</dt>
          <dd>{props.origin ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#141446]/70">Email vérifié le</dt>
          <dd>{formatDate(props.emailVerifiedAt)}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#141446]/70">SweepBright contact ID</dt>
          <dd className="break-all">{props.sweepbrightContactId ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-medium text-[#141446]/70">Dernière synchro</dt>
          <dd>{formatDate(props.sweepbrightSyncedAt)}</dd>
        </div>
        {props.sweepbrightLastError ? (
          <div className="md:col-span-2">
            <dt className="font-medium text-red-700">Dernière erreur SweepBright</dt>
            <dd className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-800">
              {props.sweepbrightLastError}
            </dd>
          </div>
        ) : null}
      </dl>

      {feedback ? (
        <p
          className={`mt-3 rounded border px-3 py-2 text-sm ${
            feedback.kind === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
