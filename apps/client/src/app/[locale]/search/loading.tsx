import { Skeleton } from "@/components/ui/skeleton"

export default function SearchLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header skeleton */}
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
