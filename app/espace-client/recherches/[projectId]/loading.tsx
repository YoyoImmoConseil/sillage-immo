import { SkeletonBar, SkeletonCard } from "@/app/components/skeletons";

export default function BuyerSearchDetailLoading() {
  return (
    <div className="space-y-6">
      <SkeletonCard>
        <SkeletonBar className="h-4 w-40 opacity-70" />
        <SkeletonBar className="mt-3 h-8 w-2/3" />
        <SkeletonBar className="mt-3 h-4 w-1/2" />
        <div className="mt-5 flex flex-wrap gap-3">
          <SkeletonBar className="h-9 w-40" />
          <SkeletonBar className="h-9 w-48" />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar className="h-5 w-1/3" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar className="h-5 w-1/3" />
        <SkeletonBar className="mt-4 h-72 w-full" />
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar className="h-5 w-1/3" />
        <div className="mt-4 space-y-3">
          <SkeletonBar className="h-20 w-full" />
          <SkeletonBar className="h-20 w-full" />
        </div>
      </SkeletonCard>
    </div>
  );
}
