"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateProjectFormProps = {
  clientId: string;
  clientEmail: string;
};

export function CreateProjectForm({ clientId, clientEmail }: CreateProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [propertyId, setPropertyId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          createdFrom: propertyId ? "crm_property" : "admin_manual",
          propertyId: propertyId.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; clientProjectId?: string };
      if (data.ok && data.clientProjectId) {
        router.push(`/admin/clients/${clientId}/projects/${data.clientProjectId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div>
        <label className="block text-sm font-medium text-[#141446]">Titre du projet</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Projet vendeur - ${clientEmail}`}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#141446]">Rattacher un bien (optionnel)</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          placeholder="ID du bien (UUID)"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Creation..." : "Creer le projet"}
      </button>
    </form>
  );
}
