"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type AssignAdvisorFormProps = {
  clientId: string;
  projectId: string;
};

type AdminProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
  email: string;
  phone?: string | null;
  bookingUrl?: string | null;
};

export function AssignAdvisorForm({
  clientId,
  projectId,
}: AssignAdvisorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [adminId, setAdminId] = useState("");

  useEffect(() => {
    fetch("/api/admin/advisors")
      .then((r) => r.json())
      .then((data: { ok?: boolean; advisors?: AdminProfile[] }) => {
        if (data.ok && data.advisors) setAdmins(data.advisors);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/assign-advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminProfileId: adminId }),
      });
      if ((await res.json()).ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <select
        className="rounded border px-3 py-2 text-sm"
        value={adminId}
        onChange={(e) => setAdminId(e.target.value)}
      >
        <option value="">Selectionner un conseiller</option>
        {admins.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={loading || !adminId}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        Affecter
      </button>
    </form>
  );
}
