import { Heart } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"

export default function WatchlistLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Heart className="text-primary h-8 w-8" />
          <Skeleton className="h-9 w-48" />
        </div>
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border">
            <Skeleton className="h-40 w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
