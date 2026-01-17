import { Skeleton } from "@/components/ui/skeleton"

export default function EventDetailLoading() {
  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero Skeleton */}
      <Skeleton className="h-[350px] w-full md:h-[400px] lg:h-[450px]" />

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Title Area */}
        <div className="mb-6 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>

        {/* Synopsis Skeleton */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Separator */}
        <Skeleton className="my-6 h-px w-full" />

        {/* Venue Skeleton */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>

        {/* Separator */}
        <Skeleton className="my-6 h-px w-full" />

        {/* Showtimes Skeleton */}
        <div className="mb-6 space-y-3">
          <Skeleton className="h-6 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-24 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
            <Skeleton className="h-12 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Sticky CTA Skeleton */}
      <div className="bg-background fixed inset-x-0 bottom-0 border-t p-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
