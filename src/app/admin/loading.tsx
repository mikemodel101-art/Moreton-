import { SkeletonCard } from "@/components/design-system";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6" aria-label="Loading admin console">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
