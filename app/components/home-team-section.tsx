/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import { listPublicTeamMembers } from "@/services/home/team.service";
import type { AppLocale } from "@/lib/i18n/config";
import { getAdminRoleLabel, getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { SkeletonBar } from "./skeletons";

const COPY = {
  fr: {
    eyebrow: "Notre équipe",
    title: "Des conseillers identifiés et joignables",
    intro: "Une équipe locale, visible et accessible, avec un interlocuteur clair pour chaque projet.",
    portraitComingSoon: "Portrait à venir",
  },
  en: {
    eyebrow: "Our team",
    title: "Visible and reachable advisors",
    intro: "A local, accessible team, with a clear point of contact for every project.",
    portraitComingSoon: "Portrait coming soon",
  },
  es: {
    eyebrow: "Nuestro equipo",
    title: "Asesores identificados y disponibles",
    intro: "Un equipo local, visible y accesible, con un interlocutor claro para cada proyecto.",
    portraitComingSoon: "Retrato próximamente",
  },
  ru: {
    eyebrow: "Наша команда",
    title: "Консультанты, которых легко узнать и с которыми легко связаться",
    intro: "Локальная, открытая и доступная команда с понятным контактным лицом по каждому проекту.",
    portraitComingSoon: "Фото скоро появится",
  },
} satisfies Record<AppLocale, Record<string, string>>;

export function HomeTeamSection({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = COPY[locale];
  return (
    <section className="sillage-section-light">
      <div className="w-full px-6 py-10 md:px-10 md:py-14 xl:px-14 2xl:px-20 space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.16em] opacity-70">{copy.eyebrow}</p>
          <h2 className="sillage-section-title">{copy.title}</h2>
          <p className="sillage-editorial-text max-w-3xl opacity-75">{copy.intro}</p>
        </div>

        <Suspense fallback={<HomeTeamMembersSkeleton />}>
          <HomeTeamMembers locale={locale} />
        </Suspense>
      </div>
    </section>
  );
}

function HomeTeamMembersSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <article key={index} className="overflow-hidden rounded-[28px] bg-white/80 shadow-sm">
          <SkeletonBar className="aspect-[3/4] w-full rounded-none" />
          <div className="space-y-3 p-6">
            <SkeletonBar className="h-3 w-1/3" />
            <SkeletonBar className="h-5 w-2/3" />
            <SkeletonBar className="h-4 w-1/2" />
          </div>
        </article>
      ))}
    </div>
  );
}

async function HomeTeamMembers({ locale }: { locale: AppLocale }) {
  const copy = COPY[locale];
  let members: Awaited<ReturnType<typeof listPublicTeamMembers>> = [];
  try {
    members = await listPublicTeamMembers(locale);
  } catch {
    return null;
  }

  if (members.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => (
        <article key={member.id} className="overflow-hidden rounded-[28px] bg-white/80 shadow-sm">
          <div className="aspect-[3/4] bg-[#f4ece4]">
            {member.avatarUrl ? (
              <img src={member.avatarUrl} alt={member.fullName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#141446]/55">
                {copy.portraitComingSoon}
              </div>
            )}
          </div>
          <div className="space-y-3 p-6 text-[#141446]">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#141446]/55">
                {getAdminRoleLabel(member.role, locale)}
              </p>
              <h3 className="mt-2 text-xl font-semibold">{member.fullName}</h3>
              {member.title ? (
                <p className="mt-1 text-sm text-[#141446]/70">
                  {getAdminTeamTitleLabel(member.title, locale)}
                </p>
              ) : null}
            </div>
            <div className="space-y-1 text-sm">
              {member.phone ? (
                <a href={`tel:${member.phone.replace(/\s+/g, "")}`} className="block hover:underline">
                  {member.phone}
                </a>
              ) : null}
              <a href={`mailto:${member.email}`} className="block hover:underline">
                {member.email}
              </a>
            </div>
            {member.bio ? <p className="sillage-editorial-text text-[#141446]/80">{member.bio}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
