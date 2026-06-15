// Base skeleton from shadcn/ui
export { Skeleton } from "@/components/ui/skeleton"

// Preset skeletons
export { ListSkeleton } from "./ListSkeleton"
export type { ListSkeletonProps } from "./ListSkeleton"

export { FilmHeroSkeleton } from "./FilmHeroSkeleton"
export type { FilmHeroSkeletonProps } from "./FilmHeroSkeleton"

export { TicketCardSkeleton } from "./TicketCardSkeleton"
export type { TicketCardSkeletonProps } from "./TicketCardSkeleton"

// Re-export feature-specific skeletons for convenience
export { EventCardSkeleton } from "@/features/events/components/EventCard/EventCardSkeleton"
export type { EventCardSkeletonProps } from "@/features/events/components/EventCard/EventCardSkeleton"
