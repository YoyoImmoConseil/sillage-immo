"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/config";
import type { PropertyMediaSnapshot } from "@/types/domain/properties";
import { ListingStatusBanner } from "./listing-status-banner";

type PropertyGalleryProps = {
  images: PropertyMediaSnapshot[];
  title: string;
  showThumbnails?: boolean;
  availabilityStatus?: string | null;
  locale?: AppLocale;
};

const GALLERY_COPY: Record<
  AppLocale,
  {
    galleryComingSoon: string;
    mediaUnavailable: string;
    previousPhoto: string;
    nextPhoto: string;
    fullscreen: string;
    close: string;
    showPhoto: (index: number) => string;
  }
> = {
  fr: {
    galleryComingSoon: "Galerie à venir",
    mediaUnavailable: "Média indisponible",
    previousPhoto: "Photo précédente",
    nextPhoto: "Photo suivante",
    fullscreen: "Plein écran",
    close: "Fermer",
    showPhoto: (index) => `Afficher la photo ${index}`,
  },
  en: {
    galleryComingSoon: "Gallery coming soon",
    mediaUnavailable: "Media unavailable",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
    fullscreen: "Fullscreen",
    close: "Close",
    showPhoto: (index) => `Show photo ${index}`,
  },
  es: {
    galleryComingSoon: "Galería próximamente",
    mediaUnavailable: "Medio no disponible",
    previousPhoto: "Foto anterior",
    nextPhoto: "Foto siguiente",
    fullscreen: "Pantalla completa",
    close: "Cerrar",
    showPhoto: (index) => `Mostrar la foto ${index}`,
  },
  ru: {
    galleryComingSoon: "Галерея скоро появится",
    mediaUnavailable: "Медиа недоступно",
    previousPhoto: "Предыдущее фото",
    nextPhoto: "Следующее фото",
    fullscreen: "Полный экран",
    close: "Закрыть",
    showPhoto: (index) => `Показать фото ${index}`,
  },
};

const getImageUrl = (image: PropertyMediaSnapshot) => {
  return image.cachedUrl ?? image.remoteUrl ?? null;
};

// Les images SweepBright ne sont pas encore migrees sur notre pipeline Supabase
// dans tous les cas (remoteUrl fallback). On desactive l'optimisation Next pour
// ces URLs non-allowlistees afin d'eviter un 400 de /_next/image.
const shouldOptimizeImage = (image: PropertyMediaSnapshot) => Boolean(image.cachedUrl);

export function PropertyGallery({
  images,
  title,
  showThumbnails = true,
  availabilityStatus = null,
  locale = "fr",
}: PropertyGalleryProps) {
  const copy = GALLERY_COPY[locale];
  const validImages = useMemo(
    // This component is intentionally image-only; callers may pass the full
    // property media array, but videos and documents are ignored here.
    () => images.filter((image) => image.kind === "image" && getImageUrl(image)),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const safeActiveIndex = activeIndex >= validImages.length ? 0 : activeIndex;
  // Swipe tactile mobile : on mémorise le point de départ et on signale qu'un
  // swipe a eu lieu pour ne pas déclencher le plein écran sur un balayage.
  const touchStartXRef = useRef<number | null>(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    if (!isFullscreen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      } else if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % validImages.length);
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen, validImages.length]);

  if (validImages.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-[rgba(20,20,70,0.18)] text-sm opacity-70">
        {copy.galleryComingSoon}
      </div>
    );
  }

  const activeImage = validImages[safeActiveIndex];
  const activeUrl = getImageUrl(activeImage);

  if (!activeUrl) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-[rgba(20,20,70,0.18)] text-sm opacity-70">
        {copy.mediaUnavailable}
      </div>
    );
  }

  const goPrev = () => {
    setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length);
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % validImages.length);
  };

  // Indices of the active image and its neighbours, deduplicated. Rendering the
  // neighbours (hidden) inside the fullscreen viewer keeps them warm in the
  // browser/Next image cache so navigation is instant instead of re-fetching a
  // fresh 100vw variant on every arrow press.
  const adjacentIndices = Array.from(
    new Set(
      [safeActiveIndex - 1, safeActiveIndex, safeActiveIndex + 1].map(
        (index) => (index + validImages.length) % validImages.length
      )
    )
  );

  return (
    <>
      <section className="space-y-4">
        <div
          className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-[rgba(20,20,70,0.05)]"
          role="button"
          tabIndex={0}
          aria-label={copy.fullscreen}
          onClick={() => {
            // Un swipe ne doit pas ouvrir le plein écran : on absorbe le clic
            // synthétique généré juste après un balayage tactile.
            if (swipedRef.current) {
              swipedRef.current = false;
              return;
            }
            setIsFullscreen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsFullscreen(true);
            }
          }}
          onTouchStart={(event) => {
            touchStartXRef.current = event.touches[0]?.clientX ?? null;
            swipedRef.current = false;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartXRef.current;
            touchStartXRef.current = null;
            if (startX === null || validImages.length < 2) return;
            const deltaX = (event.changedTouches[0]?.clientX ?? startX) - startX;
            if (Math.abs(deltaX) < 40) return;
            swipedRef.current = true;
            if (deltaX < 0) {
              goNext();
            } else {
              goPrev();
            }
          }}
        >
          <Image
            src={activeUrl}
            alt={activeImage.description ?? title}
            fill
            sizes="(min-width: 1024px) 720px, 100vw"
            priority={safeActiveIndex === 0}
            className="object-cover"
            unoptimized={!shouldOptimizeImage(activeImage)}
          />
          <ListingStatusBanner availabilityStatus={availabilityStatus} locale={locale} />
          {validImages.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,70,0.7)] text-lg text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                aria-label={copy.previousPhoto}
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,70,0.7)] text-lg text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  goNext();
                }}
                aria-label={copy.nextPhoto}
              >
                ›
              </button>
            </>
          ) : null}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="rounded-full bg-[rgba(20,20,70,0.7)] px-3 py-1 text-xs text-white">
              {safeActiveIndex + 1} / {validImages.length}
            </span>
          </div>
        </div>

        {showThumbnails && validImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
            {validImages.map((image, index) => {
              const imageUrl = getImageUrl(image);
              if (!imageUrl) return null;

              return (
                <button
                  key={image.id}
                  type="button"
                  className={`relative aspect-square overflow-hidden rounded-xl border ${
                    index === safeActiveIndex
                      ? "border-navy ring-2 ring-[rgba(20,20,70,0.25)]"
                      : "border-[rgba(20,20,70,0.14)]"
                  }`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={copy.showPhoto(index + 1)}
                >
                  <Image
                    src={imageUrl}
                    alt={image.description ?? `${title} ${index + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                    unoptimized={!shouldOptimizeImage(image)}
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(20,20,70,0.94)] p-4 md:p-8">
          <div className="flex items-center justify-between pb-4 text-white">
            <p className="text-sm">
              {title} · {safeActiveIndex + 1}/{validImages.length}
            </p>
            <button
              type="button"
              className="rounded-full border border-white/30 px-3 py-1 text-sm"
              onClick={() => setIsFullscreen(false)}
            >
              {copy.close}
            </button>
          </div>
          <div
            className="relative flex h-[calc(100vh-6rem)] items-center justify-center"
            onTouchStart={(event) => {
              touchStartXRef.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const startX = touchStartXRef.current;
              touchStartXRef.current = null;
              if (startX === null || validImages.length < 2) return;
              const deltaX = (event.changedTouches[0]?.clientX ?? startX) - startX;
              if (Math.abs(deltaX) < 40) return;
              if (deltaX < 0) {
                goNext();
              } else {
                goPrev();
              }
            }}
          >
            {adjacentIndices.map((index) => {
              const image = validImages[index];
              const url = getImageUrl(image);
              if (!url) return null;
              const isActive = index === safeActiveIndex;
              return (
                <Image
                  key={image.id}
                  src={url}
                  alt={image.description ?? title}
                  fill
                  sizes="100vw"
                  priority={isActive}
                  aria-hidden={!isActive}
                  className={`rounded-2xl object-contain transition-opacity duration-150 ${
                    isActive ? "opacity-100" : "opacity-0"
                  }`}
                  unoptimized={!shouldOptimizeImage(image)}
                />
              );
            })}
            {validImages.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
                  onClick={goPrev}
                  aria-label={copy.previousPhoto}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
                  onClick={goNext}
                  aria-label={copy.nextPhoto}
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
