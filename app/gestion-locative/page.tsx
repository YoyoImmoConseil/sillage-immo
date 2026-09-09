import type { Metadata } from "next";
import { getRequestLocale } from "@/lib/i18n/request";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import {
  SILLAGE_CONTACT_EMAIL,
  SILLAGE_GESTION_PHONE_DISPLAY,
  SILLAGE_GESTION_PHONE_RAW,
} from "@/lib/brand/company";
import { PageHero } from "@/app/components/page-hero";
import { GESTION_COPY } from "@/app/_pages/gestion-copy";
import { ManifestoSection } from "@/app/_pages/manifesto-section";
import { StepsSection } from "@/app/_pages/steps-section";
import { CheckIcon } from "@/app/_home/shared/cta-button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return buildPublicPageMetadata({
    path: "/gestion-locative",
    locale,
    ...GESTION_COPY[locale].seo,
    image: "/pages/nice-place-massena.jpg",
  });
}

export default async function GestionLocativePage() {
  const locale = await getRequestLocale();
  const copy = GESTION_COPY[locale];

  return (
    <main className="min-h-screen">
      <PageHero
        eyebrow={copy.hero.eyebrow}
        title={copy.hero.title}
        subtitle={copy.hero.subtitle}
        image={{ src: "/pages/nice-place-massena.jpg", alt: copy.hero.imageAlt }}
        primaryCta={{ href: `tel:${SILLAGE_GESTION_PHONE_RAW}`, label: copy.ctaCall }}
        secondaryCta={{ href: `mailto:${SILLAGE_CONTACT_EMAIL}`, label: copy.ctaEmail, external: true }}
      />

      <ManifestoSection id="gestion-manifesto" title={copy.manifesto.title} paragraphs={copy.manifesto.paragraphs} />

      {/* Services */}
      <section aria-labelledby="gestion-services-title" className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.services.eyebrow}</p>
            <h2 id="gestion-services-title" className="sillage-section-title">
              {copy.services.title}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {copy.services.blocks.map((block, index) => (
              <article key={block.title} className="flex flex-col gap-4 rounded-[24px] bg-white p-6 ring-1 ring-navy/5 md:p-8">
                <span className="font-serif text-sm text-navy/50">0{index + 1}</span>
                <h3 className="font-serif text-xl font-semibold text-navy md:text-2xl">{block.title}</h3>
                <p className="text-sm leading-relaxed text-navy/75">{block.body}</p>
                <ul className="space-y-3 pt-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-navy/85">
                      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-navy text-sand">
                        <CheckIcon className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Honoraires */}
      <section aria-labelledby="gestion-pricing-title" className="bg-navy text-sand">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-sand/70">{copy.pricing.eyebrow}</p>
            <h2
              id="gestion-pricing-title"
              className="sillage-section-title-font text-[28px] leading-[1.12] font-semibold md:text-4xl"
            >
              {copy.pricing.title}
            </h2>
          </div>
          <dl className="grid gap-4 md:grid-cols-3 md:gap-6">
            {copy.pricing.lines.map((line) => (
              <div key={line.label} className="rounded-[24px] border border-sand/15 bg-white/5 p-6 md:p-8">
                <dt className="text-xs uppercase tracking-[0.18em] text-sand/70">{line.label}</dt>
                <dd className="mt-3 font-serif text-3xl font-semibold md:text-4xl">{line.value}</dd>
                <dd className="mt-3 text-sm leading-relaxed text-sand/80">{line.note}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-6">
            <div className="max-w-3xl space-y-4 rounded-[24px] bg-sand p-6 text-navy md:p-8">
              <h3 className="font-serif text-xl font-semibold md:text-2xl">{copy.pricing.included.title}</h3>
              <p className="text-sm leading-relaxed text-navy/75">{copy.pricing.included.intro}</p>
              <ul className="space-y-2">
                {copy.pricing.included.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-navy/85">
                    <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-navy text-sand">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="max-w-3xl text-sm text-sand/70">{copy.pricing.footnote}</p>
        </div>
      </section>

      {/* Le mandat de gestion Sillage : engagements, durée, refus */}
      <section id="mandat-gestion" aria-labelledby="gestion-engagements-title" className="bg-white scroll-mt-24">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-12">
          <div className="max-w-3xl space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.engagements.eyebrow}</p>
            <h2
              id="gestion-engagements-title"
              className="sillage-section-title-font text-[28px] leading-[1.12] font-semibold text-navy md:text-4xl"
            >
              {copy.engagements.title}
            </h2>
            <p className="sillage-editorial-text text-navy/80">{copy.engagements.intro}</p>
          </div>

          <ol className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
            {copy.engagements.items.map((item, index) => (
              <li key={item.title} className="flex gap-5 rounded-[24px] bg-sand/40 p-6 ring-1 ring-navy/10 md:p-8">
                <span className="font-serif text-3xl font-semibold leading-none text-navy/35 md:text-4xl">{index + 1}</span>
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-semibold leading-snug text-navy md:text-xl">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-navy/80">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="space-y-3 rounded-[24px] bg-navy p-6 text-sand md:p-8">
              <h3 className="font-serif text-xl font-semibold md:text-2xl">{copy.engagements.duration.title}</h3>
              <p className="text-sm leading-relaxed text-sand/85 md:text-base">{copy.engagements.duration.body}</p>
            </article>
            <article className="space-y-4 rounded-[24px] border border-navy/10 p-6 md:p-8">
              <h3 className="font-serif text-xl font-semibold text-navy md:text-2xl">{copy.engagements.refuse.title}</h3>
              <ul className="space-y-2">
                {copy.engagements.refuse.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-navy/80 md:text-base">
                    <span aria-hidden="true" className="mt-[0.7em] h-px w-4 flex-none bg-navy/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <StepsSection id="gestion-steps" eyebrow={copy.steps.eyebrow} title={copy.steps.title} items={copy.steps.items} />

      {/* FAQ */}
      <section aria-labelledby="gestion-faq-title" className="bg-white">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.faq.eyebrow}</p>
              <h2 id="gestion-faq-title" className="sillage-section-title">
                {copy.faq.title}
              </h2>
            </div>
            <dl className="divide-y divide-navy/10">
              {copy.faq.items.map((item) => (
                <div key={item.question} className="py-5 first:pt-0 last:pb-0">
                  <dt className="font-serif text-lg font-semibold text-navy md:text-xl">{item.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-navy/80 md:text-base">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" aria-labelledby="gestion-contact-title" className="sillage-section-light">
        <div className="w-full px-4 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20">
          <div className="flex flex-col gap-8 rounded-[28px] bg-white p-8 ring-1 ring-navy/5 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs uppercase tracking-[0.22em] text-navy/65">{copy.contact.eyebrow}</p>
              <h2 id="gestion-contact-title" className="font-serif text-2xl font-semibold text-navy md:text-3xl">
                {copy.contact.title}
              </h2>
              <p className="text-sm leading-relaxed text-navy/75 md:text-base">{copy.contact.body}</p>
              <p className="text-xs text-navy/55">{copy.contact.hint}</p>
            </div>
            <dl className="grid shrink-0 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.contact.phoneLabel}</dt>
                <dd className="mt-1">
                  <a
                    href={`tel:${SILLAGE_GESTION_PHONE_RAW}`}
                    className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-sand transition hover:opacity-95"
                  >
                    {SILLAGE_GESTION_PHONE_DISPLAY}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.18em] text-navy/55">{copy.contact.emailLabel}</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${SILLAGE_CONTACT_EMAIL}`}
                    className="inline-flex items-center justify-center rounded-full border border-navy px-6 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5"
                  >
                    {SILLAGE_CONTACT_EMAIL}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
