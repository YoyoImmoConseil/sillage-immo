import { ReactNode } from "react";

export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[rgba(20,20,70,0.08)] ${className}`}
    />
  );
}

export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl border border-[rgba(20,20,70,0.16)] bg-[#f4ece4] p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function SkeletonGenericPage({ title }: { title?: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-12 md:px-10">
      {title ? (
        <SkeletonBar className="h-5 w-40" />
      ) : (
        <SkeletonBar className="h-4 w-32 opacity-70" />
      )}
      <SkeletonCard>
        <SkeletonBar className="h-8 w-3/4" />
        <SkeletonBar className="mt-4 h-4 w-full" />
        <SkeletonBar className="mt-2 h-4 w-5/6" />
        <SkeletonBar className="mt-2 h-4 w-2/3" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar className="h-5 w-1/3" />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
        </div>
      </SkeletonCard>
    </div>
  );
}

export function SkeletonListingsGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-[rgba(20,20,70,0.16)] bg-[#f4ece4]"
        >
          <SkeletonBar className="h-52 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <SkeletonBar className="h-5 w-3/4" />
            <SkeletonBar className="h-4 w-1/2" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonListingDetail() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8 md:px-10">
      <SkeletonBar className="h-4 w-40 opacity-70" />
      <SkeletonBar className="h-[420px] w-full rounded-3xl" />
      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <SkeletonCard>
          <SkeletonBar className="h-8 w-2/3" />
          <SkeletonBar className="mt-3 h-5 w-1/3" />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <SkeletonBar className="h-14 w-full" />
            <SkeletonBar className="h-14 w-full" />
            <SkeletonBar className="h-14 w-full" />
            <SkeletonBar className="h-14 w-full" />
          </div>
          <SkeletonBar className="mt-6 h-4 w-full" />
          <SkeletonBar className="mt-2 h-4 w-5/6" />
          <SkeletonBar className="mt-2 h-4 w-4/6" />
        </SkeletonCard>
        <SkeletonCard>
          <SkeletonBar className="h-5 w-1/2" />
          <SkeletonBar className="mt-4 h-10 w-full" />
          <SkeletonBar className="mt-2 h-10 w-full" />
          <SkeletonBar className="mt-2 h-10 w-full" />
        </SkeletonCard>
      </div>
    </div>
  );
}

export function SkeletonClientSpace() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8 md:px-10">
      <SkeletonBar className="h-4 w-40 opacity-70" />
      <SkeletonCard>
        <SkeletonBar className="h-8 w-2/3" />
        <SkeletonBar className="mt-3 h-4 w-1/2" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar className="h-5 w-1/3" />
        <div className="mt-4 space-y-3">
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-full" />
        </div>
      </SkeletonCard>
    </div>
  );
}
