import { SkeletonCard, SkeletonText } from "@/components/design-system";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6" aria-label="Loading dashboard">
      <div className="skeleton h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}
