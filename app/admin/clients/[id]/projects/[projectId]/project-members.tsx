"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProjectMember = {
  clientProfileId: string;
  role: "primary" | "co_owner";
  isLegacyPrimary: boolean;
  fullName: string | null;
  email: string;
  phone: string | null;
  accountActivated: boolean;
  lastLoginAt: string | null;
};

type ProjectMembersManagerProps = {
  clientId: string;
  projectId: string;
  members: ProjectMember[];
  canEdit: boolean;
  canInvite: boolean;
};

const roleLabel = (member: ProjectMember) =>
  member.isLegacyPrimary || member.role === "primary" ? "Titulaire principal" : "Co-titulaire";

export function ProjectMembersManager({
  clientId,
  projectId,
  members,
  canEdit,
  canInvite,
}: ProjectMembersManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const endpoint = `/api/admin/clients/${clientId}/projects/${projectId}/members`;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Ajout impossible.");
        return;
      }
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Ajout impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (member: ProjectMember) => {
    setInvitingId(member.clientProfileId);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/projects/${projectId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email, clientProfileId: member.clientProfileId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Invitation impossible.");
        return;
      }
      setFeedback(`Invitation envoyée à ${member.email}.`);
      router.refresh();
    } catch {
      setError("Invitation impossible.");
    } finally {
      setInvitingId(null);
    }
  };

  const handleRemove = async (clientProfileId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientProfileId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Retrait impossible.");
        return;
      }
      router.refresh();
    } catch {
      setError("Retrait impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-navy">Personnes du projet</h2>
        {canEdit && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="sillage-btn rounded px-4 py-2 text-sm"
          >
            Ajouter une personne
          </button>
        )}
      </div>

      <p className="mt-1 text-sm text-navy/60">
        Toutes ces personnes accèdent au projet dans leur espace Sillage.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {feedback && <p className="mt-3 text-sm text-green-700">{feedback}</p>}

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <div
            key={member.clientProfileId}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(20,20,70,0.14)] p-4"
          >
            <div>
              <p className="font-medium text-navy">
                {member.fullName ?? member.email}{" "}
                <span className="ml-2 rounded-full bg-[rgba(20,20,70,0.08)] px-2 py-0.5 text-xs text-navy/70">
                  {roleLabel(member)}
                </span>
              </p>
              <p className="text-sm text-navy/70">
                {member.email}
                {member.phone ? ` · ${member.phone}` : ""} ·{" "}
                {member.accountActivated ? "Compte activé" : "Prospect (à inviter)"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canInvite && !member.accountActivated && (
                <button
                  type="button"
                  disabled={invitingId === member.clientProfileId}
                  onClick={() => handleInvite(member)}
                  className="text-sm text-navy underline disabled:opacity-50"
                >
                  {invitingId === member.clientProfileId ? "Envoi…" : "Inviter"}
                </button>
              )}
              {canEdit && !member.isLegacyPrimary && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRemove(member.clientProfileId)}
                  className="text-sm text-red-600 underline disabled:opacity-50"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canEdit && showForm && (
        <form
          onSubmit={handleAdd}
          className="mt-4 grid gap-3 rounded-2xl border border-[rgba(20,20,70,0.14)] p-4 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-navy/60" htmlFor="member-email">
              Email *
            </label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="personne@exemple.fr"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-navy/60" htmlFor="member-first">
              Prénom
            </label>
            <input
              id="member-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-navy/60" htmlFor="member-last">
              Nom
            </label>
            <input
              id="member-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-navy/60" htmlFor="member-phone">
              Téléphone
            </label>
            <input
              id="member-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {loading ? "Ajout…" : "Ajouter au projet"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded px-4 py-2 text-sm underline"
            >
              Annuler
            </button>
          </div>
          <p className="text-xs text-navy/60 md:col-span-2">
            Si la personne existe déjà (même email), elle est rattachée sans doublon. Sinon une
            fiche est créée ; pensez ensuite à l’inviter pour qu’elle accède à son espace.
          </p>
        </form>
      )}
    </section>
  );
}
