"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InviteButtonProps = {
  clientId: string;
  projectId: string;
};

export function InviteButton({ clientId, projectId }: InviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
    >
      {loading ? "Envoi..." : "Envoyer une invitation"}
    </button>
  );
}
