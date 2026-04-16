"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InviteButtonProps = {
  clientId: string;
  projectId: string;
  showDirectAccessButton?: boolean;
  latestInvitation?: {
    id: string;
    email: string;
    createdAt: string;
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
  } | null;
};

const formatDate = (value: string) => new Date(value).toLocaleString("fr-FR");

const getInvitationStatus = (
  invitation: NonNullable<InviteButtonProps["latestInvitation"]>
) => {
  if (invitation.revokedAt) return "revoquee";
  if (invitation.acceptedAt) return "acceptee";
  if (new Date(invitation.expiresAt).getTime() < Date.now()) return "expiree";
  return "en_attente";
};

export function InviteButton({
  clientId,
  projectId,
  latestInvitation,
  showDirectAccessButton = false,
}: InviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [directAccessLoading, setDirectAccessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [directAccessLink, setDirectAccessLink] = useState<string | null>(null);

  const invitationStatus = latestInvitation ? getInvitationStatus(latestInvitation) : null;

  const handleClick = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; inviteLink?: string };
      if (!res.ok || !data.ok || !data.inviteLink) {
        setError(data.message ?? "Invitation impossible.");
        return;
      }

      setInviteLink(`${window.location.origin}${data.inviteLink}`);
      setResult("Invitation créée. Vous pouvez copier le lien ou recharger la page pour voir le nouvel état.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setResult("Lien d'invitation copié.");
      setError(null);
    } catch {
      setError("Copie impossible depuis ce navigateur.");
    }
  };

  const handleDirectAccessCopy = async () => {
    setError(null);
    setResult(null);
    setDirectAccessLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/direct-access`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; accessLink?: string };
      if (!res.ok || !data.ok || !data.accessLink) {
        setError(data.message ?? "Lien d'acces direct indisponible.");
        return;
      }

      setDirectAccessLink(data.accessLink);
      await navigator.clipboard.writeText(data.accessLink);
      setResult("Lien d'acces direct copié.");
    } catch {
      setError("Copie impossible depuis ce navigateur.");
    } finally {
      setDirectAccessLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!latestInvitation) return;
    setError(null);
    setResult(null);
    setRevoking(true);
    try {
      const res = await fetch(
        `/api/admin/clients/${clientId}/projects/${projectId}/invite/${latestInvitation.id}/revoke`,
        { method: "POST" }
      );
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Révocation impossible.");
        return;
      }
      setInviteLink(null);
      setResult("Invitation révoquée.");
      router.refresh();
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      {latestInvitation ? (
        <div className="rounded-2xl border border-[rgba(20,20,70,0.12)] bg-white p-4 text-sm text-[#141446]">
          <p>
            Invitation adressée à <strong>{latestInvitation.email}</strong>
          </p>
          <p className="mt-1 text-[#141446]/75">
            Créée le {formatDate(latestInvitation.createdAt)} · expire le {formatDate(latestInvitation.expiresAt)}
          </p>
          <p className="mt-1 text-[#141446]/75">
            Statut :{" "}
            {invitationStatus === "acceptee"
              ? "Acceptée"
              : invitationStatus === "revoquee"
                ? "Révoquée"
                : invitationStatus === "expiree"
                  ? "Expirée"
                  : "En attente"}
          </p>
          {latestInvitation.acceptedAt ? (
            <p className="mt-1 text-green-700">Activation le {formatDate(latestInvitation.acceptedAt)}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[#141446]/70">Aucune invitation envoyée pour ce projet.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Envoi..." : latestInvitation ? "Renvoyer une invitation" : "Envoyer une invitation"}
        </button>
        {inviteLink ? (
          <button
            type="button"
            onClick={handleCopy}
            className="rounded border border-[#141446]/20 px-4 py-2 text-sm text-[#141446]"
          >
            Copier le lien
          </button>
        ) : null}
        {showDirectAccessButton ? (
          <button
            type="button"
            onClick={handleDirectAccessCopy}
            disabled={directAccessLoading}
            className="rounded border border-[#141446]/20 px-4 py-2 text-sm text-[#141446] disabled:opacity-50"
          >
            {directAccessLoading ? "Preparation..." : "Copier lien d'acces direct"}
          </button>
        ) : null}
        {latestInvitation && invitationStatus === "en_attente" ? (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={revoking}
            className="rounded border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
          >
            {revoking ? "Révocation..." : "Révoquer l'invitation"}
          </button>
        ) : null}
      </div>

      {inviteLink ? (
        <p className="rounded-xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] px-4 py-3 text-xs text-[#141446]/75">
          {inviteLink}
        </p>
      ) : null}
      {directAccessLink ? (
        <p className="rounded-xl border border-[rgba(20,20,70,0.12)] bg-[#141446]/[0.03] px-4 py-3 text-xs text-[#141446]/75">
          {directAccessLink}
        </p>
      ) : null}
      {result ? <p className="text-sm text-green-700">{result}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
