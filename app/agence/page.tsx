import type { Metadata } from "next";
import Image from "next/image";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import {
  SILLAGE_ADDRESS_DISPLAY,
  SILLAGE_CONTACT_EMAIL,
  SILLAGE_MAPS_URL,
  SILLAGE_PHONE_DISPLAY,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";
import { getAdminRoleLabel, getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { listPublicTeamMembers } from "@/services/home/team.service";
import { PageHero } from "@/app/components/page-hero";
import { PropertyLocationMap } from "@/app/components/property-location-map";
import { PAGES_COPY } from "@/app/_pages/copy";
import { CAROUSEL_ITEM } from "@/app/_home/shared/carousel-item";
import { HCarousel } from "@/app/_home/shared/mobile-carousel";
import { FinalCtaSection } from "@/app/_home/sections/final-cta-section";

/** 35 rue Arson, 06300 Nice (OpenStreetMap). */
const AGENCY_LAT = 43.70322;
const AGENCY_LNG = 7.28817;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/agence",
    locale,
    ...PAGES_COPY[locale].agency.seo,
    image: "/pages/nice-port.jpg",
  });
}

export default async function AgencePage() {
  const locale = await getRequestLocale();
  const copy = PAGES_COPY[locale].agency;

  let members: Awaited<ReturnType<typeof listPublicTeamMembers>> = [];
  try {
    members = await listPublicTeamMembers(locale);
  } catch (error) {
    console.error("[agence] team unavailable", error);
  }
  const portraits = members.filter((member) => member.avatarUrl);
  const others = members.filter((member) => !member.avatarUrl);

  return (
    <main className="min-h-screen">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        subtitle={copy.hero.subtitle}
        image={{ src: "/pages/nice-port.jpg", alt: copy.hero.imageAlt }}
        primaryCta={{ href: `tel:${SILLAGE_PHONE_RAW}`, label: copy.ctaCall }}
        secondaryCta={{ href: `mailto:${SILLAGE_CONTACT_EMAIL}`, label: copy.ctaEmail, external: true }}
      />

      {/* Histoire */}
      <section aria-labelledby="agency-story-title" className="bg-white">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.story.eyebrow}</p>
              <h2 id="agency-story-title" className="sillage-section-title">
                {copy.story.title}
              </h2>
            </div>
            <div className="space-y-5">
              {copy.story.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="sillage-editorial-text text-navy/85">
                  {paragraph}
                </p>
              ))}
              <p className="rounded-[20px] border-l-4 border-navy bg-sand/40 px-5 py-4 font-serif text-lg italic leading-relaxed text-navy md:text-xl">
                {copy.story.promise}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cinq idées */}
      <section aria-labelledby="agency-values-title" className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.values.eyebrow}</p>
            <h2 id="agency-values-title" className="sillage-section-title">
              {copy.values.title}
            </h2>
          </div>
          <HCarousel desktopClassName="md:grid-cols-2 xl:grid-cols-5 md:gap-6" as="ol" ariaLabel={copy.values.title}>
            {copy.values.items.map((item, index) => (
              <li
                key={item.title}
                className={`${CAROUSEL_ITEM} flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-navy/5`}
              >
                <span className="font-serif text-sm text-navy/50">0{index + 1}</span>
                <h3 className="font-serif text-xl font-semibold text-navy">{item.title}</h3>
                <p className="text-sm leading-relaxed text-navy/75">{item.body}</p>
              </li>
            ))}
          </HCarousel>
        </div>
      </section>

      {/* Équipe */}
      {members.length > 0 ? (
        <section id="equipe" aria-labelledby="agency-team-title" className="bg-white">
          <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.team.eyebrow}</p>
              <h2 id="agency-team-title" className="sillage-section-title">
                {copy.team.title}
              </h2>
              <p className="sillage-editorial-text text-navy/80">{copy.team.intro}</p>
            </div>

            {portraits.map((member) => (
              <article
                key={member.id}
                className="grid gap-6 overflow-hidden rounded-[28px] bg-sand/40 ring-1 ring-navy/10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              >
                <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
                  <Image
                    src={member.avatarUrl as string}
                    alt={member.fullName}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-4 p-6 md:p-10">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-navy/55">
                      {member.title ? getAdminTeamTitleLabel(member.title, locale) : getAdminRoleLabel(member.role, locale)}
                    </p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold text-navy md:text-3xl">{member.fullName}</h3>
                  </div>
                  {member.bio ? (
                    <div className="space-y-3 text-sm leading-relaxed text-navy/80 md:text-base">
                      {member.bio.split(/\n{2,}/).map((paragraph) => (
                        <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-auto flex flex-col gap-3 pt-2 sm:flex-row">
                    {member.phone ? (
                      <a
                        href={`tel:${member.phone.replace(/\s+/g, "")}`}
                        className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand transition hover:opacity-95"
                      >
                        {member.phone}
                      </a>
                    ) : null}
                    <a
                      href={`mailto:${member.email}`}
                      className="inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
                    >
                      {member.email}
                    </a>
                  </div>
                </div>
              </article>
            ))}

            {others.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.team.alsoLabel}</p>
                <ul className="flex flex-wrap gap-3">
                  {others.map((member) => (
                    <li key={member.id} className="rounded-full bg-sand/60 px-4 py-2 text-sm text-navy ring-1 ring-navy/10">
                      <span className="font-semibold">{member.fullName}</span>
                      {member.title ? (
                        <span className="text-navy/65"> · {getAdminTeamTitleLabel(member.title, locale)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Nous rencontrer */}
      <section aria-labelledby="agency-visit-title" className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="grid gap-8 md:grid-cols-2 md:gap-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.visit.eyebrow}</p>
                <h2 id="agency-visit-title" className="sillage-section-title">
                  {copy.visit.title}
                </h2>
                <p className="sillage-editorial-text text-navy/80">{copy.visit.body}</p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.visit.addressLabel}</dt>
                  <dd className="mt-1 text-sm text-navy">{SILLAGE_ADDRESS_DISPLAY}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.visit.phoneLabel}</dt>
                  <dd className="mt-1 text-sm text-navy">
                    <a href={`tel:${SILLAGE_PHONE_RAW}`} className="underline-offset-4 hover:underline">
                      {SILLAGE_PHONE_DISPLAY}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.visit.emailLabel}</dt>
                  <dd className="mt-1 text-sm text-navy">
                    <a href={`mailto:${SILLAGE_CONTACT_EMAIL}`} className="underline-offset-4 hover:underline">
                      {SILLAGE_CONTACT_EMAIL}
                    </a>
                  </dd>
                </div>
              </dl>
              <a
                href={SILLAGE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
              >
                {copy.visit.directions}
              </a>
            </div>
            <div className="overflow-hidden rounded-[28px] ring-1 ring-navy/10">
              <PropertyLocationMap
                latitude={AGENCY_LAT}
                longitude={AGENCY_LNG}
                address={SILLAGE_ADDRESS_DISPLAY}
                title={copy.visit.mapTitle}
              />
            </div>
          </div>
        </div>
      </section>

      <FinalCtaSection locale={locale} />
    </main>
  );
}
