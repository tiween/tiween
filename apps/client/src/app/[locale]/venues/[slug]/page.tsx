import { Metadata } from "next"
import { notFound } from "next/navigation"
import { VenueMap } from "@/features/events/components/Map"
import { propertyControlType } from "@/features/venues/schemas/venue-profile"
import { Globe, Mail, MapPin, Phone, Users } from "lucide-react"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type {
  PublicVenue,
  VenuePropertyValue,
} from "@/features/venues/schemas/venue-profile"

import { getVenueBySlug } from "@/lib/strapi-api/content/venues"

interface PageProps {
  params: Promise<{ locale: Locale; slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: "venues.public" })
  const venue = await getVenueBySlug(slug, locale)

  if (!venue) {
    return { title: t("notFound.title"), robots: { index: false } }
  }

  const description = venue.description ?? venue.address ?? t("pageDescription")

  return {
    title: t("pageTitle", { name: venue.name }),
    description,
    openGraph: {
      title: venue.name,
      description,
      type: "website",
      images: venue.logo?.url
        ? [{ url: venue.logo.url, alt: venue.name }]
        : undefined,
    },
  }
}

/**
 * Public venue page (Story 7.2).
 *
 * The surface on which a manager's edits become OBSERVABLE, and the reason an
 * approved venue is republished on save. `getVenueBySlug` hits
 * `GET /venues/venues/by-slug/{slug}`, which is pinned to `status:
 * "published"`: a `pending` or `suspended` venue is indistinguishable from a
 * slug that never existed, and both land on `notFound()`.
 */
export default async function VenuePublicPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: "venues.public" })
  const venue = await getVenueBySlug(slug, locale)

  if (!venue) {
    notFound()
  }

  const cityName = venue.city?.name

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center gap-4">
        {venue.logo && (
          /* eslint-disable-next-line @next/next/no-img-element -- the upload's
             intrinsic dimensions are not reported reliably by every Strapi
             provider, and the logo is sized by `h-16 w-auto`, which next/image
             cannot express without fixing a width and changing the layout. */
          <img
            src={venue.logo.url}
            alt={venue.logo.alternativeText ?? venue.name}
            className="h-16 w-auto object-contain"
          />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{venue.name}</h1>
          {venue.type && (
            <p className="text-muted-foreground text-sm">
              {t(`types.${venue.type}`)}
            </p>
          )}
        </div>
      </header>

      {venue.description && (
        <section className="mt-6">
          <h2 className="sr-only">{t("sections.description")}</h2>
          <p className="whitespace-pre-line">{venue.description}</p>
        </section>
      )}

      <section className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold">{t("sections.contact")}</h2>
        {(venue.address || cityName) && (
          <p className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>{[venue.address, cityName].filter(Boolean).join(", ")}</span>
          </p>
        )}
        {venue.phone && (
          <p className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <a href={`tel:${venue.phone}`}>{venue.phone}</a>
          </p>
        )}
        {venue.email && (
          <p className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4" aria-hidden="true" />
            <a href={`mailto:${venue.email}`}>{venue.email}</a>
          </p>
        )}
        {venue.website && (
          <p className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4" aria-hidden="true" />
            <a href={venue.website} target="_blank" rel="noopener noreferrer">
              {venue.website}
            </a>
          </p>
        )}
        {venue.capacity != null && (
          <p className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" aria-hidden="true" />
            {/* Rendered as a plain string, never through an ICU number
                placeholder: an `ar` catalog resolving to the `arab` numbering
                system would print Arabic-Indic digits. */}
            <span>
              {t("capacity")}: {String(venue.capacity)}
            </span>
          </p>
        )}
      </section>

      {venue.images.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">{t("sections.photos")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {venue.images.map((image) => (
              /* eslint-disable-next-line @next/next/no-img-element -- see the
                 logo above. */
              <img
                key={image.id}
                src={image.url}
                alt={image.alternativeText ?? venue.name}
                className="h-32 w-auto rounded object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <VenueAmenities
        properties={venue.properties}
        title={t("sections.amenities")}
        yes={t("amenity.yes")}
        no={t("amenity.no")}
      />

      {venue.geo && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">{t("sections.location")}</h2>
          <VenueMap
            venue={{
              documentId: venue.documentId,
              name: venue.name,
              address: venue.address,
              city: cityName,
              latitude: venue.geo.latitude,
              longitude: venue.geo.longitude,
              type: venue.type,
            }}
            height="320px"
            className="mt-2"
            showDirections
            directionsLabel={t("directions")}
            loadingLabel={t("mapLoading")}
          />
        </section>
      )}
    </article>
  )
}

/**
 * The venue's amenity list. Values are rendered per the definition's `type`;
 * an entry whose definition failed to populate carries no label and is skipped
 * rather than rendered as a bare value.
 */
function VenueAmenities({
  properties,
  title,
  yes,
  no,
}: {
  properties: PublicVenue["properties"]
  title: string
  yes: string
  no: string
}) {
  const rendered = properties
    .map((property) => renderAmenity(property, yes, no))
    .filter(
      (entry): entry is { label: string; value: string } => entry !== null
    )

  if (rendered.length === 0) return null

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {/* The index is part of the key because a LABEL is not unique: two
            definitions in different categories can legitimately carry the same
            name, and a duplicate React key drops one of the two rows. */}
        {rendered.map((entry, index) => (
          <li key={`${entry.label}-${index}`}>
            {entry.label}: {entry.value}
          </li>
        ))}
      </ul>
    </section>
  )
}

function renderAmenity(
  property: VenuePropertyValue,
  yes: string,
  no: string
): { label: string; value: string } | null {
  const definition = property.definition
  const label = definition?.name ?? definition?.slug
  if (!label) return null

  switch (propertyControlType(definition?.type)) {
    case "boolean":
      return typeof property.booleanValue === "boolean"
        ? { label, value: property.booleanValue ? yes : no }
        : null
    case "integer":
      // Stringified, not `Intl`-formatted — see the capacity note above.
      return typeof property.integerValue === "number"
        ? { label, value: String(property.integerValue) }
        : null
    case "string":
      return property.stringValue
        ? { label, value: property.stringValue }
        : null
    case "enum":
      return property.enumValue ? { label, value: property.enumValue } : null
    default:
      return null
  }
}
