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
      title: "Ajoutez des photos si vous souhaitez une analyse plus fine",
      intro:
        "Les photos et vidéos ne sont pas obligatoires, mais elles aident votre conseiller à mieux apprécier l'état, la luminosité, la vue, les extérieurs et le potentiel du bien.",
      reassurance:
        "Vos médias servent uniquement à l'analyse de votre dossier Sillage.",
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
      title: "Add photos if you want a sharper analysis",
      intro:
        "Photos and videos are not required, but they help your advisor better appreciate the condition, light, view, outdoor areas and potential of your property.",
      reassurance:
        "Your media are used solely to analyse your Sillage file.",
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
      title: "Añada fotos si desea un análisis más fino",
      intro:
        "Las fotos y vídeos no son obligatorios, pero ayudan a su asesor a valorar mejor el estado, la luminosidad, las vistas, los exteriores y el potencial del inmueble.",
      reassurance:
        "Sus archivos se utilizan únicamente para analizar su expediente Sillage.",
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
      title: "Добавьте фотографии, если хотите более точный анализ",
      intro:
        "Фото и видео не обязательны, но они помогают вашему консультанту лучше оценить состояние, освещённость, вид, наружные пространства и потенциал объекта.",
      reassurance:
        "Ваши медиафайлы используются исключительно для анализа вашего досье Sillage.",
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
    <div className="sm:col-span-2 space-y-3 rounded-xl border border-[rgba(20,20,70,0.15)] bg-[#f4ece4] p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="text-xs opacity-75">{copy.intro}</p>
        <p className="text-xs italic opacity-70">{copy.reassurance}</p>
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
