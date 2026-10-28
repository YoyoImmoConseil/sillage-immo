import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronRight, Globe, Mail, MapPin, Phone, UserPlus } from "lucide-react";

import {
  SILLAGE_ADDRESS_DISPLAY,
  SILLAGE_GOOGLE_REVIEWS_URL,
  SILLAGE_INSTAGRAM_URL,
  SILLAGE_LEGAL,
  SILLAGE_MAPS_URL,
  SILLAGE_PHONE_DISPLAY,
  SILLAGE_PHONE_RAW,
} from "@/lib/brand/company";
import { getAdminTeamTitleLabel } from "@/lib/i18n/domain";
import { getRequestLocale } from "@/lib/i18n/request";
import { localizePath } from "@/lib/i18n/routing";
import { SITE_NAME, buildPublicPageMetadata } from "@/lib/seo/site";
import {
  buildTeamCardPath,
  buildTeamCardUrl,
  buildWhatsAppUrl,
  formatPhoneDisplay,
} from "@/lib/team/card";
import { buildTeamCardJsonLd } from "@/lib/team/card-jsonld";
import { getTeamCardBySlug } from "@/services/team/team-card.service";
import { PropertyCard } from "@/app/components/property-card";
import { BrandIcon } from "./brand-icon";
import { TEAM_CARD_COPY } from "./copy";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Carte de visite virtuelle d'un collaborateur (/equipe/<prenom>), ouverte
 * depuis un badge NFC, un QR code ou NameDrop. Mobile d'abord : les trois
 * gestes (appeler, WhatsApp, e-mail) et l'enregistrement du contact sont
 * accessibles sans faire défiler. Collaborateur inconnu ou carte désactivée →
 * redirection vers la page agence, jamais de 404 sur un badge imprimé.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const card = await getTeamCardBySlug(slug, locale);
  if (!card) return { title: SITE_NAME };
  const copy = TEAM_CARD_COPY[locale];
  const title = getAdminTeamTitleLabel(card.member.title, locale);
  return buildPublicPageMetadata({
    path: buildTeamCardPath(card.member.slug),
    locale,
    title: copy.seoTitle(card.member.fullName, title),
    description: copy.seoDescription(card.member.fullName, title),
  });
}

const initialsOf = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "S";

export default async function TeamCardPage({ params }: PageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const card = await getTeamCardBySlug(slug, locale);
  if (!card) {
    redirect(localizePath("/agence", locale));
  }

  const { member, listings, listingsAreFallback } = card;
  const copy = TEAM_CARD_COPY[locale];
  const title = getAdminTeamTitleLabel(member.title, locale);
  const cardPath = buildTeamCardPath(member.slug);
  const cardUrl = buildTeamCardUrl(member.slug);
  const vcardHref = `${cardPath}/contact.vcf`;
  const jsonLd = buildTeamCardJsonLd({
    cardUrl,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: member.fullName,
    jobTitle: title,
    email: member.email,
    phoneE164: member.phoneE164,
    imageUrl: member.avatarUrl,
  });

  const actionClass =
    "flex flex-col items-center justify-center gap-2 rounded-2xl bg-sand/10 px-2 py-4 text-xs font-semibold text-sand ring-1 ring-sand/25 transition hover:bg-sand/20";
  // Sans téléphone, la grille se resserre sur les gestes disponibles (e-mail seul ou e-mail + WhatsApp).
  const actionCount = 1 + (member.phoneE164 ? 1 : 0) + (member.whatsappE164 ? 1 : 0);
  const actionGridClass =
    actionCount === 3 ? "grid-cols-3" : actionCount === 2 ? "grid-cols-2" : "grid-cols-1";
  const rowClass =
    "flex items-center gap-4 rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-navy ring-1 ring-navy/10 transition hover:bg-navy/5";

  const followLinks = [
    {
      href: SILLAGE_INSTAGRAM_URL,
      label: copy.instagram,
      icon: <BrandIcon name="instagram" className="h-5 w-5" />,
      cta: "team_card_instagram",
      external: true,
    },
    {
      href: localizePath("/", locale),
      label: copy.website,
      icon: <Globe aria-hidden className="h-5 w-5" strokeWidth={1.75} />,
      cta: "team_card_website",
      external: false,
    },
    ...(SILLAGE_GOOGLE_REVIEWS_URL
      ? [
          {
            href: SILLAGE_GOOGLE_REVIEWS_URL,
            label: copy.reviews,
            icon: <BrandIcon name="google" className="h-5 w-5" />,
            cta: "team_card_reviews",
            external: true,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Identité + gestes principaux */}
      <section className="bg-navy text-sand">
        <div className="mx-auto w-full max-w-md px-5 pb-10 pt-10 text-center md:max-w-xl md:pb-14 md:pt-16">
          <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full bg-sand/15 ring-4 ring-sand/70 md:h-44 md:w-44">
            {member.avatarUrl ? (
              <Image
                src={member.avatarUrl}
                alt={copy.portraitAlt(member.fullName)}
                fill
                priority
                sizes="(max-width: 768px) 144px, 176px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-4xl font-semibold">
                {initialsOf(member.firstName, member.lastName)}
              </span>
            )}
          </div>
          <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-sand/70">{copy.agencyLine}</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight md:text-4xl">{member.fullName}</h1>
          {title ? <p className="mt-1 text-sm text-sand/80 md:text-base">{title}</p> : null}
          <p className="mt-3 text-sm text-sand/75">
            {member.phoneE164 ? <span>{formatPhoneDisplay(member.phoneE164)} · </span> : null}
            <span className="break-all">{member.email}</span>
          </p>

          <div className={`mt-8 grid gap-3 ${actionGridClass}`}>
            {member.phoneE164 ? (
              <a
                href={`tel:${member.phoneE164}`}
                className={actionClass}
                data-track-phone={member.phoneE164}
                data-track-location="team_card"
              >
                <Phone aria-hidden className="h-6 w-6" strokeWidth={1.75} />
                {copy.call}
              </a>
            ) : null}
            {member.whatsappE164 ? (
              <a
                href={buildWhatsAppUrl(member.whatsappE164)}
                target="_blank"
                rel="noopener noreferrer"
                className={actionClass}
                data-track-whatsapp={member.whatsappE164}
                data-track-location="team_card"
              >
                <BrandIcon name="whatsapp" className="h-6 w-6" />
                {copy.whatsapp}
              </a>
            ) : null}
            <a
              href={`mailto:${member.email}`}
              className={actionClass}
              data-track-email={member.email}
              data-track-location="team_card"
            >
              <Mail aria-hidden className="h-6 w-6" strokeWidth={1.75} />
              {copy.email}
            </a>
          </div>

          <a
            href={vcardHref}
            className="mt-4 flex items-center justify-center gap-3 rounded-full bg-sand px-6 py-4 text-base font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
            data-track-cta="team_card_save_contact"
            data-track-location="team_card"
          >
            <UserPlus aria-hidden className="h-5 w-5" strokeWidth={2} />
            {copy.saveContact}
          </a>
          <p className="mt-3 text-xs text-sand/65">{copy.saveContactHint}</p>
        </div>
      </section>

      {/* Suivre Sillage */}
      <section aria-labelledby="team-card-follow" className="sillage-section-light">
        <div className="mx-auto w-full max-w-md px-5 py-10 md:max-w-xl">
          <h2 id="team-card-follow" className="text-xs uppercase tracking-[0.22em] text-navy/65">
            {copy.followTitle}
          </h2>
          <ul className="mt-4 space-y-3">
            {followLinks.map((link) => (
              <li key={link.cta}>
                {link.external ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rowClass}
                    data-track-cta={link.cta}
                    data-track-location="team_card"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sand">
                      {link.icon}
                    </span>
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight aria-hidden className="h-5 w-5 text-navy/40" />
                  </a>
                ) : (
                  <Link href={link.href} className={rowClass} data-track-cta={link.cta} data-track-location="team_card">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-sand">
                      {link.icon}
                    </span>
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight aria-hidden className="h-5 w-5 text-navy/40" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Biens */}
      {listings.length > 0 ? (
        <section aria-labelledby="team-card-listings" className="bg-white">
          <div className="w-full px-4 py-12 md:px-10 md:py-16 xl:px-14 2xl:px-20">
            <h2 id="team-card-listings" className="sillage-section-title">
              {listingsAreFallback ? copy.listingsTitleAgency : copy.listingsTitleOwn}
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listings.map((item) => (
                <PropertyCard key={item.id} listing={item} locale={locale} />
              ))}
            </div>
            <Link
              href={localizePath("/vente", locale)}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
              data-track-cta="team_card_all_listings"
              data-track-location="team_card"
            >
              {copy.listingsAll}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {/* Agence + mentions loi Hoguet */}
      <section aria-labelledby="team-card-agency" className="sillage-section-light">
        <div className="mx-auto w-full max-w-md px-5 py-10 md:max-w-xl">
          <h2 id="team-card-agency" className="text-xs uppercase tracking-[0.22em] text-navy/65">
            {copy.agencyTitle}
          </h2>
          <p className="mt-3 font-serif text-xl font-semibold text-navy">{SITE_NAME}</p>
          <p className="mt-1 flex items-start gap-2 text-sm text-navy/80">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            {SILLAGE_ADDRESS_DISPLAY}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${SILLAGE_PHONE_RAW}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-3 text-sm font-semibold text-sand transition hover:opacity-95"
              data-track-phone={SILLAGE_PHONE_RAW}
              data-track-location="team_card_agency"
            >
              <Phone aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {copy.agencyCall} · {SILLAGE_PHONE_DISPLAY}
            </a>
            <a
              href={SILLAGE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-navy px-5 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
              data-track-cta="team_card_directions"
              data-track-location="team_card_agency"
            >
              <MapPin aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {copy.agencyDirections}
            </a>
          </div>

          <div className="mt-8 border-t border-navy/10 pt-5 text-[11px] leading-relaxed text-navy/65">
            <p className="font-semibold uppercase tracking-[0.18em] text-navy/55">{copy.legalTitle}</p>
            <p className="mt-2">
              {SILLAGE_LEGAL.tradeName} — {SILLAGE_LEGAL.legalName}, {SILLAGE_LEGAL.legalForm}, {SILLAGE_LEGAL.rcs}.
            </p>
            <p className="mt-1">
              Carte professionnelle {SILLAGE_LEGAL.professionalCard}, délivrée par la {SILLAGE_LEGAL.professionalCardIssuer}.
            </p>
            <p className="mt-1">
              {SILLAGE_LEGAL.fundsHandlingTransaction}. Garantie financière : {SILLAGE_LEGAL.financialGuarantee}.
            </p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link href={localizePath("/mentions-legales", locale)} className="underline underline-offset-2">
                {copy.legalLinks.legal}
              </Link>
              <Link href={localizePath("/honoraires", locale)} className="underline underline-offset-2">
                {copy.legalLinks.fees}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

