/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { PropertyMediaSnapshot } from "@/types/domain/properties";

type PropertyGalleryProps = {
  images: PropertyMediaSnapshot[];
  title: string;
  showThumbnails?: boolean;
};

const getImageUrl = (image: PropertyMediaSnapshot) => {
  return image.cachedUrl ?? image.remoteUrl ?? null;
};

export function PropertyGallery({ images, title, showThumbnails = true }: PropertyGalleryProps) {
  const validImages = useMemo(
    // This component is intentionally image-only; callers may pass the full
    // property media array, but videos and documents are ignored here.
    () => images.filter((image) => image.kind === "image" && getImageUrl(image)),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const safeActiveIndex = activeIndex >= validImages.length ? 0 : activeIndex;

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
        Galerie a venir
      </div>
    );
  }

  const activeImage = validImages[safeActiveIndex];
  const activeUrl = getImageUrl(activeImage);

  if (!activeUrl) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-[rgba(20,20,70,0.18)] text-sm opacity-70">
        Media indisponible
      </div>
    );
  }

  const goPrev = () => {
    setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length);
  };

  const goNext = () => {
    setActiveIndex((current) => (current + 1) % validImages.length);
  };

  return (
    <>
      <section className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.18)] bg-[rgba(20,20,70,0.05)]">
          <img
            src={activeUrl}
            alt={activeImage.description ?? title}
            className="aspect-[4/3] h-full w-full object-cover"
          />
          {validImages.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,70,0.7)] text-lg text-white"
                onClick={goPrev}
                aria-label="Photo precedente"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,70,0.7)] text-lg text-white"
                onClick={goNext}
                aria-label="Photo suivante"
              >
                ›
              </button>
            </>
          ) : null}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="rounded-full bg-[rgba(20,20,70,0.7)] px-3 py-1 text-xs text-white">
              {safeActiveIndex + 1} / {validImages.length}
            </span>
            <button
              type="button"
              className="rounded-full bg-[rgba(20,20,70,0.7)] px-3 py-1 text-xs text-white"
              onClick={() => setIsFullscreen(true)}
            >
              Plein ecran
            </button>
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
                  className={`overflow-hidden rounded-xl border ${
                    index === safeActiveIndex
                      ? "border-[#141446] ring-2 ring-[rgba(20,20,70,0.25)]"
                      : "border-[rgba(20,20,70,0.14)]"
                  }`}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Afficher la photo ${index + 1}`}
                >
                  <img
                    src={imageUrl}
                    alt={image.description ?? `${title} ${index + 1}`}
                    className="aspect-square h-full w-full object-cover"
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
              Fermer
            </button>
          </div>
          <div className="relative flex h-[calc(100vh-6rem)] items-center justify-center">
            <img
              src={activeUrl}
              alt={activeImage.description ?? title}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {validImages.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
                  onClick={goPrev}
                  aria-label="Photo precedente"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
                  onClick={goNext}
                  aria-label="Photo suivante"
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
