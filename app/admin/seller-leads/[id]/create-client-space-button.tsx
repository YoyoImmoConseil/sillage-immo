"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateClientSpaceButtonProps = {
  sellerLeadId: string;
};

export function CreateClientSpaceButton({ sellerLeadId }: CreateClientSpaceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/seller-leads/${sellerLeadId}/create-client-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean; clientProjectId?: string; clientProfileId?: string; status?: string };
      if (data.ok && data.clientProjectId && data.clientProfileId) {
        router.push(`/admin/clients/${data.clientProfileId}/projects/${data.clientProjectId}`);
      } else if (data.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <p className="mt-4">
      <button
        onClick={handleClick}
        disabled={loading}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Creation..." : "Creer un espace client vendeur"}
      </button>
    </p>
  );
}
