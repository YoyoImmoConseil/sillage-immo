"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClientDetailFormProps = {
  clientId: string;
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

export function ClientDetailForm({ clientId, initial }: ClientDetailFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean };
      if (data.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
      <input
        className="rounded border px-3 py-2 text-sm"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Prenom"
      />
      <input
        className="rounded border px-3 py-2 text-sm"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Nom"
      />
      <input
        className="rounded border px-3 py-2 text-sm"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        className="rounded border px-3 py-2 text-sm"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telephone"
      />
      <button
        type="submit"
        disabled={loading}
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Modifier"}
      </button>
    </form>
  );
}
