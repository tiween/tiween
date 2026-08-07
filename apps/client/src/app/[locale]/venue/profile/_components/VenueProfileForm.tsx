"use client"

import * as React from "react"
import { VenueLocationPicker } from "@/features/venues/components/VenueLocationPicker"
import {
  useMyVenue,
  useVenueProfileMutations,
  useVenuePropertyCatalog,
} from "@/features/venues/hooks/useVenueProfile"
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_TYPES_ATTR,
  extractVenueProfileErrorCode,
  isVenueProfileErrorCode,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  normalizeGeoPoint,
  propertyControlType,
  propertyEnumOptions,
  toVenueProfileFormValues,
  toVenueProfileUpdatePayload,
  VENUE_TYPES,
  venueProfileFormSchema,
} from "@/features/venues/schemas/venue-profile"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"

import type {
  ManagerVenue,
  PropertyCategoryEntry,
  PropertyDefinitionEntry,
  VenueProfileErrorCode,
  VenueProfileFormValues,
  VenuePropertyValue,
  VenuePropertyValueInput,
} from "@/features/venues/schemas/venue-profile"
import type { FieldError, Resolver } from "react-hook-form"

import { Link } from "@/lib/navigation"
import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { AppSelect } from "@/components/forms/AppSelect"
import { AppTextArea } from "@/components/forms/AppTextArea"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

const FORM_ID = "venueProfileForm"

/**
 * A single amenity value as the editor holds it. Everything is a STRING except
 * booleans, because that is what the rendered controls produce; the conversion
 * to the four typed wire slots happens once, in `buildProperties`.
 */
type AmenityValue = boolean | string

/**
 * Reject an attached file BEFORE uploading it. Same limits and same CODES as
 * the registration form — both import them from the schema module, so the
 * advertised limit and the enforced one cannot drift.
 */
function checkImage(
  file: File
): "IMAGE_TOO_LARGE" | "IMAGE_TYPE_INVALID" | null {
  if (file.size > MAX_IMAGE_BYTES) return "IMAGE_TOO_LARGE"
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "IMAGE_TYPE_INVALID"
  }
  return null
}

/** Seed the amenity editor from the venue's stored property values. */
function toAmenityState(venue: ManagerVenue): Record<string, AmenityValue> {
  const state: Record<string, AmenityValue> = {}

  for (const property of venue.properties) {
    const definitionId = property.definition?.documentId
    if (!definitionId) continue

    switch (propertyControlType(property.definition?.type)) {
      case "boolean":
        if (typeof property.booleanValue === "boolean") {
          state[definitionId] = property.booleanValue
        }
        break
      case "integer":
        if (typeof property.integerValue === "number") {
          state[definitionId] = String(property.integerValue)
        }
        break
      case "string":
        if (typeof property.stringValue === "string") {
          state[definitionId] = property.stringValue
        }
        break
      case "enum":
        if (typeof property.enumValue === "string") {
          state[definitionId] = property.enumValue
        }
        break
      default:
        break
    }
  }

  return state
}

/**
 * Re-express one STORED amenity as the wire entry that would rewrite it
 * unchanged. `null` when the entry carries no definition (or no value): there
 * is nothing to preserve, and the backend would reject a value-less component.
 */
function storedProperty(
  property: VenuePropertyValue
): VenuePropertyValueInput | null {
  const definition = property.definition?.documentId
  if (!definition) return null

  if (typeof property.booleanValue === "boolean") {
    return { definition, booleanValue: property.booleanValue }
  }
  if (typeof property.integerValue === "number") {
    return { definition, integerValue: property.integerValue }
  }
  if (typeof property.stringValue === "string" && property.stringValue !== "") {
    return { definition, stringValue: property.stringValue }
  }
  if (typeof property.enumValue === "string" && property.enumValue !== "") {
    return { definition, enumValue: property.enumValue }
  }
  return null
}

/**
 * Fold the amenity editor state into the wire `properties` array.
 *
 * Returns `null` when an integer amenity holds something that is not a
 * non-negative integer — the caller turns that into a
 * `PROPERTY_VALUE_TYPE_MISMATCH` toast rather than letting the backend reject
 * the whole save for a reason the manager cannot see.
 *
 * The array is a FULL REPLACEMENT (the backend overwrites the component list),
 * so the outgoing list is SEEDED from what is already stored and only then
 * overlaid with the edits. Deriving it from the catalog alone silently DELETED
 * every stored amenity the catalog could not reach — and it cannot reach all of
 * them: `property-definition.category` is nullable and the catalog route omits
 * categories with no definitions, so an uncategorized (or newly re-categorized)
 * definition is invisible here while its stored value is very much not.
 */
export function buildProperties(
  definitions: PropertyDefinitionEntry[],
  values: Record<string, AmenityValue>,
  stored: readonly VenuePropertyValue[] = []
): VenuePropertyValueInput[] | null {
  // Insertion-ordered: stored entries keep their position, edited ones are
  // replaced in place, and catalog-only additions land at the end.
  const entries = new Map<string, VenuePropertyValueInput>()

  for (const property of stored) {
    const entry = storedProperty(property)
    if (entry) entries.set(entry.definition, entry)
  }

  for (const definition of definitions) {
    const value = values[definition.documentId]
    if (value === undefined) continue
    // Blanking a text / enum amenity CLEARS it: drop the seeded entry rather
    // than rewriting the old value the manager just erased.
    if (value === "") {
      entries.delete(definition.documentId)
      continue
    }

    switch (propertyControlType(definition.type)) {
      case "boolean":
        if (typeof value !== "boolean") return null
        entries.set(definition.documentId, {
          definition: definition.documentId,
          booleanValue: value,
        })
        break
      case "integer": {
        if (typeof value !== "string" || !/^\d+$/.test(value)) return null
        entries.set(definition.documentId, {
          definition: definition.documentId,
          integerValue: Number(value),
        })
        break
      }
      case "string":
        if (typeof value !== "string") return null
        entries.set(definition.documentId, {
          definition: definition.documentId,
          stringValue: value,
        })
        break
      case "enum":
        if (typeof value !== "string") return null
        entries.set(definition.documentId, {
          definition: definition.documentId,
          enumValue: value,
        })
        break
      default:
        // A definition whose type the editor cannot render was never displayed,
        // so there is nothing to submit for it — but anything already stored
        // against it stays in the map, untouched.
        break
    }
  }

  return [...entries.values()]
}

/**
 * VenueProfileForm — the venue manager's single editing surface (Story 7.2).
 *
 * Reads `GET /venues/me` (the venue is derived from the JWT, never from a
 * request parameter) and writes a PARTIAL `PUT /venues/me` containing only the
 * fields that actually changed. `status`, `slug` and `manager` are not editable
 * here and are not even sent: `status` is rendered read-only, the other two are
 * stripped server-side regardless.
 *
 * This outer component owns the loading / empty / error states ONLY. The editor
 * below is mounted with the venue already in hand and keyed on its
 * `documentId`, so `useForm` receives real `defaultValues` on its very first
 * render. Seeding it later with `reset()` would NOT work: `AppSelect` hands
 * Radix a `defaultValue`, which is read once at mount — the venue `type` would
 * silently stay empty and every save would fail `VENUE_TYPE_INVALID`.
 */
export function VenueProfileForm() {
  const t = useTranslations("venues.profile")
  const locale = useLocale()

  const { data: venue, isLoading, isError, error } = useMyVenue()
  const { data: catalog = [] } = useVenuePropertyCatalog(locale, venue != null)

  const translateCode = (code: string) =>
    t(`errors.${isVenueProfileErrorCode(code) ? code : "INTERNAL_ERROR"}`)

  if (isLoading) {
    return <VenueProfileSkeleton />
  }

  // A manager with no venue and a caller the policy refused land in the same
  // place: there is nothing to edit and no action they can take here.
  if (isError || !venue) {
    const code = isError
      ? extractVenueProfileErrorCode(error)
      : "VENUE_NOT_FOUND"
    return (
      <Card className="m-auto w-full max-w-[720px]">
        <CardHeader>
          <CardTitle>{t("empty.title")}</CardTitle>
          <CardDescription>{translateCode(code)}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <VenueProfileEditor
      key={venue.documentId}
      venue={venue}
      catalog={catalog}
    />
  )
}

/**
 * The editing surface proper. Errors arrive as CODES and are translated through
 * `venues.profile.errors.<CODE>`; a raw code is never rendered.
 */
function VenueProfileEditor({
  venue,
  catalog,
}: {
  venue: ManagerVenue
  catalog: PropertyCategoryEntry[]
}) {
  const t = useTranslations("venues.profile")
  const { toast } = useToast()

  const { updateVenueMutation, uploadImageMutation } =
    useVenueProfileMutations()

  const [isSaving, setIsSaving] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)
  const [logo, setLogo] = React.useState<File | null>(null)
  const [images, setImages] = React.useState<File[]>([])
  /** The manager asked for the current logo / photos to be REMOVED. */
  const [logoRemoved, setLogoRemoved] = React.useState(false)
  const [imagesRemoved, setImagesRemoved] = React.useState(false)
  const [amenities, setAmenities] = React.useState<
    Record<string, AmenityValue>
  >(() => toAmenityState(venue))

  /**
   * The native file inputs, so a SUCCESSFUL save can clear their `value`.
   *
   * Resetting the React state alone is not enough: the input keeps displaying
   * the chosen filename, so the manager believes the file is still queued when
   * the next save will not send it at all.
   */
  const logoInputRef = React.useRef<HTMLInputElement | null>(null)
  const imagesInputRef = React.useRef<HTMLInputElement | null>(null)

  /**
   * File → uploaded Strapi id, for files that were uploaded but whose PUT then
   * FAILED (`VALIDATION_FAILED`, a 500, …).
   *
   * Uploads happen before the PUT, so a rejected save leaves them orphaned;
   * without this cache, pressing Save again would upload the very same files a
   * second time and orphan another copy. Keyed on the `File` object, so picking
   * a DIFFERENT file naturally misses the cache and really re-uploads.
   */
  const uploadedIdsRef = React.useRef(new Map<File, number>())

  /** Upload `file` once; a retry after a failed save reuses the same id. */
  const uploadOnce = React.useCallback(
    async (file: File): Promise<number> => {
      const cached = uploadedIdsRef.current.get(file)
      if (cached !== undefined) return cached
      const id = await uploadImageMutation.mutateAsync({ file })
      uploadedIdsRef.current.set(file, id)
      return id
    },
    [uploadImageMutation]
  )
  /**
   * Has the amenity editor been touched at all?
   *
   * `properties` is a REPLACEMENT on the wire, so it may only be sent when the
   * manager actually edited it. Sending the rebuilt list unconditionally would
   * (a) make every save non-empty, defeating the `NO_FIELDS_TO_UPDATE` guard,
   * and (b) silently DELETE every stored amenity on any save made before the
   * catalog finished loading.
   */
  const [amenitiesTouched, setAmenitiesTouched] = React.useState(false)

  const translateError = React.useCallback(
    (code: string) => {
      const known: VenueProfileErrorCode = isVenueProfileErrorCode(code)
        ? code
        : "INTERNAL_ERROR"
      return t(`errors.${known}`)
    },
    [t]
  )

  /**
   * The schema's issue messages are CODES and `FormMessage` renders
   * `error.message` verbatim, so translate at the resolver boundary — otherwise
   * the form would print `VENUE_NAME_REQUIRED` under the field.
   */
  const resolver = React.useMemo<Resolver<VenueProfileFormValues>>(() => {
    const base = zodResolver(venueProfileFormSchema)
    return async (values, context, options) => {
      const result = await base(values, context, options)
      if (!result.errors) return result

      const translated = Object.fromEntries(
        Object.entries(result.errors).map(([field, fieldError]) => [
          field,
          {
            ...(fieldError as FieldError),
            message: translateError(
              String((fieldError as FieldError | undefined)?.message ?? "")
            ),
          },
        ])
      )
      return { ...result, errors: translated }
    }
  }, [translateError])

  const form = useForm<VenueProfileFormValues>({
    resolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
    // Real values on the FIRST render — see the shell's docstring.
    defaultValues: toVenueProfileFormValues(venue),
  })

  const typeOptions = VENUE_TYPES.map((value) => ({
    value,
    label: t(`types.${value}`),
  }))

  const allDefinitions = React.useMemo(
    () => catalog.flatMap((category) => category.definitions),
    [catalog]
  )

  const geo = form.watch("geo")

  /**
   * "Your changes have been saved" describes the LAST save, so it must not
   * survive the next edit — otherwise it sits under the button reassuring the
   * manager about work they have since changed and not yet sent.
   */
  React.useEffect(() => {
    const subscription = form.watch((_values, info) => {
      // ONLY a real field edit. `handleSubmit` itself emits several value
      // events with no `type`, which would wipe the success state the same tick
      // it was set.
      if (info.type !== "change") return
      setIsSaved((current) => (current ? false : current))
    })
    return () => subscription.unsubscribe()
  }, [form])

  /** Any non-form edit (media, amenities) invalidates the success state too. */
  const noteEdited = React.useCallback(() => {
    setIsSaved((current) => (current ? false : current))
  }, [])

  async function onSubmit(values: VenueProfileFormValues) {
    // Media pre-flight, before anything is uploaded: an unacceptable file is
    // REJECTED and named, never silently skipped.
    const attached = [...(logo ? [logo] : []), ...images]
    for (const file of attached) {
      const problem = checkImage(file)
      if (problem) {
        toast({ variant: "destructive", description: translateError(problem) })
        return
      }
    }
    if (images.length > MAX_IMAGES) {
      toast({
        variant: "destructive",
        description: translateError("IMAGES_TOO_MANY"),
      })
      return
    }

    const properties = amenitiesTouched
      ? buildProperties(allDefinitions, amenities, venue.properties)
      : undefined
    if (properties === null) {
      toast({
        variant: "destructive",
        description: translateError("PROPERTY_VALUE_TYPE_MISMATCH"),
      })
      return
    }

    setIsSaving(true)
    setIsSaved(false)
    try {
      // `undefined` = leave as is; `null` / `[]` = remove. `uploadOnce` reuses
      // the id of anything already uploaded by a save that then failed.
      const logoId = logo
        ? await uploadOnce(logo)
        : logoRemoved
          ? null
          : undefined
      const imageIds =
        images.length > 0
          ? await Promise.all(images.map((file) => uploadOnce(file)))
          : imagesRemoved
            ? []
            : undefined

      const payload = toVenueProfileUpdatePayload(values, venue, {
        ...(logoId !== undefined ? { logo: logoId } : {}),
        ...(imageIds !== undefined ? { images: imageIds } : {}),
        ...(properties !== undefined ? { properties } : {}),
      })

      // The endpoint answers 400 NO_FIELDS_TO_UPDATE on an empty body; saying
      // so here costs the manager one fewer round trip.
      if (Object.keys(payload).length === 0) {
        toast({
          variant: "destructive",
          description: translateError("NO_FIELDS_TO_UPDATE"),
        })
        return
      }

      await updateVenueMutation.mutateAsync(payload)

      // SUCCESS only. The queued files are now linked to the venue, so both the
      // React state AND the native inputs are cleared — leaving the filenames on
      // screen would advertise a pending upload that no longer exists. On the
      // ERROR path everything is deliberately kept, ids included, so a retry
      // resends the same uploads instead of orphaning fresh copies.
      setLogo(null)
      setImages([])
      setLogoRemoved(false)
      setImagesRemoved(false)
      uploadedIdsRef.current.clear()
      if (logoInputRef.current) logoInputRef.current.value = ""
      if (imagesInputRef.current) imagesInputRef.current.value = ""
      // The saved values ARE the stored values now; re-sending the whole
      // replacement list on every later save would be redundant.
      setAmenitiesTouched(false)
      setIsSaved(true)
      toast({ description: t("success.saved") })
    } catch (err) {
      toast({
        variant: "destructive",
        description: translateError(extractVenueProfileErrorCode(err)),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="m-auto w-full max-w-[720px]">
      <CardHeader>
        <CardTitle>{t("header")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <p className="text-muted-foreground text-sm" data-testid="venue-status">
          {t("fields.status")}: {t(`status.${venue.status ?? "pending"}`)}
        </p>
        {/* Discoverability between the two manager surfaces (Story 7.3). */}
        <p className="text-sm">
          <Link className="text-primary underline" href="/venue/events">
            {t("eventsLink")}
          </Link>
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <AppForm form={form} onSubmit={onSubmit} id={FORM_ID}>
          <h3 className="text-base font-semibold">{t("sections.details")}</h3>

          <AppField name="name" type="text" required label={t("fields.name")} />
          <AppSelect
            name="type"
            required
            label={t("fields.type")}
            placeholder={t("placeholders.type")}
            options={typeOptions}
          />
          <AppTextArea name="description" label={t("fields.description")} />
          <AppField
            name="address"
            type="text"
            required
            label={t("fields.address")}
          />

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.contact")}
          </h3>

          <AppField name="phone" type="text" label={t("fields.phone")} />
          <AppField name="email" type="text" label={t("fields.email")} />
          <AppField
            name="website"
            type="text"
            label={t("fields.website")}
            placeholder={t("placeholders.website")}
          />
          {/*
            Kept as `type="text"` with a numeric inputMode on purpose: AppField
            coerces a `type="number"` value with `parseFloat`, which turns an
            emptied field into NaN. The schema validates the digits and
            `toVenueProfileUpdatePayload` does the conversion.
          */}
          <AppField
            name="capacity"
            type="text"
            inputMode="numeric"
            label={t("fields.capacity")}
          />

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.location")}
          </h3>

          <VenueLocationPicker
            value={geo}
            // Normalized HERE, where the picker writes into the form: Leaflet
            // keeps counting past the date line, and a longitude of 190 fails
            // the resolver on a field that has no input to render an error
            // under — Save would just look dead.
            onChange={(next) => {
              form.setValue("geo", normalizeGeoPoint(next), {
                shouldDirty: true,
              })
              // `setValue` does not emit a "change" event, so the success-state
              // subscription above never sees it.
              noteEdited()
            }}
            onClear={() => {
              form.setValue("geo", null, { shouldDirty: true })
              noteEdited()
            }}
            labels={{
              hint: t("location.hint"),
              loading: t("location.loading"),
              marker: t("location.marker"),
              empty: t("location.empty"),
              clear: t("location.clear"),
              coordinates: t("location.coordinates"),
            }}
          />

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.media")}
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="venue-logo">
              {t("fields.logo")}
            </label>
            {venue.logo && !logoRemoved && (
              /* eslint-disable-next-line @next/next/no-img-element -- the
                 upload's intrinsic dimensions are not known here (Strapi
                 reports 0 for some providers) and the preview is sized by
                 `h-16 w-auto`, which next/image cannot express without fixing a
                 width and changing the rendered layout. */
              <img
                src={venue.logo.url}
                alt={venue.logo.alternativeText ?? venue.name}
                className="h-16 w-auto object-contain"
              />
            )}
            <input
              id="venue-logo"
              name="logo"
              type="file"
              ref={logoInputRef}
              accept={ACCEPTED_IMAGE_TYPES_ATTR}
              className="block w-full text-sm"
              onChange={(event) => {
                setLogo(event.target.files?.[0] ?? null)
                // Picking a replacement supersedes a pending removal.
                setLogoRemoved(false)
                noteEdited()
              }}
            />
            {/* Replacing the logo was possible; REMOVING it was not, and this
                is the manager's only editing surface — a wrong logo would have
                stayed published forever. */}
            {venue.logo && !logoRemoved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoRemoved(true)
                  setLogo(null)
                  if (logoInputRef.current) logoInputRef.current.value = ""
                  noteEdited()
                }}
              >
                {t("buttons.removeLogo")}
              </Button>
            )}
            {logoRemoved && (
              <p className="text-muted-foreground text-xs">
                {t("hints.logoRemoved")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="venue-images">
              {t("fields.images")}
            </label>
            {venue.images.length > 0 && !imagesRemoved && (
              <div className="flex flex-wrap gap-2">
                {venue.images.map((image) => (
                  /* eslint-disable-next-line @next/next/no-img-element -- see
                     the logo preview above. */
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.alternativeText ?? venue.name}
                    className="h-16 w-auto rounded object-cover"
                  />
                ))}
              </div>
            )}
            <input
              id="venue-images"
              name="images"
              type="file"
              multiple
              ref={imagesInputRef}
              accept={ACCEPTED_IMAGE_TYPES_ATTR}
              className="block w-full text-sm"
              // Kept WHOLE, not sliced to MAX_IMAGES: submitting is where an
              // over-count is reported. Trimming here would drop the extra
              // photos without the manager ever being told.
              onChange={(event) => {
                setImages(Array.from(event.target.files ?? []))
                setImagesRemoved(false)
                noteEdited()
              }}
            />
            {/* The counterpart of the logo removal: `images: []` is accepted by
                the wire schema but nothing here ever emitted it, so an unwanted
                photo could only be replaced, never taken down. */}
            {venue.images.length > 0 && !imagesRemoved && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImagesRemoved(true)
                  setImages([])
                  if (imagesInputRef.current) imagesInputRef.current.value = ""
                  noteEdited()
                }}
              >
                {t("buttons.removePhotos")}
              </Button>
            )}
            {imagesRemoved && (
              <p className="text-muted-foreground text-xs">
                {t("hints.photosRemoved")}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {t("hints.images", { max: String(MAX_IMAGES) })}
            </p>
            <p className="text-muted-foreground text-xs">
              {t("hints.imagesReplace")}
            </p>
          </div>

          {catalog.length > 0 && (
            <>
              <h3 className="pt-2 text-base font-semibold">
                {t("sections.amenities")}
              </h3>
              {catalog.map((category) => (
                <fieldset key={category.documentId} className="space-y-3">
                  <legend className="text-sm font-medium">
                    {category.name ?? category.slug}
                  </legend>
                  {category.definitions.map((definition) => (
                    <AmenityControl
                      key={definition.documentId}
                      definition={definition}
                      value={amenities[definition.documentId]}
                      onChange={(next) => {
                        setAmenitiesTouched(true)
                        noteEdited()
                        setAmenities((current) => ({
                          ...current,
                          [definition.documentId]: next,
                        }))
                      }}
                      chooseLabel={t("placeholders.amenity")}
                    />
                  ))}
                </fieldset>
              ))}
            </>
          )}
        </AppForm>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-2">
        <Button
          type="submit"
          size="lg"
          variant="default"
          form={FORM_ID}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("buttons.saving")}
            </>
          ) : (
            t("buttons.save")
          )}
        </Button>
        {isSaved && !isSaving && (
          <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {t("success.saved")}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

/** One amenity, rendered with the control its definition's `type` implies. */
function AmenityControl({
  definition,
  value,
  onChange,
  chooseLabel,
}: {
  definition: PropertyDefinitionEntry
  value: AmenityValue | undefined
  onChange: (value: AmenityValue) => void
  chooseLabel: string
}) {
  const controlType = propertyControlType(definition.type)
  if (!controlType) return null

  const inputId = `amenity-${definition.documentId}`
  const label = definition.name ?? definition.slug ?? definition.documentId

  if (controlType === "boolean") {
    return (
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          name={inputId}
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <label className="text-sm" htmlFor={inputId}>
          {label}
        </label>
      </div>
    )
  }

  if (controlType === "enum") {
    const options = propertyEnumOptions(definition.enumOptions)
    return (
      <div className="space-y-1">
        <label className="text-sm" htmlFor={inputId}>
          {label}
        </label>
        {/* A native <select>, not the Radix one: the amenity editor lives
            outside react-hook-form (its values are a plain record) and the
            catalog is short, so the extra machinery would buy nothing. */}
        <select
          id={inputId}
          name={inputId}
          className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{chooseLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="text-sm" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        name={inputId}
        type="text"
        inputMode={controlType === "integer" ? "numeric" : undefined}
        className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

/** Loading skeleton — every async surface needs one. */
function VenueProfileSkeleton() {
  return (
    <div
      className="m-auto w-full max-w-[720px] animate-pulse space-y-6"
      data-testid="venue-profile-skeleton"
    >
      <div className="bg-muted h-6 w-40 rounded" />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="space-y-2">
          <div className="bg-muted h-4 w-24 rounded" />
          <div className="bg-muted h-10 w-full rounded" />
        </div>
      ))}
      <div className="bg-muted h-10 w-full rounded" />
    </div>
  )
}

VenueProfileForm.displayName = "VenueProfileForm"
