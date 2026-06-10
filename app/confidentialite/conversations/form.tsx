"use client";

import { useState } from "react";

type Step = "request" | "verify" | "done";

export function DeleteConversationsForm() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [softDeleted, setSoftDeleted] = useState<number | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/conversations/request-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Demande impossible.");
      }
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { softDeletedConversations?: number };
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Suppression impossible.");
      }
      setSoftDeleted(json.data?.softDeletedConversations ?? 0);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
        <h2 className="text-lg font-semibold">Suppression enregistrée</h2>
        <p className="mt-2">
          Nous avons marqué{" "}
          <strong>{softDeleted ?? 0}</strong> conversation
          {softDeleted === 1 ? "" : "s"} comme supprimée
          {softDeleted === 1 ? "" : "s"}. Elles seront effacées
          définitivement de nos systèmes dans les 30 jours.
        </p>
        <p className="mt-3 text-xs opacity-80">
          Aucune action supplémentaire n&apos;est requise de votre part.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(20,20,70,0.18)] bg-white/80 p-6">
      {step === "request" ? (
        <form onSubmit={requestCode} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-navy">
              Votre adresse e-mail
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[rgba(20,20,70,0.2)] bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none"
              placeholder="vous@exemple.com"
            />
          </label>
          {error ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading || email.length < 3}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-sand hover:bg-[#1c1c5a] disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Recevoir un code de vérification"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="space-y-4">
          <p className="text-sm text-navy/80">
            Un code à 6 chiffres a été envoyé à{" "}
            <strong>{email}</strong>. Saisissez-le ci-dessous (valable 15
            minutes).
          </p>
          <label className="block">
            <span className="text-sm font-medium text-navy">
              Code de vérification
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-[rgba(20,20,70,0.2)] bg-white px-3 py-2 text-sm tracking-[0.4em] focus:border-navy focus:outline-none"
              placeholder="123456"
            />
          </label>
          {error ? (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setCode("");
                setError(null);
              }}
              className="rounded-lg border border-[rgba(20,20,70,0.2)] px-4 py-2 text-sm hover:bg-[rgba(20,20,70,0.05)]"
            >
              Changer d&apos;e-mail
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-sand hover:bg-[#1c1c5a] disabled:opacity-50"
            >
              {loading ? "Vérification…" : "Confirmer la suppression"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
