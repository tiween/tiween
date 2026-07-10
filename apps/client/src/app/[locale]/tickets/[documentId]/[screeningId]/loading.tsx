import { Skeleton } from "@/components/ui/skeleton"
import { TicketCardSkeleton } from "@/components/common"

/**
 * Route-level loading UI for the tickets page (Story 6.1). Shown during RSC
 * navigation before the event header resolves; the client tier fetch renders its
 * own in-component skeletons afterwards.
 */
export default function TicketsLoading() {
  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Tier rows */}
        <div className="flex flex-col gap-3">
          <TicketCardSkeleton size="small" />
          <TicketCardSkeleton size="small" />
          <TicketCardSkeleton size="small" />
        </div>
      </div>
    </div>
  )
}
