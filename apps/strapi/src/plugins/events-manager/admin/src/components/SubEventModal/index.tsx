/**
 * SubEventModal
 *
 * One modal for both sub-event kinds and both directions: create (from an empty
 * calendar slot) and edit (from a block on the grid). It replaces
 * `EventCreationModal` + `EventEditModal`, which both wrote to
 * the `showtime` collection — a content type story 2C.3 deleted.
 *
 * Shape: shared fields always render; the kind-specific block swaps on the
 * `kind` discriminator, exactly as `WorkForm` branches on `watch("type")`.
 *
 * Deliberately NOT here (see the spec's Never list): no ticketing fields
 * (`ticketTiers` / `ticketsAvailable` / `ticketsSold` — v1 is aggregation-only)
 * and no recurrence (the parent-occurrence link no longer exists).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Box,
  Button,
  DatePicker,
  Field,
  Flex,
  Grid,
  Loader,
  Modal,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  TimePicker,
  Typography,
} from "@strapi/design-system"
import { Trash } from "@strapi/icons"
import { useFetchClient } from "@strapi/strapi/admin"
import { useDebounce } from "use-debounce"

import type { SubEventKind } from "../../hooks/subEventPopulate"
import type { SubEvent } from "../../hooks/subEventTransform"
import type { CreativeWork, WorkType } from "../../hooks/useCreativeWorks"
import type {
  SubEventErrorCode,
  SubEventFormErrors,
  SubEventFormValues,
} from "./validate"

import {
  cmUrl,
  EVENT_UID,
  SUB_EVENT_UID,
  SUB_EVENT_WORK_FIELD,
} from "../../hooks/subEventPopulate"
import { useWorkSearch } from "../../hooks/useCreativeWorks"
import { usePlanningT } from "../../hooks/usePlanningT"
import { ConfirmDialog } from "../ConfirmDialog"
import {
  allowedWorkTypes,
  buildEventRequest,
  buildSubEventRequest,
  publishUrl,
  toStartDateTimeIso,
  toTimeInput,
  validateSubEventForm,
} from "./validate"

const VENUE_UID = "plugin::venues.venue"

/** Internal failure markers — never rendered, always mapped to a translation. */
const VENUE_UNRESOLVED = "VENUE_UNRESOLVED"
const EVENT_NOT_CREATED = "EVENT_NOT_CREATED"
const SUB_EVENT_NOT_CREATED = "SUB_EVENT_NOT_CREATED"

/** What a submit already wrote, so a publish retry does not duplicate it. */
interface WrittenRows {
  subEventDocumentId: string
  /** Create only — an update never mints a container event. */
  eventDocumentId?: string
}

const VIDEO_FORMATS = [
  "standard",
  "threeD",
  "imax",
  "fourDX",
  "format70mm",
] as const

interface SubEventModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called after a successful create / update / delete. */
  onSuccess: () => void
  /** Numeric venue id, as selected in the planning header. */
  venueId: string
  /** Create mode: the slot that was clicked. */
  prefilledDate?: Date | null
  /** Edit mode: the block that was clicked. */
  subEvent?: SubEvent | null
}

interface KindFields {
  audioLanguage: string
  subtitleLanguage: string
  surtitleLanguage: string
  videoFormat: string
}

const emptyKindFields: KindFields = {
  audioLanguage: "",
  subtitleLanguage: "",
  surtitleLanguage: "",
  videoFormat: "standard",
}

interface StrapiApiError {
  name?: string
  message?: string
  details?: unknown
}

/** The `error` object of a Strapi admin API response, when there is one. */
function readApiError(err: unknown): StrapiApiError | null {
  const data = (err as { response?: { data?: unknown } } | undefined)?.response
    ?.data as { error?: StrapiApiError; message?: string } | undefined

  if (data?.error) return data.error
  return data?.message ? { message: data.message } : null
}

/** Pull a usable message out of a Strapi admin API error. */
function readServerMessage(err: unknown): string | null {
  return readApiError(err)?.message ?? null
}

/** Every string found under `details`, wherever Strapi nested the field name. */
function collectDetailPaths(details: unknown, found: string[] = []): string[] {
  if (typeof details === "string") {
    found.push(details)
  } else if (Array.isArray(details)) {
    details.forEach((entry) => collectDetailPaths(entry, found))
  } else if (details && typeof details === "object") {
    Object.values(details as Record<string, unknown>).forEach((value) =>
      collectDetailPaths(value, found)
    )
  }
  return found
}

/**
 * Does this error belong on the work picker?
 *
 * Routed on a STRUCTURED signal — the error's `name` plus the field named in
 * `details` — never on a substring of the prose. A plain `message.includes()`
 * fires on any error that happens to contain "movie"/"play": "display", a
 * "replay" hint, or a title echoed back by the server would all land on the
 * wrong field.
 *
 * The lifecycle guard `assertSubEventWorkKind` throws a bare `ValidationError`
 * whose `details` is empty, so there is one narrow fallback: the message
 * ANCHORED at the field name it opens with. That is anchored + word-bounded,
 * so "display" cannot match, and it stops short of coupling to the guard's
 * wording — `sub-event-work-kind.unit.test.ts:84` pins only the
 * "must reference a creative-work of type" phrase, which this never reads.
 */
function isWorkFieldError(err: unknown, workField: string): boolean {
  const error = readApiError(err)
  if (!error || error.name !== "ValidationError") return false

  if (collectDetailPaths(error.details).includes(workField)) return true

  return new RegExp(`^${workField}\\b`).test((error.message ?? "").trim())
}

export function SubEventModal({
  isOpen,
  onClose,
  onSuccess,
  venueId,
  prefilledDate,
  subEvent,
}: SubEventModalProps) {
  const { get, post, put, del } = useFetchClient()
  const t = usePlanningT()

  const mode: "create" | "edit" = subEvent ? "edit" : "create"

  const [kind, setKind] = useState<SubEventKind>("screening")
  const [title, setTitle] = useState("")
  const [titleTouched, setTitleTouched] = useState(false)
  const [work, setWork] = useState<{
    documentId: string
    title: string
    type: string
  } | null>(null)
  const [date, setDate] = useState<Date | null>(null)
  const [time, setTime] = useState("20:00")
  const [price, setPrice] = useState("")
  const [kindFields, setKindFields] = useState<KindFields>(emptyKindFields)

  const [errors, setErrors] = useState<SubEventFormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm] = useDebounce(searchTerm, 300)

  // Survives a failed publish so the retry publishes the existing rows instead
  // of writing a second copy of the same showing.
  const writtenRef = useRef<WrittenRows | null>(null)

  // Seed the form whenever the modal opens (or the row behind it changes).
  useEffect(() => {
    if (!isOpen) return

    if (subEvent) {
      setKind(subEvent.kind)
      setTitle(subEvent.event?.title ?? "")
      setTitleTouched(true)
      setWork(
        subEvent.work
          ? {
              documentId: subEvent.work.documentId,
              title: subEvent.work.title,
              type: subEvent.work.type ?? "",
            }
          : null
      )
      setDate(subEvent.start)
      setTime(toTimeInput(subEvent.start))
      setPrice(subEvent.price === null ? "" : String(subEvent.price))
      setKindFields({
        audioLanguage: subEvent.audioLanguage ?? "",
        subtitleLanguage: subEvent.subtitleLanguage ?? "",
        surtitleLanguage: subEvent.surtitleLanguage ?? "",
        videoFormat: subEvent.videoFormat ?? "standard",
      })
    } else {
      setKind("screening")
      setTitle("")
      setTitleTouched(false)
      setWork(null)
      setDate(prefilledDate ?? null)
      setTime(toTimeInput(prefilledDate ?? null))
      setPrice("")
      setKindFields(emptyKindFields)
    }

    setErrors({})
    setServerError(null)
    setSearchTerm("")
    // A fresh open is a fresh submit — never inherit the previous row's ids.
    writtenRef.current = null
  }, [isOpen, subEvent, prefilledDate])

  const workTypes = useMemo(
    () => allowedWorkTypes(kind) as readonly WorkType[],
    [kind]
  )
  const {
    works,
    isLoading: isSearching,
    error: searchError,
  } = useWorkSearch(debouncedTerm, workTypes)

  const values: SubEventFormValues = {
    mode,
    kind,
    title,
    workDocumentId: work?.documentId ?? "",
    workType: work?.type ?? "",
    date,
    time,
    price,
  }

  const handleKindChange = useCallback((next: SubEventKind) => {
    setKind(next)
    // The work relation lives on a different field per kind and is constrained
    // to different `creative-work.type` values, so a selection cannot survive a
    // kind switch.
    setWork(null)
    setSearchTerm("")
    setErrors((prev) => ({ ...prev, work: undefined }))
  }, [])

  const handleWorkSelect = useCallback(
    (selected: CreativeWork) => {
      setWork({
        documentId: selected.documentId,
        title: selected.title,
        type: selected.type,
      })
      setErrors((prev) => ({ ...prev, work: undefined }))
      if (!titleTouched) setTitle(selected.title)
    },
    [titleTouched]
  )

  /**
   * The planning header selects venues by numeric id, but relations are written
   * by documentId in Strapi v5.
   *
   * Throws rather than falling back to the numeric id. Posting an internal id
   * where a documentId is expected does not fail loudly: the event is created
   * with no venue link, so the showing exists but belongs to nowhere and never
   * appears under the venue that scheduled it. A visible error beats a row that
   * silently detaches itself.
   */
  const resolveVenueDocumentId = useCallback(async (): Promise<string> => {
    const response = await get<{ results: { documentId: string }[] }>(
      cmUrl(VENUE_UID),
      {
        params: {
          page: 1,
          pageSize: 1,
          fields: ["documentId"],
          filters: { id: { $eq: venueId } },
        },
      }
    )

    const documentId = response.data?.results?.[0]?.documentId
    if (!documentId) throw new Error(VENUE_UNRESOLVED)

    return documentId
  }, [get, venueId])

  /**
   * Publish a row that was just written.
   *
   * All three types are `draftAndPublish`, so an unpublished row is invisible
   * to the public API while looking perfectly fine on this calendar, which
   * reads drafts. A publish failure therefore must NOT be swallowed — it is the
   * difference between "scheduled" and "scheduled but nobody can see it".
   */
  const publish = useCallback(
    async (uid: string, documentId: string) => {
      await post(publishUrl(uid, documentId))
    },
    [post]
  )

  const handleSubmit = useCallback(async () => {
    const nextErrors = validateSubEventForm(values)
    setErrors(nextErrors)
    setServerError(null)
    if (Object.keys(nextErrors).length > 0) return

    const startIso = toStartDateTimeIso(date, time)
    if (!startIso || !work) return

    // Target collection and work field are decided together, in one pure
    // function, so they cannot drift apart (see `buildSubEventRequest`).
    const payloadInput = {
      kind,
      startDateTime: startIso,
      workDocumentId: work.documentId,
      price,
      audioLanguage: kindFields.audioLanguage,
      subtitleLanguage: kindFields.subtitleLanguage,
      videoFormat: kindFields.videoFormat,
      surtitleLanguage: kindFields.surtitleLanguage,
    }

    const subEventUid = SUB_EVENT_UID[kind]

    setIsSubmitting(true)
    try {
      // A previous attempt wrote the rows and only the publish failed. Retrying
      // the write would mint a duplicate showing, so resume at the publish step.
      let written = writtenRef.current

      if (!written) {
        if (mode === "edit" && subEvent) {
          // Only the sub-event is written. The parent event may carry other
          // sub-events, so rewriting its `startDateTime` from one child would
          // be wrong — event-level scheduling stays in the content manager.
          const request = buildSubEventRequest(
            payloadInput,
            subEvent.documentId
          )
          await put(request.url, { data: request.data })
          written = { subEventDocumentId: subEvent.documentId }
        } else {
          // Ported from the old EventCreationModal: the container event is
          // created first, then the sub-event that hangs off it. The event POST
          // was and stays valid — `event` is the type that owns `venue`.
          const venueRef = await resolveVenueDocumentId()
          const eventRequest = buildEventRequest({
            kind,
            title,
            startDateTime: startIso,
            venueRef,
          })
          const eventResponse = await post<{
            data: { documentId?: string }
          }>(eventRequest.url, { data: eventRequest.data })

          const eventRef = eventResponse.data?.data?.documentId
          if (!eventRef) throw new Error(EVENT_NOT_CREATED)

          let subEventRef: string
          try {
            const request = buildSubEventRequest({
              ...payloadInput,
              eventRef,
            })
            const created = await post<{ data: { documentId?: string } }>(
              request.url,
              { data: request.data }
            )
            subEventRef = created.data?.data?.documentId ?? ""
            if (!subEventRef) throw new Error(SUB_EVENT_NOT_CREATED)
          } catch (subEventErr) {
            // Compensating rollback: the container event only exists to hold
            // this sub-event. Leaving it behind accumulates empty events —
            // one more on every retry — that the calendar cannot show and the
            // editor cannot find. Best effort; the ORIGINAL failure is what
            // gets reported.
            try {
              await del(`${cmUrl(EVENT_UID)}/${eventRef}`)
            } catch (rollbackErr) {
              console.error(
                "[planning] failed to roll back orphaned event",
                eventRef,
                rollbackErr
              )
            }
            throw subEventErr
          }

          written = {
            subEventDocumentId: subEventRef,
            eventDocumentId: eventRef,
          }
        }

        writtenRef.current = written
      }

      // Publish last: a draft row is invisible to the public API, so success is
      // not reportable until this lands (spec amendment, 2026-08-08).
      await publish(subEventUid, written.subEventDocumentId)
      if (written.eventDocumentId) {
        await publish(EVENT_UID, written.eventDocumentId)
      }

      writtenRef.current = null
      onSuccess()
    } catch (err) {
      const message = readServerMessage(err)

      if (isWorkFieldError(err, SUB_EVENT_WORK_FIELD[kind])) {
        // The lifecycle guard `assertSubEventWorkKind` rejected the work —
        // surface it on the picker rather than as an anonymous banner.
        setErrors((prev) => ({ ...prev, work: "work.kindMismatch" }))
      } else if ((err as Error)?.message === VENUE_UNRESOLVED) {
        setServerError(
          t(
            "venueUnresolved",
            "This venue could not be resolved — nothing was saved"
          )
        )
      } else if (writtenRef.current) {
        // The rows exist; only the publish failed. Say exactly that, because
        // the showing is saved but not yet visible to the public site.
        setServerError(
          t(
            "publishFailed",
            "Saved, but publishing failed — the showing is not public yet. Try again."
          )
        )
      } else {
        setServerError(
          message ?? t("saveFailed", "The showing could not be saved")
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [
    values,
    date,
    time,
    work,
    kind,
    kindFields,
    price,
    mode,
    subEvent,
    put,
    post,
    del,
    title,
    resolveVenueDocumentId,
    publish,
    onSuccess,
    t,
  ])

  const handleDelete = useCallback(async () => {
    if (!subEvent) return

    setIsDeleting(true)
    setServerError(null)
    try {
      await del(`${cmUrl(SUB_EVENT_UID[subEvent.kind])}/${subEvent.documentId}`)
      setIsDeleteOpen(false)
      onSuccess()
    } catch (err) {
      setIsDeleteOpen(false)
      setServerError(
        readServerMessage(err) ??
          t("deleteFailed", "The showing could not be deleted")
      )
    } finally {
      setIsDeleting(false)
    }
  }, [del, subEvent, onSuccess, t])

  /**
   * Translate a validation CODE into a field message.
   *
   * `validate.ts` is pure and cannot call a hook, so it returns codes; this is
   * the edge where they become language. Keeping the mapping exhaustive (rather
   * than interpolating the code) means a new code cannot silently render as
   * machine text on a user's screen.
   */
  const errorMessage = useCallback(
    (code: SubEventErrorCode | undefined): string | undefined => {
      if (!code) return undefined

      switch (code) {
        case "kind.required":
          return t("error.kind.required", "Showing type is required")
        case "title.required":
          return t("error.title.required", "Title is required")
        case "work.required":
          return kind === "screening"
            ? t("error.work.required.screening", "Select a film")
            : t("error.work.required.performance", "Select a play")
        case "work.kindMismatch":
          return kind === "screening"
            ? t(
                "error.work.kindMismatch.screening",
                "A screening must reference a feature film or a short film"
              )
            : t(
                "error.work.kindMismatch.performance",
                "A performance must reference a play"
              )
        case "date.required":
          return t("error.date.required", "Date is required")
        case "date.past":
          return t("error.date.past", "Cannot schedule a showing in the past")
        case "time.invalid":
          return t("error.time.invalid", "Invalid time (HH:MM)")
        case "price.invalid":
          return t("error.price.invalid", "Invalid price")
        default:
          return undefined
      }
    },
    [t, kind]
  )

  if (!isOpen) return null

  const workLabel =
    kind === "screening" ? t("work.film", "Film") : t("work.play", "Play")

  return (
    <>
      <Modal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Modal.Content style={{ maxWidth: 760, width: "90vw" }}>
          <Modal.Header>
            <Modal.Title>
              {mode === "edit"
                ? t("modal.editTitle", "Edit showing")
                : t("modal.createTitle", "New showing")}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Flex direction="column" gap={5}>
              {serverError && (
                <Box padding={3} background="danger100" hasRadius>
                  <Typography textColor="danger700">{serverError}</Typography>
                </Box>
              )}

              {/* Kind — the discriminator everything else branches on */}
              <Field.Root error={errorMessage(errors.kind)} required>
                <Field.Label>{t("kind.label", "Showing type")}</Field.Label>
                <SingleSelect
                  value={kind}
                  // A row cannot move between collections: an edit is scoped to
                  // the kind it was loaded from.
                  disabled={mode === "edit"}
                  onChange={(value: SubEventKind) => handleKindChange(value)}
                >
                  <SingleSelectOption value="screening">
                    {t("kind.screening", "Screening (film)")}
                  </SingleSelectOption>
                  <SingleSelectOption value="performance">
                    {t("kind.performance", "Performance (theatre)")}
                  </SingleSelectOption>
                </SingleSelect>
                <Field.Error />
              </Field.Root>

              {/* Work picker — constrained to the types this kind may reference */}
              <Field.Root error={errorMessage(errors.work)} required>
                <Field.Label>{workLabel}</Field.Label>
                {work ? (
                  <Flex
                    gap={2}
                    padding={3}
                    background="neutral100"
                    hasRadius
                    justifyContent="space-between"
                  >
                    <Typography fontWeight="bold">{work.title}</Typography>
                    <Button
                      variant="tertiary"
                      onClick={() => setWork(null)}
                      disabled={isSubmitting}
                    >
                      {t("work.change", "Change")}
                    </Button>
                  </Flex>
                ) : (
                  <Flex direction="column" gap={2} alignItems="stretch">
                    <TextInput
                      aria-label={t("work.search", "Search the catalogue")}
                      placeholder={t("work.search", "Search the catalogue")}
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setSearchTerm(e.target.value)
                      }
                    />
                    <Box
                      style={{ maxHeight: 180, overflowY: "auto" }}
                      background="neutral0"
                    >
                      {isSearching ? (
                        <Flex justifyContent="center" padding={3}>
                          <Loader small>{t("loading", "Loading…")}</Loader>
                        </Flex>
                      ) : searchError ? (
                        <Box padding={3}>
                          <Typography textColor="danger600">
                            {t("work.searchFailed", "Catalogue search failed")}
                          </Typography>
                        </Box>
                      ) : works.length === 0 ? (
                        <Box padding={3}>
                          <Typography textColor="neutral600">
                            {t(
                              "work.empty",
                              "No matching work in the catalogue"
                            )}
                          </Typography>
                        </Box>
                      ) : (
                        <Flex direction="column" gap={1} alignItems="stretch">
                          {works.map((candidate) => (
                            <Button
                              key={candidate.documentId}
                              variant="tertiary"
                              onClick={() => handleWorkSelect(candidate)}
                            >
                              {candidate.title}
                            </Button>
                          ))}
                        </Flex>
                      )}
                    </Box>
                  </Flex>
                )}
                <Field.Error />
              </Field.Root>

              {/* Event title — only meaningful while creating the container */}
              {mode === "create" && (
                <Field.Root error={errorMessage(errors.title)} required>
                  <Field.Label>{t("event.title", "Event title")}</Field.Label>
                  <TextInput
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setTitleTouched(true)
                      setTitle(e.target.value)
                    }}
                  />
                  <Field.Error />
                </Field.Root>
              )}

              {/* Shared scheduling fields */}
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root error={errorMessage(errors.date)} required>
                    <Field.Label>{t("date", "Date")}</Field.Label>
                    <DatePicker
                      value={date ?? undefined}
                      onChange={(next: Date) => setDate(next ?? null)}
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>
                <Grid.Item col={6} s={12}>
                  <Field.Root error={errorMessage(errors.time)} required>
                    <Field.Label>{t("time", "Time")}</Field.Label>
                    <TimePicker
                      value={time}
                      onChange={(next: string) => setTime(next)}
                      step={15}
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>
                      {t("audioLanguage", "Audio language")}
                    </Field.Label>
                    <TextInput
                      value={kindFields.audioLanguage}
                      placeholder="fr"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setKindFields((prev) => ({
                          ...prev,
                          audioLanguage: e.target.value,
                        }))
                      }
                    />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root error={errorMessage(errors.price)}>
                    {/* Informational only — no ticketing surface in v1. */}
                    <Field.Label>{t("price", "Price")}</Field.Label>
                    <TextInput
                      type="number"
                      value={price}
                      placeholder="0"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPrice(e.target.value)
                      }
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                {/* Kind-specific block */}
                {kind === "screening" ? (
                  <>
                    <Grid.Item col={6} s={12}>
                      <Field.Root>
                        <Field.Label>
                          {t("videoFormat", "Projection format")}
                        </Field.Label>
                        <SingleSelect
                          value={kindFields.videoFormat}
                          onChange={(value: string) =>
                            setKindFields((prev) => ({
                              ...prev,
                              videoFormat: value,
                            }))
                          }
                        >
                          {VIDEO_FORMATS.map((format) => (
                            <SingleSelectOption key={format} value={format}>
                              {t(`videoFormat.${format}`, format)}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} s={12}>
                      <Field.Root>
                        <Field.Label>
                          {t("subtitleLanguage", "Subtitle language")}
                        </Field.Label>
                        <TextInput
                          value={kindFields.subtitleLanguage}
                          placeholder="ar"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setKindFields((prev) => ({
                              ...prev,
                              subtitleLanguage: e.target.value,
                            }))
                          }
                        />
                      </Field.Root>
                    </Grid.Item>
                  </>
                ) : (
                  <Grid.Item col={6} s={12}>
                    <Field.Root>
                      {/* surtitle, not subtitle — the theatre field is spelled
                          differently on purpose. */}
                      <Field.Label>
                        {t("surtitleLanguage", "Surtitle language")}
                      </Field.Label>
                      <TextInput
                        value={kindFields.surtitleLanguage}
                        placeholder="fr"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setKindFields((prev) => ({
                            ...prev,
                            surtitleLanguage: e.target.value,
                          }))
                        }
                      />
                    </Field.Root>
                  </Grid.Item>
                )}
              </Grid.Root>

              {mode === "edit" && (
                <Box padding={3} background="danger100" hasRadius>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Typography variant="sigma" textColor="danger700">
                      {t("dangerZone", "Danger zone")}
                    </Typography>
                    <Button
                      variant="danger-light"
                      startIcon={<Trash />}
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      {t("delete", "Delete this showing")}
                    </Button>
                  </Flex>
                </Box>
              )}
            </Flex>
          </Modal.Body>

          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">{t("cancel", "Cancel")}</Button>
            </Modal.Close>
            <Button onClick={handleSubmit} loading={isSubmitting}>
              {mode === "edit" ? t("save", "Save") : t("create", "Create")}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("deleteTitle", "Delete showing")}
        message={t(
          "deleteMessage",
          "This showing will be deleted. This action cannot be undone."
        )}
        confirmLabel={t("delete.confirm", "Delete")}
        isLoading={isDeleting}
      />
    </>
  )
}
