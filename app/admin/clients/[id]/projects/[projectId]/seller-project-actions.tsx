"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SellerProjectActionsProps = {
  clientId: string;
  projectId: string;
  sellerProjectId: string;
  hasLead: boolean;
  hasProperties: boolean;
};

export function SellerProjectActions({
  clientId,
  projectId,
  sellerProjectId,
  hasLead,
  hasProperties,
}: SellerProjectActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [propertyToDetach, setPropertyToDetach] = useState("");

  const attachProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/attach-property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: propertyId.trim(), isPrimary: !hasProperties }),
      });
      if ((await res.json()).ok) {
        router.refresh();
        setPropertyId("");
      }
    } finally {
      setLoading(false);
    }
  };

  const detachProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyToDetach.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/detach-property`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPropertyId: propertyToDetach.trim() }),
      });
      if ((await res.json()).ok) {
        router.refresh();
        setPropertyToDetach("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={attachProperty} className="flex flex-wrap gap-2">
        <input
          className="rounded border px-3 py-2 text-sm"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="ID du bien a rattacher"
        />
        <button type="submit" disabled={loading} className="sillage-btn rounded px-4 py-2 text-sm">
          Rattacher un bien
        </button>
      </form>
      {hasProperties && (
        <form onSubmit={detachProperty} className="flex flex-wrap gap-2">
          <input
            className="rounded border px-3 py-2 text-sm"
            value={propertyToDetach}
            onChange={(e) => setPropertyToDetach(e.target.value)}
            placeholder="ID du rattachement (project_properties.id) a retirer"
          />
          <button type="submit" disabled={loading} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700">
            Retirer le bien
          </button>
        </form>
      )}
    </div>
  );
}
