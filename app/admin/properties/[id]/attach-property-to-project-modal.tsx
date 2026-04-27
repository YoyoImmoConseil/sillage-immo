"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ClientSearchResult = {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
};

type StackedOwnerExisting = {
  kind: "existing";
  uiKey: string;
  clientProfileId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
};

type StackedOwnerNew = {
  kind: "new";
  uiKey: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

type StackedOwner = StackedOwnerExisting | StackedOwnerNew;

type AttachPropertyToProjectModalProps = {
  propertyId: string;
};

const generateUiKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const formatDisplayName = (entry: ClientSearchResult) => {
  const fullName =
    entry.full_name?.trim() ||
    [entry.first_name, entry.last_name].filter(Boolean).join(" ").trim();
  return fullName || entry.email;
};

export function AttachPropertyToProjectModal({ propertyId }: AttachPropertyToProjectModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stack, setStack] = useState<StackedOwner[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stackedExistingIds = useMemo(
    () =>
      new Set(
        stack
          .filter((owner): owner is StackedOwnerExisting => owner.kind === "existing")
          .map((owner) => owner.clientProfileId)
      ),
    [stack]
  );

  const stackedNewEmails = useMemo(
    () =>
      new Set(
        stack
          .filter((owner): owner is StackedOwnerNew => owner.kind === "new")
          .map((owner) => owner.email.toLowerCase())
      ),
    [stack]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/admin/clients?q=${encodeURIComponent(searchTerm.trim())}`
        );
        const data = (await res.json()) as { ok?: boolean; clients?: ClientSearchResult[]; message?: string };
        if (!data.ok || !Array.isArray(data.clients)) {
          setSearchError(data.message ?? "Recherche impossible.");
          setSearchResults([]);
        } else {
          setSearchResults(data.clients);
        }
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : "Recherche impossible.");
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, isOpen]);

  const reset = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSearchError(null);
    setStack([]);
    setShowNewForm(false);
    setNewEmail("");
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setSubmitError(null);
  };

  const close = () => {
    if (submitting) return;
    setIsOpen(false);
    reset();
  };

  const addExistingToStack = (entry: ClientSearchResult) => {
    if (stackedExistingIds.has(entry.id)) return;
    setStack((prev) => [
      ...prev,
      {
        kind: "existing",
        uiKey: generateUiKey(),
        clientProfileId: entry.id,
        email: entry.email,
        fullName: formatDisplayName(entry),
        phone: entry.phone,
      },
    ]);
  };

  const addNewToStack = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setSubmitError("Email requis pour le nouveau proprietaire.");
      return;
    }
    if (stackedNewEmails.has(email)) {
      setSubmitError("Ce nouvel email est deja dans la liste.");
      return;
    }
    setSubmitError(null);
    setStack((prev) => [
      ...prev,
      {
        kind: "new",
        uiKey: generateUiKey(),
        email,
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        phone: newPhone.trim(),
      },
    ]);
    setNewEmail("");
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setShowNewForm(false);
  };

  const removeFromStack = (uiKey: string) => {
    setStack((prev) => prev.filter((owner) => owner.uiKey !== uiKey));
  };

  const moveOwnerUp = (uiKey: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((owner) => owner.uiKey === uiKey);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveOwnerDown = (uiKey: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((owner) => owner.uiKey === uiKey);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (stack.length === 0) {
      setSubmitError("Ajoutez au moins un proprietaire.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        coOwners: stack.map((owner) =>
          owner.kind === "existing"
            ? { clientProfileId: owner.clientProfileId }
            : {
                email: owner.email,
                firstName: owner.firstName || undefined,
                lastName: owner.lastName || undefined,
                phone: owner.phone || undefined,
              }
        ),
      };
      const res = await fetch(`/api/admin/properties/${propertyId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        clientProjectId?: string;
        primaryClientProfileId?: string;
      };
      if (!data.ok || !data.clientProjectId || !data.primaryClientProfileId) {
        throw new Error(data.message ?? "Rattachement impossible.");
      }
      setIsOpen(false);
      reset();
      router.push(
        `/admin/clients/${data.primaryClientProfileId}/projects/${data.clientProjectId}`
      );
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Rattachement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="sillage-btn rounded px-4 py-2 text-sm"
      >
        Rattacher à un projet vendeur
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rattacher le bien à un projet vendeur"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[rgba(20,20,70,0.12)] p-6">
          <div>
            <h2 className="text-xl font-semibold text-[#141446]">
              Rattacher le bien à un projet vendeur
            </h2>
            <p className="mt-1 text-sm text-[#141446]/70">
              Indivision : empilez un ou plusieurs propriétaires existants ou nouveaux. Le premier
              de la liste devient le porteur principal du mandat, les suivants sont co-propriétaires.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-[#141446]/70 hover:bg-[rgba(20,20,70,0.06)]"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#141446]">
                Rechercher un client existant
              </h3>
              <button
                type="button"
                onClick={() => setShowNewForm((prev) => !prev)}
                className="text-sm text-[#141446] underline"
              >
                {showNewForm ? "Masquer le formulaire nouveau client" : "+ Créer un nouveau client"}
              </button>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Email, nom ou téléphone"
              className="w-full rounded-xl border border-[rgba(20,20,70,0.16)] px-4 py-2 text-sm"
            />
            {searching ? (
              <p className="text-sm text-[#141446]/60">Recherche en cours…</p>
            ) : searchError ? (
              <p className="text-sm text-red-600">{searchError}</p>
            ) : searchTerm.trim() && searchResults.length === 0 ? (
              <p className="text-sm text-[#141446]/60">Aucun client correspondant.</p>
            ) : null}
            <ul className="space-y-2">
              {searchResults.map((result) => {
                const alreadyStacked = stackedExistingIds.has(result.id);
                return (
                  <li
                    key={result.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(20,20,70,0.12)] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#141446]">
                        {formatDisplayName(result)}
                      </p>
                      <p className="text-xs text-[#141446]/70">
                        {result.email}
                        {result.phone ? ` · ${result.phone}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyStacked}
                      onClick={() => addExistingToStack(result)}
                      className="rounded-full border border-[rgba(20,20,70,0.16)] px-3 py-1 text-sm text-[#141446] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {alreadyStacked ? "Déjà ajouté" : "+ Ajouter"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {showNewForm ? (
            <section className="mt-6 space-y-3 rounded-2xl border border-dashed border-[rgba(20,20,70,0.20)] p-4">
              <h3 className="text-sm font-semibold text-[#141446]">Nouveau client</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email *"
                  className="rounded-xl border border-[rgba(20,20,70,0.16)] px-3 py-2 text-sm sm:col-span-2"
                  required
                />
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="rounded-xl border border-[rgba(20,20,70,0.16)] px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="Nom"
                  className="rounded-xl border border-[rgba(20,20,70,0.16)] px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Téléphone"
                  className="rounded-xl border border-[rgba(20,20,70,0.16)] px-3 py-2 text-sm sm:col-span-2"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={addNewToStack}
                  className="sillage-btn rounded px-4 py-2 text-sm"
                >
                  Ajouter ce nouveau propriétaire
                </button>
              </div>
            </section>
          ) : null}

          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#141446]">
                Propriétaires sélectionnés ({stack.length})
              </h3>
              {stack.length > 1 ? (
                <p className="text-xs text-[#141446]/60">
                  Le premier est le porteur principal du mandat
                </p>
              ) : null}
            </div>
            {stack.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[rgba(20,20,70,0.16)] p-4 text-sm text-[#141446]/60">
                Aucun propriétaire ajouté pour le moment.
              </p>
            ) : (
              <ol className="space-y-2">
                {stack.map((owner, index) => (
                  <li
                    key={owner.uiKey}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(20,20,70,0.12)] px-4 py-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="rounded-full bg-[rgba(20,20,70,0.08)] px-2 py-1 text-xs font-semibold text-[#141446]">
                        {index === 0 ? "Porteur" : `Co-propriétaire ${index}`}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[#141446]">
                          {owner.kind === "existing"
                            ? owner.fullName ?? owner.email
                            : [owner.firstName, owner.lastName].filter(Boolean).join(" ") || owner.email}
                        </p>
                        <p className="text-xs text-[#141446]/70">
                          {owner.email}
                          {owner.phone ? ` · ${owner.phone}` : ""}
                          {owner.kind === "new" ? " · Nouveau" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveOwnerUp(owner.uiKey)}
                        disabled={index === 0}
                        className="rounded p-1 text-sm text-[#141446] hover:bg-[rgba(20,20,70,0.06)] disabled:opacity-30"
                        aria-label="Monter"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOwnerDown(owner.uiKey)}
                        disabled={index === stack.length - 1}
                        className="rounded p-1 text-sm text-[#141446] hover:bg-[rgba(20,20,70,0.06)] disabled:opacity-30"
                        aria-label="Descendre"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromStack(owner.uiKey)}
                        className="rounded p-1 text-sm text-red-600 hover:bg-red-50"
                        aria-label="Retirer"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-[rgba(20,20,70,0.12)] p-6 sm:flex-row sm:items-center sm:justify-between">
          {submitError ? (
            <p className="text-sm text-red-600 sm:flex-1">{submitError}</p>
          ) : (
            <span className="sm:flex-1" />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={submitting}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || stack.length === 0}
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? "Création…" : "Créer le projet vendeur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
