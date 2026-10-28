import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Globe, Mail, MapPin, Phone, UserPlus } from "lucide-react";

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
import { renderQrSvg } from "@/lib/team/card-assets";
import { getTeamCardBaseUrl } from "@/services/team/team-card-base-url";
import { getTeamCardBySlug } from "@/services/team/team-card.service";
import { PropertyCard } from "@/app/components/property-card";
import { BrandIcon } from "./brand-icon";
import { ShareCardButton } from "./share-card-button";
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

  // Liens suivis réellement (QR, partage) : domaine de preview pendant les tests, site en production.
  const baseUrl = await getTeamCardBaseUrl();
  // QR affiché à l'écran (utm_medium=screen) : distinct du QR imprimé (card).
  const screenQrSvg = await renderQrSvg(buildTeamCardUrl(member.slug, "qr", "screen", baseUrl));
  const shareUrl = buildTeamCardUrl(member.slug, "share", "screen", baseUrl);

  // Lignes de contact : pictogramme + texte en beige sur bleu, sans cadre ; le texte est le lien.
  const rowClass =
    "group inline-flex items-center gap-3 py-1 text-base text-sand transition hover:text-white";
  const iconClass = "flex h-5 w-5 shrink-0 items-center justify-center text-sand/75 group-hover:text-sand";

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
                // Portraits verticaux : le visage est en haut, on ancre le recadrage en haut.
                className="object-cover object-top"
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

          <ul className="mx-auto mt-8 flex w-fit flex-col items-start gap-2 text-left">
            {member.phoneE164 ? (
              <li>
                <a
                  href={`tel:${member.phoneE164}`}
                  className={rowClass}
                  data-track-phone={member.phoneE164}
                  data-track-location="team_card"
                >
                  <span className={iconClass}>
                    <Phone aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="underline-offset-4 group-hover:underline">{formatPhoneDisplay(member.phoneE164)}</span>
                </a>
              </li>
            ) : null}
            {member.whatsappE164 ? (
              <li>
                <a
                  href={buildWhatsAppUrl(member.whatsappE164)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass}
                  data-track-whatsapp={member.whatsappE164}
                  data-track-location="team_card"
                >
                  <span className={iconClass}>
                    <BrandIcon name="whatsapp" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="underline-offset-4 group-hover:underline">{copy.whatsapp}</span>
                </a>
              </li>
            ) : null}
            <li>
              <a
                href={`mailto:${member.email}`}
                className={rowClass}
                data-track-email={member.email}
                data-track-location="team_card"
              >
                <span className={iconClass}>
                  <Mail aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="break-all underline-offset-4 group-hover:underline">{member.email}</span>
              </a>
            </li>
            <li>
              <a
                href={SILLAGE_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={rowClass}
                data-track-cta="team_card_instagram"
                data-track-location="team_card"
              >
                <span className={iconClass}>
                  <BrandIcon name="instagram" className="h-[18px] w-[18px]" />
                </span>
                <span className="underline-offset-4 group-hover:underline">sillage.immo</span>
              </a>
            </li>
            <li>
              <Link
                href={localizePath("/", locale)}
                className={rowClass}
                data-track-cta="team_card_website"
                data-track-location="team_card"
              >
                <span className={iconClass}>
                  <Globe aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="underline-offset-4 group-hover:underline">sillage-immo.com</span>
              </Link>
            </li>
          </ul>

          <a
            href={vcardHref}
            className="mt-6 flex items-center justify-center gap-3 rounded-full bg-sand px-6 py-4 text-base font-semibold text-navy shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
            data-track-cta="team_card_save_contact"
            data-track-location="team_card"
          >
            <UserPlus aria-hidden className="h-5 w-5" strokeWidth={2} />
            {copy.saveContact}
          </a>
          <p className="mt-3 text-xs text-sand/65">{copy.saveContactHint}</p>
          <div className="mt-4">
            <ShareCardButton
              url={shareUrl}
              title={`${member.fullName} — ${SITE_NAME}`}
              text={copy.shareText(member.fullName, title)}
              label={copy.share}
              copiedLabel={copy.shareCopied}
            />
          </div>

          {/* QR à faire scanner : même carte, provenance « écran » */}
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center gap-3">
            <div
              aria-label={copy.qrTitle}
              role="img"
              className="w-44 rounded-2xl bg-white p-3 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: screenQrSvg }}
            />
            <p className="text-sm font-semibold">{copy.qrTitle}</p>
            <p className="text-xs text-sand/65">{copy.qrHint}</p>
          </div>
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

          {SILLAGE_GOOGLE_REVIEWS_URL ? (
            <a
              href={SILLAGE_GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-navy underline underline-offset-4"
              data-track-cta="team_card_reviews"
              data-track-location="team_card_agency"
            >
              <BrandIcon name="google" className="h-4 w-4" />
              {copy.reviews}
            </a>
          ) : null}

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

