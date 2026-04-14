"use client";

import { useState } from "react";

export function BuyerSearchForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [searchDetails, setSearchDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const response = await fetch("/api/buyer-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          searchDetails,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Impossible d'enregistrer votre recherche.");
        return;
      }
      setSuccess("Merci. Votre recherche est enregistrée, un conseiller vous contacte rapidement.");
      setFullName("");
      setEmail("");
      setPhone("");
      setSearchDetails("");
    } catch {
      setError("Erreur réseau, merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="acquereur-form" className="sillage-card p-0 space-y-4">
      <h2 className="sillage-section-title">Confier ma recherche acquéreur</h2>
      <p className="text-sm opacity-75">
        Décrivez votre recherche détaillée. Les meilleurs biens peuvent déjà être en base ou
        arriver demain : nous vous accompagnons de A à Z pour capter les bonnes opportunités.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <label>
          Nom complet *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label>
          E-mail *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Téléphone
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          Recherche détaillée (secteur, budget, type de bien, critères) *
          <textarea
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
            value={searchDetails}
            onChange={(event) => setSearchDetails(event.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
        disabled={loading || !fullName.trim() || !email.trim() || !searchDetails.trim()}
        onClick={() => void submit()}
      >
        {loading ? "Envoi..." : "Confier ma recherche"}
      </button>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
