"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

type ModalProps = {
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Ferme la modale au clic sur l'overlay (true par défaut). */
  closeOnOverlayClick?: boolean;
  ariaLabel?: string;
  /**
   * Rend la carte comme un <form> (utile pour les modales d'upload) ;
   * le footer doit alors contenir le bouton type="submit".
   */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Modale partagée : overlay + carte centrée, fermeture par Escape,
 * clic overlay (optionnel) et bouton ✕. Header / body scrollable / footer.
 */
export function Modal({
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  ariaLabel,
  onSubmit,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const cardClassName = `flex max-h-[90vh] w-full ${SIZE_CLASS[size]} flex-col overflow-hidden rounded-3xl bg-white shadow-2xl`;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-[rgba(20,20,70,0.12)] p-6">
        <div>
          <h2 className="text-xl font-semibold text-navy">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-navy/70">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-navy/70 hover:bg-[rgba(20,20,70,0.06)]"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
      {footer ? (
        <div className="flex flex-wrap justify-end gap-3 border-t border-[rgba(20,20,70,0.12)] p-6">
          {footer}
        </div>
      ) : null}
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      {onSubmit ? (
        <form
          onSubmit={onSubmit}
          className={cardClassName}
          onClick={(event) => event.stopPropagation()}
        >
          {inner}
        </form>
      ) : (
        <div className={cardClassName} onClick={(event) => event.stopPropagation()}>
          {inner}
        </div>
      )}
    </div>
  );
}
