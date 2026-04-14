"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRole } from "@/types/domain/admin";

type UserItem = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  isActive: boolean;
  role: AdminRole;
  authUserId?: string | null;
  title?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

const ROLES: AdminRole[] = ["collaborateur", "manager", "administrateur"];

export function UsersManager(props: {
  users: UserItem[];
  canManage: boolean;
  currentProfileId: string | null;
  currentUserEmail: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AdminRole>("collaborateur");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const activeAdministrators = props.users.filter((user) => user.isActive && user.role === "administrateur").length;

  const createUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName, role }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          created?: { authUserId?: string | null };
        };

        if (!response.ok || !payload.ok || !payload.created) {
          setError(payload.message ?? "Création impossible.");
          return;
        }

        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("collaborateur");
        setResult("Accès créé. La personne pourra maintenant se connecter avec Google.");
        router.refresh();
      } catch {
        setError("Création impossible.");
      }
    });
  };

  const updateUser = (profileId: string, payload: { role?: AdminRole; isActive?: boolean }) => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, ...payload }),
        });
        const data = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Mise à jour impossible.");
          return;
        }
        router.refresh();
      } catch {
        setError("Mise à jour impossible.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <h2 className="text-xl font-semibold text-[#141446]">Règle V1 des droits</h2>
        <p className="mt-2 text-sm text-[#141446]/72">
          Les droits sont attribués automatiquement selon le rôle. Aucun droit individuel n&apos;est
          configuré dans cette version.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4 text-sm text-[#141446]/78">
            <p className="font-semibold text-[#141446]">Collaborateur</p>
            <p className="mt-2">Travaille sur les leads et les biens selon le périmètre métier standard.</p>
          </article>
          <article className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4 text-sm text-[#141446]/78">
            <p className="font-semibold text-[#141446]">Manager</p>
            <p className="mt-2">Pilote l&apos;activité métier mais ne gère pas les accès ni les rôles.</p>
          </article>
          <article className="rounded-2xl border border-[rgba(20,20,70,0.12)] p-4 text-sm text-[#141446]/78">
            <p className="font-semibold text-[#141446]">Administrateur</p>
            <p className="mt-2">Gère tous les accès, les changements de rôle et les activations.</p>
          </article>
        </div>
      </section>

      {props.canManage ? (
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Créer un accès admin</h2>
          <p className="mt-2 text-sm text-[#141446]/72">
            On autorise ici une adresse email interne, puis la connexion se fait ensuite avec Google.
          </p>
          <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-5">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Prénom"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Nom"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="email@sillage-immo.fr"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <select
              className="rounded border px-3 py-2 text-sm"
              value={role}
              onChange={(event) => setRole(event.target.value as AdminRole)}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60" disabled={isPending}>
              {isPending ? "Création..." : "Créer l'accès"}
            </button>
          </form>
          {result ? <p className="mt-3 text-sm text-green-700">{result}</p> : null}
        </section>
      ) : null}

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(20,20,70,0.14)] text-left">
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => (
              <tr key={user.id} className="border-b border-[rgba(20,20,70,0.1)] last:border-0 align-top">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-9 overflow-hidden rounded-xl bg-[#f4ece4]">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.fullName ?? user.email} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p>{user.fullName ?? "-"}</p>
                      {user.title ? <p className="mt-1 text-xs text-[#141446]/60">{user.title}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  {props.canManage ? (
                    (() => {
                      const isSelf =
                        props.currentProfileId === user.id ||
                        props.currentUserEmail?.trim().toLowerCase() === user.email.trim().toLowerCase();
                      const isLastActiveAdmin = user.role === "administrateur" && user.isActive && activeAdministrators <= 1;

                      return (
                    <select
                      className="rounded border px-3 py-2 text-sm"
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user.id, { role: event.target.value as AdminRole })
                      }
                      disabled={isPending || isSelf || isLastActiveAdmin}
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                      );
                    })()
                  ) : (
                    user.role
                  )}
                  {props.currentProfileId === user.id ? (
                    <p className="mt-2 text-xs text-[#141446]/60">Votre propre rôle ne peut pas être modifié ici.</p>
                  ) : null}
                  {user.role === "administrateur" && user.isActive && activeAdministrators <= 1 ? (
                    <p className="mt-2 text-xs text-[#141446]/60">Dernier administrateur actif : rôle verrouillé.</p>
                  ) : null}
                </td>
                <td className="p-3">
                  {user.isActive ? "Actif" : "Suspendu"}
                  {user.authUserId ? " · Connecté" : " · En attente Google"}
                </td>
                <td className="p-3">
                  <div className="space-y-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-block rounded border px-3 py-2 text-sm"
                    >
                      Ouvrir la fiche
                    </Link>
                    {props.canManage ? (
                      (() => {
                        const isSelf =
                          props.currentProfileId === user.id ||
                          props.currentUserEmail?.trim().toLowerCase() === user.email.trim().toLowerCase();
                        const isLastActiveAdmin = user.role === "administrateur" && user.isActive && activeAdministrators <= 1;

                        return (
                          <>
                            <button
                              type="button"
                              className="rounded border px-3 py-2 text-sm"
                              onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                              disabled={isPending || isSelf || isLastActiveAdmin}
                            >
                              {user.isActive ? "Suspendre" : "Réactiver"}
                            </button>
                            {isSelf ? (
                              <p className="text-xs text-[#141446]/60">Vous ne pouvez pas suspendre votre propre accès.</p>
                            ) : null}
                            {isLastActiveAdmin ? (
                              <p className="text-xs text-[#141446]/60">Le dernier administrateur actif ne peut pas être suspendu.</p>
                            ) : null}
                          </>
                        );
                      })()
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
