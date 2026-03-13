"use client";

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
};

const ROLES: AdminRole[] = ["collaborateur", "manager", "administrateur"];

export function UsersManager(props: {
  users: UserItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<AdminRole>("collaborateur");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          setError(payload.message ?? "Creation impossible.");
          return;
        }

        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("collaborateur");
        setResult("Acces cree. La personne pourra maintenant se connecter avec Google.");
        router.refresh();
      } catch {
        setError("Creation impossible.");
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
          setError(data.message ?? "Mise a jour impossible.");
          return;
        }
        router.refresh();
      } catch {
        setError("Mise a jour impossible.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {props.canManage ? (
        <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
          <h2 className="text-xl font-semibold text-[#141446]">Creer un acces admin</h2>
          <p className="mt-2 text-sm text-[#141446]/72">
            On autorise ici une adresse email interne, puis la connexion se fait ensuite avec Google.
          </p>
          <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-5">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Prenom"
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
              {isPending ? "Creation..." : "Creer l'acces"}
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
              <th className="p-3">Role</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {props.users.map((user) => (
              <tr key={user.id} className="border-b border-[rgba(20,20,70,0.1)] last:border-0">
                <td className="p-3">{user.fullName ?? "-"}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  {props.canManage ? (
                    <select
                      className="rounded border px-3 py-2 text-sm"
                      value={user.role}
                      onChange={(event) =>
                        updateUser(user.id, { role: event.target.value as AdminRole })
                      }
                      disabled={isPending}
                    >
                      {ROLES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td className="p-3">
                  {user.isActive ? "Actif" : "Suspendu"}
                  {user.authUserId ? " · Connecte" : " · En attente Google"}
                </td>
                <td className="p-3">
                  {props.canManage ? (
                    <button
                      type="button"
                      className="rounded border px-3 py-2 text-sm"
                      onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                      disabled={isPending}
                    >
                      {user.isActive ? "Suspendre" : "Reactiver"}
                    </button>
                  ) : (
                    "-"
                  )}
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
