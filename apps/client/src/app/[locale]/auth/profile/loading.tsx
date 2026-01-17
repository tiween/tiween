import { Skeleton } from "@/components/ui/skeleton"

export default function ProfileLoading() {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>

          {/* Form fields */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

          {/* Button */}
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    </div>
  )
}
