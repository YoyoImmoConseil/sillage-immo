"use client";

import { useRef } from "react";
import Image from "next/image";
import type { AppLocale } from "@/lib/i18n/config";
import type { UploadedPropertyMedia } from "./seller-api-first-flow.shared";

type SellerPropertyMediaUploadProps = {
  locale?: AppLocale;
  loading: boolean;
  uploading: boolean;
  media: UploadedPropertyMedia[];
  error: string | null;
  onUpload: (kind: "image" | "video", files: File[]) => void;
  onRemove: (uploadId: string) => void;
};

const formatFileSize = (sizeBytes: number, locale: AppLocale) => {
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : locale, {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 1,
  }).format(sizeBytes / (1024 * 1024));
};

export function SellerPropertyMediaUpload({
  locale = "fr",
  loading,
  uploading,
  media,
  error,
  onUpload,
  onRemove,
}: SellerPropertyMediaUploadProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const imageCount = media.filter((item) => item.kind === "image").length;
  const videoCount = media.filter((item) => item.kind === "video").length;

  const copy = {
    fr: {
      title: "Photos et videos du bien (optionnel)",
      intro:
        "Ajoutez jusqu'a 20 photos et quelques videos si vous le souhaitez. Elles enrichissent le dossier Sillage pour analyse humaine, sans etre envoyees au moteur d'estimation automatique.",
      photos: "Photos",
      videos: "Videos",
      photosHint: "Jusqu'a 20 photos",
      videosHint: "Formats mp4, mov ou webm",
      addPhotos: "Ajouter des photos",
      addVideos: "Ajouter des videos",
      uploading: "Upload en cours...",
      uploaded: (photos: number, videos: number) =>
        `${photos} photo${photos > 1 ? "s" : ""} et ${videos} video${videos > 1 ? "s" : ""} ajoutees`,
      remove: "Retirer",
    },
    en: {
      title: "Property photos and videos (optional)",
      intro:
        "Add up to 20 photos and optional videos. They enrich the Sillage file for human review and are not sent to the automatic valuation engine.",
      photos: "Photos",
      videos: "Videos",
      photosHint: "Up to 20 photos",
      videosHint: "mp4, mov or webm formats",
      addPhotos: "Add photos",
      addVideos: "Add videos",
      uploading: "Uploading...",
      uploaded: (photos: number, videos: number) =>
        `${photos} photo${photos > 1 ? "s" : ""} and ${videos} video${videos > 1 ? "s" : ""} added`,
      remove: "Remove",
    },
    es: {
      title: "Fotos y videos del inmueble (opcional)",
      intro:
        "Anada hasta 20 fotos y videos si lo desea. Enriquecen el expediente de Sillage para revision humana y no se envian al motor automatico de valoracion.",
      photos: "Fotos",
      videos: "Videos",
      photosHint: "Hasta 20 fotos",
      videosHint: "Formatos mp4, mov o webm",
      addPhotos: "Anadir fotos",
      addVideos: "Anadir videos",
      uploading: "Carga en curso...",
      uploaded: (photos: number, videos: number) =>
        `${photos} foto${photos > 1 ? "s" : ""} y ${videos} video${videos > 1 ? "s" : ""} anadidos`,
      remove: "Quitar",
    },
    ru: {
      title: "Фото и видео объекта (необязательно)",
      intro:
        "Добавьте до 20 фотографий и при желании видео. Они дополняют досье Sillage для ручной проверки и не отправляются в автоматический модуль оценки.",
      photos: "Фотографии",
      videos: "Видео",
      photosHint: "До 20 фотографий",
      videosHint: "Форматы mp4, mov или webm",
      addPhotos: "Добавить фотографии",
      addVideos: "Добавить видео",
      uploading: "Загрузка...",
      uploaded: (photos: number, videos: number) =>
        `Добавлено ${photos} фото и ${videos} видео`,
      remove: "Удалить",
    },
  }[locale];

  const handleSelection = (kind: "image" | "video", files: FileList | null) => {
    const nextFiles = files ? Array.from(files) : [];
    if (nextFiles.length === 0) return;
    onUpload(kind, nextFiles);
    if (kind === "image" && imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    if (kind === "video" && videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-[rgba(20,20,70,0.15)] bg-white/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="text-xs opacity-75">{copy.intro}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-lg border border-dashed border-[rgba(20,20,70,0.2)] px-4 py-3 text-sm cursor-pointer hover:border-[rgba(20,20,70,0.35)]">
          <span className="block font-medium">{copy.photos}</span>
          <span className="block text-xs opacity-70">{copy.photosHint}</span>
          <span className="mt-2 inline-flex rounded bg-[#141446] px-3 py-2 text-xs text-[#f4ece4]">
            {copy.addPhotos}
          </span>
          <input
            ref={imageInputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={loading || uploading}
            onChange={(event) => handleSelection("image", event.target.files)}
          />
        </label>

        <label className="rounded-lg border border-dashed border-[rgba(20,20,70,0.2)] px-4 py-3 text-sm cursor-pointer hover:border-[rgba(20,20,70,0.35)]">
          <span className="block font-medium">{copy.videos}</span>
          <span className="block text-xs opacity-70">{copy.videosHint}</span>
          <span className="mt-2 inline-flex rounded bg-[#141446] px-3 py-2 text-xs text-[#f4ece4]">
            {copy.addVideos}
          </span>
          <input
            ref={videoInputRef}
            className="sr-only"
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            multiple
            disabled={loading || uploading}
            onChange={(event) => handleSelection("video", event.target.files)}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs opacity-75">
        <span>{copy.uploaded(imageCount, videoCount)}</span>
        {uploading ? <span>{copy.uploading}</span> : null}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {media.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {media.map((item) => (
            <div
              key={item.uploadId}
              className="rounded-lg border border-[rgba(20,20,70,0.12)] bg-[#f8f6f2] p-2"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded bg-[#e7e2d9]">
                {item.kind === "image" ? (
                  <Image
                    src={item.previewUrl}
                    alt={item.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <video
                    className="h-full w-full object-cover"
                    controls
                    preload="metadata"
                    src={item.previewUrl}
                  />
                )}
              </div>
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-medium">{item.fileName}</p>
                <p className="text-xs opacity-70">{formatFileSize(item.sizeBytes, locale)}</p>
                <button
                  type="button"
                  className="text-xs text-[#141446] underline underline-offset-2"
                  onClick={() => onRemove(item.uploadId)}
                >
                  {copy.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
