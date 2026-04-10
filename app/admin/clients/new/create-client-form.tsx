"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateClientForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; clientProfileId?: string; status?: string };
      if (data.ok && data.clientProfileId) {
        router.push(`/admin/clients/${data.clientProfileId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div>
        <label className="block text-sm font-medium text-[#141446]">Email *</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@exemple.fr"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#141446]">Prenom</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prenom"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#141446]">Nom</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#141446]">Telephone</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Creation..." : "Creer le client"}
      </button>
    </form>
  );
}
