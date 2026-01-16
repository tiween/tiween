import { UID } from "@tiween/admin"

/**
 * Mapping of Strapi Component UID to React Component
 * Currently empty as Tiween uses custom event/venue components
 * rather than generic CMS page sections
 */

export const PageContentComponents: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in UID.Component]?: React.ComponentType<any>
} = {
  // Tiween-specific components will be added here as needed
  // For example: event cards, venue displays, showtime selectors, etc.
}
