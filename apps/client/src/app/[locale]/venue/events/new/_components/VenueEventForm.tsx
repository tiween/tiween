"use client"

import * as React from "react"
import {
  useCreativeWorkSearch,
  useVenueEventMutations,
  WORK_SEARCH_MIN_CHARS,
} from "@/features/venues/hooks/useVenueEvents"
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_TYPES_ATTR,
  CREATIVE_WORK_TYPES,
  emptyShowtimeRow,
  emptyVenueEventFormValues,
  emptyVenueWorkFormValues,
  extractVenueEventErrorCode,
  isVenueEventErrorCode,
  MAX_EVENT_IMAGES,
  MAX_IMAGE_BYTES,
  SHOWTIME_VIDEO_FORMATS,
  showtimeKindOf,
  toVenueEventCreatePayload,
  toVenueWorkCreatePayload,
  venueEventFormSchema,
  venueWorkFormSchema,
} from "@/features/venues/schemas/venue-events"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useFieldArray, useForm } from "react-hook-form"

import type {
  CreativeWorkSearchEntry,
  CreativeWorkType,
  VenueEventErrorCode,
  VenueEventFormValues,
  VenueWorkFormValues,
} from "@/features/venues/schemas/venue-events"
import type { FieldError, FieldErrors, Resolver } from "react-hook-form"

import { useRouter } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { AppCheckbox } from "@/components/forms/AppCheckbox"
import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { AppSelect } from "@/components/forms/AppSelect"
import { AppTextArea } from "@/components/forms/AppTextArea"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"

const FORM_ID = "venueEventForm"
const WORK_FORM_ID = "venueWorkForm"

/** The work the event schedules, as the form holds it. */
export interface SelectedWork {
  documentId: string
  title: string
  type: CreativeWorkType
  releaseYear?: number
}

/** Reject an attached file BEFORE uploading it (same codes as 7.2). */
function checkImage(
  file: File
): "IMAGE_TOO_LARGE" | "IMAGE_TYPE_INVALID" | null {
  if (file.size > MAX_IMAGE_BYTES) return "IMAGE_TOO_LARGE"
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "IMAGE_TYPE_INVALID"
  }
  return null
}

function narrowWorkType(type: unknown): CreativeWorkType | null {
  return type === "film" || type === "play" || type === "short-film"
    ? type
    : null
}

/**
 * VenueEventForm — the single event-creation surface (Story 7.3).
 *
 * Pick (or create) a creative work, set title / description / run dates, add
 * ≥1 showtime (screening fields for films, performance fields for plays), an
 * optional featured flag and images, then save. Saving creates a DRAFT at the
 * caller's OWN venue (derived server-side from the JWT) and lands on its
 * preview page. NO ticketing fields anywhere — the plugin is dormant in v1.
 */
export function VenueEventForm() {
  const t = useTranslations("venues.events")
  const { toast } = useToast()
  const router = useRouter()

  const { createEventMutation, createWorkMutation, uploadImageMutation } =
    useVenueEventMutations()

  const [selectedWork, setSelectedWork] = React.useState<SelectedWork | null>(
    null
  )
  const [isSaving, setIsSaving] = React.useState(false)
  const [images, setImages] = React.useState<File[]>([])
  const imagesInputRef = React.useRef<HTMLInputElement | null>(null)
  /** File → uploaded id cache: a retry after a failed save re-uses the id. */
  const uploadedIdsRef = React.useRef(new Map<File, number>())

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

  const translateError = React.useCallback(
    (code: string) => {
      const known: VenueEventErrorCode = isVenueEventErrorCode(code)
        ? code
        : "INTERNAL_ERROR"
      return t(`errors.${known}`)
    },
    [t]
  )

  /** Translate the schema's CODE messages at the resolver boundary (7.2). */
  const resolver = React.useMemo<Resolver<VenueEventFormValues>>(() => {
    const base = zodResolver(venueEventFormSchema)
    const translateDeep = (errors: FieldErrors): FieldErrors => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(errors)) {
        if (!value) continue
        if (typeof (value as FieldError).message === "string") {
          out[key] = {
            ...(value as FieldError),
            message: translateError(String((value as FieldError).message)),
          }
        } else if (Array.isArray(value)) {
          out[key] = value.map((entry) =>
            entry ? translateDeep(entry as FieldErrors) : entry
          )
        } else {
          out[key] = translateDeep(value as FieldErrors)
        }
      }
      return out as FieldErrors
    }
    return async (values, context, options) => {
      const result = await base(values, context, options)
      if (!result.errors || Object.keys(result.errors).length === 0) {
        return result
      }
      return { ...result, errors: translateDeep(result.errors) }
    }
  }, [translateError])

  const form = useForm<VenueEventFormValues>({
    resolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: emptyVenueEventFormValues(),
  })

  const showtimes = useFieldArray({ control: form.control, name: "showtimes" })

  const kind = selectedWork ? showtimeKindOf(selectedWork.type) : null

  const handleWorkSelected = React.useCallback(
    (work: SelectedWork) => {
      setSelectedWork((previous) => {
        // Prefill the event title from the work — but never stomp a title the
        // manager already typed themselves.
        const currentTitle = form.getValues("title")
        if (currentTitle === "" || currentTitle === previous?.title) {
          form.setValue("title", work.title, { shouldDirty: true })
        }
        return work
      })
    },
    [form]
  )

  async function onSubmit(values: VenueEventFormValues) {
    if (!selectedWork) {
      toast({
        variant: "destructive",
        description: translateError("CREATIVE_WORK_REQUIRED"),
      })
      return
    }

    // Media pre-flight, before anything is uploaded.
    for (const file of images) {
      const problem = checkImage(file)
      if (problem) {
        toast({ variant: "destructive", description: translateError(problem) })
        return
      }
    }
    if (images.length > MAX_EVENT_IMAGES) {
      toast({
        variant: "destructive",
        description: translateError("IMAGES_TOO_MANY"),
      })
      return
    }

    setIsSaving(true)
    try {
      const imageIds =
        images.length > 0
          ? await Promise.all(images.map((file) => uploadOnce(file)))
          : undefined

      const payload = toVenueEventCreatePayload(values, selectedWork, {
        ...(imageIds !== undefined ? { imageIds } : {}),
      })

      const created = await createEventMutation.mutateAsync(payload)

      uploadedIdsRef.current.clear()
      toast({ description: t("success.created") })
      if (created?.documentId) {
        router.push(`/venue/events/${created.documentId}`)
      } else {
        router.push("/venue/events")
      }
    } catch (err) {
      toast({
        variant: "destructive",
        description: translateError(extractVenueEventErrorCode(err)),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatOptions = SHOWTIME_VIDEO_FORMATS.map((value) => ({
    value,
    label: t(`formats.${value}`),
  }))

  return (
    <Card className="m-auto w-full max-w-[720px]">
      <CardHeader>
        <CardTitle>{t("form.header")}</CardTitle>
        <CardDescription>{t("form.description")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-base font-semibold">{t("sections.work")}</h3>
          <CreativeWorkPicker
            selected={selectedWork}
            onSelect={handleWorkSelected}
            onCreate={async (values, posterId) => {
              const created = await createWorkMutation.mutateAsync(
                toVenueWorkCreatePayload(values, {
                  ...(posterId !== undefined ? { posterId } : {}),
                })
              )
              const type = narrowWorkType(created?.type ?? values.type)
              if (created?.documentId && type) {
                handleWorkSelected({
                  documentId: created.documentId,
                  title: created.title ?? values.title,
                  type,
                  releaseYear: created.releaseYear,
                })
              }
            }}
            uploadPoster={uploadOnce}
            translateError={translateError}
          />
          {selectedWork && (
            <p
              className="text-muted-foreground text-sm"
              data-testid="selected-work"
            >
              {t("picker.selected")}: {selectedWork.title} (
              {t(`workTypes.${selectedWork.type}`)}
              {selectedWork.releaseYear ? `, ${selectedWork.releaseYear}` : ""})
            </p>
          )}
        </section>

        <AppForm form={form} onSubmit={onSubmit} id={FORM_ID}>
          <h3 className="text-base font-semibold">{t("sections.details")}</h3>

          <AppField
            name="title"
            type="text"
            required
            label={t("fields.title")}
          />
          <AppTextArea name="description" label={t("fields.description")} />

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.dates")}
          </h3>

          <AppField
            name="startDate"
            type="date"
            required
            label={t("fields.startDate")}
          />
          <AppField name="endDate" type="date" label={t("fields.endDate")} />

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.showtimes")}
          </h3>
          <p className="text-muted-foreground text-sm">
            {kind === "performance"
              ? t("hints.showtimesPerformance")
              : t("hints.showtimesScreening")}
          </p>

          {showtimes.fields.map((field, index) => (
            <fieldset
              key={field.id}
              className="space-y-3 rounded-md border p-3"
              data-testid={`showtime-row-${index}`}
            >
              <legend className="text-sm font-medium">
                {t("fields.showtime")} {index + 1}
              </legend>
              <AppField
                name={`showtimes.${index}.date`}
                type="date"
                required
                label={t("fields.showtimeDate")}
              />
              <AppField
                name={`showtimes.${index}.time`}
                type="time"
                required
                label={t("fields.showtimeTime")}
              />
              {/* The format select only exists for film/short-film — a play's
                  performance has no videoFormat on its schema. */}
              {kind !== "performance" && (
                <AppSelect
                  name={`showtimes.${index}.videoFormat`}
                  label={t("fields.videoFormat")}
                  placeholder={t("placeholders.videoFormat")}
                  options={formatOptions}
                />
              )}
              <AppField
                name={`showtimes.${index}.audioLanguage`}
                type="text"
                label={t("fields.audioLanguage")}
              />
              {kind !== "performance" ? (
                <AppField
                  name={`showtimes.${index}.subtitleLanguage`}
                  type="text"
                  label={t("fields.subtitleLanguage")}
                />
              ) : (
                <AppField
                  name={`showtimes.${index}.surtitleLanguage`}
                  type="text"
                  label={t("fields.surtitleLanguage")}
                />
              )}
              {showtimes.fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => showtimes.remove(index)}
                >
                  <Trash2 className="me-2 h-4 w-4" aria-hidden="true" />
                  {t("buttons.removeShowtime")}
                </Button>
              )}
            </fieldset>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => showtimes.append(emptyShowtimeRow())}
          >
            <Plus className="me-2 h-4 w-4" aria-hidden="true" />
            {t("buttons.addShowtime")}
          </Button>

          <h3 className="pt-2 text-base font-semibold">
            {t("sections.extras")}
          </h3>

          <AppCheckbox name="featured" label={t("fields.featured")} />

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="event-images">
              {t("fields.images")}
            </label>
            <input
              id="event-images"
              name="images"
              type="file"
              multiple
              ref={imagesInputRef}
              accept={ACCEPTED_IMAGE_TYPES_ATTR}
              className="block w-full text-sm"
              onChange={(event) =>
                setImages(Array.from(event.target.files ?? []))
              }
            />
            <p className="text-muted-foreground text-xs">
              {t("hints.images", { max: String(MAX_EVENT_IMAGES) })}
            </p>
          </div>

          <Button type="submit" size="lg" disabled={isSaving} form={FORM_ID}>
            {isSaving ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("buttons.saving")}
              </>
            ) : (
              t("buttons.save")
            )}
          </Button>
          <p className="text-muted-foreground text-xs">{t("hints.draft")}</p>
        </AppForm>
      </CardContent>
    </Card>
  )
}

/**
 * CreativeWorkPicker — cmdk-in-popover combobox over the debounced catalog
 * search (the `EventVenueFilter` pattern), plus a "create new" Dialog with the
 * minimal work fields and an optional poster upload.
 */
function CreativeWorkPicker({
  selected,
  onSelect,
  onCreate,
  uploadPoster,
  translateError,
}: {
  selected: SelectedWork | null
  onSelect: (work: SelectedWork) => void
  onCreate: (values: VenueWorkFormValues, posterId?: number) => Promise<void>
  uploadPoster: (file: File) => Promise<number>
  translateError: (code: string) => string
}) {
  const t = useTranslations("venues.events")

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const listId = React.useId()

  const { data: results = [], isFetching } = useCreativeWorkSearch(query)

  const handleSelect = (entry: CreativeWorkSearchEntry) => {
    const type = narrowWorkType(entry.type)
    if (!type) return
    onSelect({
      documentId: entry.documentId,
      title: entry.title ?? "",
      type,
      releaseYear: entry.releaseYear,
    })
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t("picker.label")}
            className="border-border bg-background hover:bg-accent inline-flex min-h-11 min-w-[240px] items-center gap-2 rounded-md border px-4 text-sm"
          >
            <span className="truncate">
              {selected ? selected.title : t("picker.placeholder")}
            </span>
            <ChevronsUpDown
              className="ms-auto size-4 shrink-0 opacity-50"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent id={listId} className="w-[320px] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t("picker.search")}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {query.trim().length < WORK_SEARCH_MIN_CHARS
                  ? t("picker.typeToSearch")
                  : isFetching
                    ? t("picker.searching")
                    : t("picker.noResult")}
              </CommandEmpty>
              <CommandGroup>
                {results.map((entry) => (
                  <CommandItem
                    key={entry.documentId}
                    value={entry.documentId}
                    onSelect={() => handleSelect(entry)}
                    className="min-h-11"
                  >
                    <Check
                      className={cn(
                        "size-4",
                        selected?.documentId === entry.documentId
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <span>{entry.title}</span>
                    <span className="text-muted-foreground ms-1 text-xs">
                      {entry.type ? t(`workTypes.${entry.type}` as never) : ""}
                      {entry.releaseYear ? ` · ${entry.releaseYear}` : ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateWorkDialog
        onCreate={onCreate}
        uploadPoster={uploadPoster}
        translateError={translateError}
      />
    </div>
  )
}

/** "Create a new work" dialog — the no-match escape hatch of the AC. */
function CreateWorkDialog({
  onCreate,
  uploadPoster,
  translateError,
}: {
  onCreate: (values: VenueWorkFormValues, posterId?: number) => Promise<void>
  uploadPoster: (file: File) => Promise<number>
  translateError: (code: string) => string
}) {
  const t = useTranslations("venues.events")
  const { toast } = useToast()

  const [open, setOpen] = React.useState(false)
  const [poster, setPoster] = React.useState<File | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  const resolver = React.useMemo<Resolver<VenueWorkFormValues>>(() => {
    const base = zodResolver(venueWorkFormSchema)
    return async (values, context, options) => {
      const result = await base(values, context, options)
      if (!result.errors || Object.keys(result.errors).length === 0) {
        return result
      }
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

  const form = useForm<VenueWorkFormValues>({
    resolver,
    mode: "onBlur",
    defaultValues: emptyVenueWorkFormValues(),
  })

  const typeOptions = CREATIVE_WORK_TYPES.map((value) => ({
    value,
    label: t(`workTypes.${value}`),
  }))

  async function onSubmit(values: VenueWorkFormValues) {
    if (poster) {
      const problem = checkImage(poster)
      if (problem) {
        toast({ variant: "destructive", description: translateError(problem) })
        return
      }
    }

    setIsCreating(true)
    try {
      const posterId = poster ? await uploadPoster(poster) : undefined
      await onCreate(values, posterId)
      toast({ description: t("success.workCreated") })
      form.reset(emptyVenueWorkFormValues())
      setPoster(null)
      setOpen(false)
    } catch (err) {
      toast({
        variant: "destructive",
        description: translateError(extractVenueEventErrorCode(err)),
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Plus className="me-2 h-4 w-4" aria-hidden="true" />
          {t("buttons.createWork")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("workDialog.title")}</DialogTitle>
        </DialogHeader>
        <AppForm form={form} onSubmit={onSubmit} id={WORK_FORM_ID}>
          <AppField
            name="title"
            type="text"
            required
            label={t("fields.workTitle")}
          />
          <AppSelect
            name="type"
            required
            label={t("fields.workType")}
            placeholder={t("placeholders.workType")}
            options={typeOptions}
          />
          <AppTextArea name="synopsis" label={t("fields.synopsis")} />
          <AppField
            name="duration"
            type="text"
            inputMode="numeric"
            label={t("fields.duration")}
          />
          <AppField
            name="releaseYear"
            type="text"
            inputMode="numeric"
            label={t("fields.releaseYear")}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="work-poster">
              {t("fields.poster")}
            </label>
            <input
              id="work-poster"
              name="poster"
              type="file"
              accept={ACCEPTED_IMAGE_TYPES_ATTR}
              className="block w-full text-sm"
              onChange={(event) => setPoster(event.target.files?.[0] ?? null)}
            />
          </div>
          <Button type="submit" disabled={isCreating} form={WORK_FORM_ID}>
            {isCreating ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("buttons.creatingWork")}
              </>
            ) : (
              t("buttons.confirmCreateWork")
            )}
          </Button>
        </AppForm>
      </DialogContent>
    </Dialog>
  )
}

VenueEventForm.displayName = "VenueEventForm"
