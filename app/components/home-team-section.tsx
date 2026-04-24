/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import { listPublicTeamMembers } from "@/services/home/team.service";
import type { AppLocale } from "@/lib/i18n/config";
import { getAdminRoleLabel, getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { HOME_COPY, PHONE_ARIA_LABEL } from "@/app/_home/copy";
import { SkeletonBar } from "./skeletons";

export function HomeTeamSection({ locale = "fr" }: { locale?: AppLocale }) {
  const copy = HOME_COPY[locale].team;
  return (
    <section id="equipe" aria-labelledby="equipe-title" className="sillage-section-light">
      <div className="w-full px-6 py-14 md:px-10 md:py-20 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="equipe-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.intro}</p>
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
        <article
          key={index}
          className="overflow-hidden rounded-[28px] bg-white/80 shadow-sm"
        >
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
  const copy = HOME_COPY[locale].team;
  const phoneAria = PHONE_ARIA_LABEL[locale];
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
      {members.map((member) => {
        const cleanedPhone = member.phone?.replace(/\s+/g, "") ?? null;
        const hasBooking = Boolean(member.bookingUrl);
        return (
          <article
            key={member.id}
            className="group flex flex-col overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-[#141446]/5"
          >
            <div className="aspect-[3/4] bg-[#f4ece4]">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#141446]/55">
                  {copy.portraitComingSoon}
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-4 p-6 text-[#141446]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#141446]/55">
                  {getAdminRoleLabel(member.role, locale)}
                </p>
                <h3 className="mt-2 text-xl font-semibold">{member.fullName}</h3>
                {member.title ? (
                  <p className="mt-1 text-sm text-[#141446]/70">
                    {getAdminTeamTitleLabel(member.title, locale)}
                  </p>
                ) : null}
              </div>
              {member.bio ? (
                <p className="text-sm leading-relaxed text-[#141446]/80 line-clamp-4">
                  {member.bio}
                </p>
              ) : null}
              <div className="mt-auto flex flex-col gap-2 pt-2">
                {hasBooking && member.bookingUrl ? (
                  <a
                    href={member.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-[#141446] px-5 py-2.5 text-sm font-semibold text-[#f4ece4] transition hover:opacity-95"
                  >
                    {copy.bookLabel}
                  </a>
                ) : null}
                {cleanedPhone ? (
                  <a
                    href={`tel:${cleanedPhone}`}
                    aria-label={`${copy.callLabel} ${member.fullName} ${phoneAria.replace(/.*au\s+|.*at\s+|.*al\s+|.*по номеру\s+/i, "")}`.trim()}
                    className={
                      hasBooking
                        ? "inline-flex items-center justify-center rounded-full border border-[#141446] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#141446] transition hover:bg-[#141446]/5"
                        : "inline-flex items-center justify-center rounded-full bg-[#141446] px-5 py-2.5 text-sm font-semibold text-[#f4ece4] transition hover:opacity-95"
                    }
                  >
                    {copy.callLabel}
                    <span className="ml-2 text-xs opacity-80">{member.phone}</span>
                  </a>
                ) : null}
                <a
                  href={`mailto:${member.email}`}
                  className="text-xs text-[#141446]/70 hover:underline"
                >
                  {member.email}
                </a>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
