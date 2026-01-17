/**
 * JSON-LD Structured Data Component
 *
 * Renders schema.org structured data as a script tag for SEO.
 * This component should be used in server components for proper SSR.
 *
 * Security Note: This uses dangerouslySetInnerHTML but is safe because:
 * 1. The data comes from our own server-side functions (not user input)
 * 2. JSON.stringify escapes all special characters
 * 3. The script type "application/ld+json" is not executed as JavaScript
 *
 * @example
 * ```tsx
 * import { JsonLd } from '@/components/seo/JsonLd'
 * import { generateEventJsonLd } from '@/lib/seo'
 *
 * export default function EventPage({ event }) {
 *   const jsonLd = generateEventJsonLd(event, 'https://tiween.tn')
 *   return (
 *     <>
 *       <JsonLd data={jsonLd} />
 *       <EventDetailPage event={event} />
 *     </>
 *   )
 * }
 * ```
 */

export interface JsonLdProps {
  /** The structured data object to render */
  data: Record<string, unknown> | Record<string, unknown>[]
}

export function JsonLd({ data }: JsonLdProps) {
  // JSON.stringify safely escapes all special characters, preventing XSS
  // The application/ld+json type ensures the content is parsed as data, not code
  const jsonString = JSON.stringify(data, null, 0)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonString,
      }}
    />
  )
}

JsonLd.displayName = "JsonLd"
