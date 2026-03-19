"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AttachPropertyToProjectButtonProps = {
  propertyId: string;
};

export function AttachPropertyToProjectButton({ propertyId }: AttachPropertyToProjectButtonProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const createRes = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
        }),
      });
      const createData = (await createRes.json()) as { ok?: boolean; clientProfileId?: string };
      if (!createData.ok || !createData.clientProfileId) {
        setLoading(false);
        return;
      }

      const projectRes = await fetch(`/api/admin/clients/${createData.clientProfileId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createdFrom: "crm_property",
          propertyId,
        }),
      });
      const projectData = (await projectRes.json()) as { ok?: boolean; clientProjectId?: string };
      if (projectData.ok && projectData.clientProjectId) {
        router.push(`/admin/clients/${createData.clientProfileId}/projects/${projectData.clientProjectId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="sillage-btn rounded px-4 py-2 text-sm"
      >
        Rattacher a un projet vendeur
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[rgba(20,20,70,0.12)] p-4">
      <p className="text-sm font-medium text-[#141446]">Creer un client et rattacher ce bien</p>
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email *"
        required
      />
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Prenom"
      />
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Nom"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Creation..." : "Creer et rattacher"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="rounded border px-4 py-2 text-sm"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
