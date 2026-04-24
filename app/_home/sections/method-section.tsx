import Link from "next/link";
import type { AppLocale } from "@/lib/i18n/config";
import { localizePath } from "@/lib/i18n/routing";
import { HOME_COPY } from "../copy";

type Props = { locale: AppLocale };

export function MethodSection({ locale }: Props) {
  const copy = HOME_COPY[locale].method;
  const ctaCopy = HOME_COPY[locale].ctaGlobal;

  return (
    <section
      id="methode"
      aria-labelledby="method-title"
      className="sillage-section-light scroll-mt-24"
    >
      <div className="w-full px-6 py-16 md:px-10 md:py-24 xl:px-14 2xl:px-20 space-y-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#141446]/65">
            {copy.eyebrow}
          </p>
          <h2 id="method-title" className="sillage-section-title">
            {copy.title}
          </h2>
          <p className="sillage-editorial-text text-[#141446]/80">{copy.subtitle}</p>
        </div>

        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {copy.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col gap-3 rounded-[24px] bg-white p-6 ring-1 ring-[#141446]/5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#141446] font-serif text-sm text-[#f4ece4]">
                  {index + 1}
                </span>
                <h3 className="font-serif text-lg font-semibold text-[#141446]">
                  {step.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-[#141446]/75">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div>
          <Link
            href={localizePath("/estimation", locale)}
            className="inline-flex items-center justify-center rounded-full bg-[#141446] px-6 py-3 text-sm font-semibold text-[#f4ece4] shadow-sm transition hover:-translate-y-[1px] hover:opacity-95"
          >
            {ctaCopy.launchEstimation}
          </Link>
        </div>
      </div>
    </section>
  );
}
