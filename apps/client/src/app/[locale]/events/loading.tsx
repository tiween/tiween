import { Skeleton } from "@/components/ui/skeleton"

/** Route-segment loading skeleton for the `/[locale]/events` listing. */
export default function EventsListingLoading() {
  return (
    <div className="bg-background min-h-screen pb-20 lg:pb-0">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        {/* Title */}
        <Skeleton className="mb-4 h-9 w-48" />

        {/* Filter chips */}
        <div className="mb-6 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-28 rounded-full" />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
