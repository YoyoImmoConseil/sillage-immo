import { SkeletonBar, SkeletonListingsGrid } from "@/app/components/skeletons";

export default function LocationLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10 md:px-10">
      <SkeletonBar className="h-5 w-40" />
      <SkeletonBar className="h-8 w-2/3" />
      <SkeletonBar className="h-4 w-1/2 opacity-70" />
      <div className="mt-4 flex flex-wrap gap-3">
        <SkeletonBar className="h-10 w-44" />
        <SkeletonBar className="h-10 w-44" />
        <SkeletonBar className="h-10 w-44" />
      </div>
      <div className="pt-2">
        <SkeletonListingsGrid count={6} />
      </div>
    </div>
  );
}
