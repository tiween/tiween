/**
 * Event types for the events feature
 */

export interface EventCardEvent {
  id: string | number
  title: string
  posterUrl?: string
  category: string
  venueName: string
  date: string | Date
  price?: number
  currency?: string
}

export type EventCardVariant = "default" | "compact" | "featured"
