"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_TEAM_TITLES, type AdminRole, type AdminTeamTitle } from "@/types/domain/admin";

type UserProfile = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  title: AdminTeamTitle | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

const countWords = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const roleLabel: Record<AdminRole, string> = {
  collaborateur: "Collaborateur",
  manager: "Manager",
  administrateur: "Administrateur",
};

const isPortrait = (file: File) =>
  new Promise<boolean>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve(image.height > image.width);
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve(false);
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });

export function UserProfileForm({ user, canManage }: { user: UserProfile; canManage: boolean }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [title, setTitle] = useState<AdminTeamTitle | "">(user.title ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUploading] = useTransition();

  const words = useMemo(() => countWords(bio), [bio]);

  const save = () => {
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, title, phone, bio }),
        });
        const payload = (await response.json()) as { ok?: boolean; message?: string };
        if (!response.ok || !payload.ok) {
          setError(payload.message ?? "Enregistrement impossible.");
          return;
        }

        setResult("Fiche utilisateur mise a jour.");
        router.refresh();
      } catch {
        setError("Enregistrement impossible.");
      }
    });
  };

  const uploadAvatar = async (file: File) => {
    setError(null);
    setResult(null);

    if (!(await isPortrait(file))) {
      setError("Le portrait doit etre vertical.");
      return;
    }

    startUploading(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/admin/users/${user.id}/avatar`, {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          avatarUrl?: string;
        };

        if (!response.ok || !payload.ok || !payload.avatarUrl) {
          setError(payload.message ?? "Upload impossible.");
          return;
        }

        setAvatarUrl(payload.avatarUrl);
        setResult("Photo mise a jour.");
        router.refresh();
      } catch {
        setError("Upload impossible.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#141446]/68">Utilisateur</p>
          <h2 className="text-2xl font-semibold text-[#141446]">{user.fullName ?? user.email}</h2>
          <p className="mt-1 text-sm text-[#141446]/72">
            {roleLabel[user.role]} · {user.isActive ? "Actif" : "Suspendu"}
          </p>
        </div>
        <Link href="/admin/users" className="rounded border px-4 py-2 text-sm text-[#141446]">
          Retour a la liste
        </Link>
      </div>

      <section className="rounded-3xl border border-[rgba(20,20,70,0.16)] bg-white/70 p-6">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-[#f4ece4]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.fullName ?? user.email} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#141446]/55">
                  Aucun portrait
                </div>
              )}
            </div>
            <label className="block text-sm text-[#141446]">
              <span className="mb-2 block font-medium">Photo portrait</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block w-full text-sm"
                disabled={!canManage || isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadAvatar(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <p className="text-xs text-[#141446]/60">Format portrait recommande. PNG, JPG ou WebP, 5 Mo max.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-[#141446]">
              <span className="mb-2 block font-medium">Prenom</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={firstName}
                disabled={!canManage || isPending}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label className="text-sm text-[#141446]">
              <span className="mb-2 block font-medium">Nom</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={lastName}
                disabled={!canManage || isPending}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            <label className="text-sm text-[#141446]">
              <span className="mb-2 block font-medium">Titre</span>
              <select
                className="w-full rounded border px-3 py-2"
                value={title}
                disabled={!canManage || isPending}
                onChange={(event) => setTitle(event.target.value as AdminTeamTitle | "")}
              >
                <option value="">Choisir un titre</option>
                {ADMIN_TEAM_TITLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#141446]">
              <span className="mb-2 block font-medium">Telephone</span>
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Ex. 06 00 00 00 00"
                value={phone}
                disabled={!canManage || isPending}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="text-sm text-[#141446] md:col-span-2">
              <span className="mb-2 block font-medium">Email affiche</span>
              <input className="w-full rounded border px-3 py-2 bg-[#f8f5f1]" value={user.email} disabled />
            </label>
            <label className="text-sm text-[#141446] md:col-span-2">
              <span className="mb-2 block font-medium">Presentation</span>
              <textarea
                className="min-h-40 w-full rounded border px-3 py-2"
                placeholder="Presentation publique de l'utilisateur"
                value={bio}
                disabled={!canManage || isPending}
                onChange={(event) => setBio(event.target.value)}
              />
              <span className={`mt-2 block text-xs ${words > 250 ? "text-red-700" : "text-[#141446]/60"}`}>
                {words}/250 mots
              </span>
            </label>
          </div>
        </div>

        {canManage ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="sillage-btn rounded px-4 py-2 text-sm disabled:opacity-60"
              disabled={isPending || isUploading || words > 250}
              onClick={save}
            >
              {isPending ? "Enregistrement..." : "Enregistrer la fiche"}
            </button>
          </div>
        ) : null}
      </section>

      {result ? <p className="text-sm text-green-700">{result}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
