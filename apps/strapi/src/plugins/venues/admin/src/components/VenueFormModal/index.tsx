/**
 * VenueFormModal — the venue create/edit form (Story 2D.2, AC 3/4/6/9/10).
 *
 * RELOCATED from `events-manager/admin/src/components/VenueFormModal` and
 * adapted; no duplicate remains there (2D's sequencing rule: the venue form
 * lives in the venues plugin, once). What changed in the move:
 *
 * - It talks to the venues-plugin ADMIN API (`hooks/useVenuesAdmin`), not to
 *   the content-manager REST API, so Zod validation, error CODES and tenant
 *   scoping all apply.
 * - Every label/hint/error is TRANSLATED (`getTranslation`), not a hardcoded
 *   French literal.
 * - `status` is read-only without the `manage-all` capability (AC 7); the
 *   server strips it anyway, this is the visible half of the same rule.
 * - Coordinates come from {@link MapPicker} — an address + "Localiser" + a
 *   draggable pin. The original's raw decimal lat/lng inputs are GONE (AC 4).
 * - `capacity` uses `NumberInput` with `onValueChange` (DS v2 API), not a
 *   `TextInput type="number"`.
 * - Sections: Informations générales / Localisation / Contact / Médias /
 *   Propriétés. The last two are STUBS by design — media upload waits on the
 *   `MediaInput` port and property values are story 2D.4 — and say so on screen
 *   rather than rendering a control that silently does nothing.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  Modal,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  Textarea,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { useNotification } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"

import type {
  Venue,
  VenueInput,
  VenueStatus,
  VenueType,
} from "../../hooks/useVenuesAdmin"
import type { GeoPoint } from "../MapPicker/geocode"

import { MAX_CITIES, useCities } from "../../hooks/useCities"
import { managerLabel, useVenueManagers } from "../../hooks/useVenueManagers"
import { useVenueMutations } from "../../hooks/useVenuesAdmin"
import { errorTranslationKey } from "../../utils/errors"
import { formatNumber } from "../../utils/format"
import { getTranslation } from "../../utils/getTranslation"
import {
  statusLabelKey,
  typeLabelKey,
  VENUE_STATUSES,
  VENUE_TYPES,
} from "../../utils/venueOptions"
import { MapPicker } from "../MapPicker"
import { generateSlug, validateVenueForm } from "./validate"

interface VenueFormModalProps {
  /** The venue to edit; `null` = create mode. */
  venue: Venue | null
  isOpen: boolean
  onClose: () => void
  /** Called after a successful save — the list refetches, it never patches. */
  onSuccess: (mode: "create" | "edit") => void
  /** `plugin::venues.manage-all`: unlocks the status field. */
  canManageAll: boolean
}

interface FormState {
  name: string
  slug: string
  description: string
  type: VenueType | ""
  status: VenueStatus
  address: string
  cityRef: string
  geo: GeoPoint | null
  phone: string
  email: string
  website: string
  capacity: string
  /** users-permissions user id, as a string for the select; "" = unassigned. */
  manager: string
}

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  type: "",
  status: "pending",
  address: "",
  cityRef: "",
  geo: null,
  phone: "",
  email: "",
  website: "",
  capacity: "",
  manager: "",
}

/** Map a venue row onto the form state. */
function toFormState(venue: Venue): FormState {
  return {
    name: venue.name ?? "",
    slug: venue.slug ?? "",
    description: venue.description ?? "",
    type: venue.type ?? "",
    status: venue.status ?? "pending",
    address: venue.address ?? "",
    cityRef: venue.cityRef?.documentId ?? "",
    geo: venue.geo ?? null,
    phone: venue.phone ?? "",
    email: venue.email ?? "",
    website: venue.website ?? "",
    capacity:
      venue.capacity === null || venue.capacity === undefined
        ? ""
        : String(venue.capacity),
    manager: venue.manager?.id ? String(venue.manager.id) : "",
  }
}

export function VenueFormModal({
  venue,
  isOpen,
  onClose,
  onSuccess,
  canManageAll,
}: VenueFormModalProps) {
  const { formatMessage, messages } = useIntl()
  const { toggleNotification } = useNotification()
  const {
    cities,
    truncated: citiesTruncated,
    isLoading: citiesLoading,
  } = useCities()
  // Only a manage-all caller may write `manager`, so only that caller pays for
  // the read.
  const { managers, isLoading: managersLoading } =
    useVenueManagers(canManageAll)
  const { createVenue, updateVenue, isLoading: isSaving } = useVenueMutations()

  const t = useCallback(
    (id: string, values?: Record<string, string>) =>
      formatMessage({ id: getTranslation(id) }, values),
    [formatMessage]
  )

  /** Translate an error CODE; an unknown code degrades to the generic message. */
  const tError = useCallback(
    (code: string | undefined) =>
      code
        ? formatMessage({
            id: getTranslation(
              errorTranslationKey(code, messages as Record<string, unknown>)
            ),
          })
        : undefined,
    [formatMessage, messages]
  )

  const isEdit = Boolean(venue)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  /**
   * Auto-slug runs UNTIL the editor touches the slug. On an existing venue it
   * is considered touched from the start: silently rewriting a live slug
   * because someone fixed a typo in the name would break every URL pointing at
   * that venue.
   */
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setForm(venue ? toFormState(venue) : EMPTY_FORM)
    setSlugTouched(Boolean(venue))
    setErrors({})
  }, [venue, isOpen])

  const setField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => {
        if (!prev[field as string]) return prev
        const next = { ...prev }
        delete next[field as string]
        return next
      })
    },
    []
  )

  const handleNameChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...prev,
        name: value,
        slug: slugTouched ? prev.slug : generateSlug(value),
      }))
      setErrors((prev) => {
        if (!prev.name) return prev
        const next = { ...prev }
        delete next.name
        return next
      })
    },
    [slugTouched]
  )

  const cityOptions = useMemo(
    () => cities.map((city) => ({ value: city.documentId, label: city.name })),
    [cities]
  )

  const buildPayload = useCallback((): VenueInput => {
    // `null` (not `undefined`) for a cleared optional: `undefined` is dropped by
    // JSON serialization, so the key would be absent and the server would read
    // the save as "field untouched" — an editor clearing a bad legacy value
    // would be told it saved while the old one survived.
    return {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      cityRef: form.cityRef || null,
      geo: form.geo,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      type: (form.type || undefined) as VenueType | undefined,
      // `status` and `manager` are privileged: the server REFUSES them from a
      // scoped caller (it does not silently drop them), so they must not be in
      // the payload at all unless this caller may write them.
      ...(canManageAll
        ? {
            status: form.status,
            manager: form.manager ? Number(form.manager) : null,
          }
        : {}),
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
    }
  }, [canManageAll, form])

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault()

      // The footer button's `loading` state covers the click path, but Enter
      // submits the form independently — without this, two fast confirmations
      // create two venues.
      if (isSaving) return

      const clientErrors = validateVenueForm({
        name: form.name,
        slug: form.slug,
        type: form.type,
        email: form.email,
        website: form.website,
        capacity: form.capacity,
      })
      if (Object.keys(clientErrors).length > 0) {
        setErrors(clientErrors as Record<string, string>)
        return
      }

      const payload = buildPayload()
      const result =
        isEdit && venue
          ? await updateVenue(venue.documentId, payload)
          : await createVenue(payload)

      if (result.ok) {
        toggleNotification({
          type: "success",
          message: t(isEdit ? "toast.updated" : "toast.created"),
        })
        onSuccess(isEdit ? "edit" : "create")
        return
      }

      // Per-field CODES land on their fields; the envelope code becomes a toast
      // so a failure with no field attached is never silent.
      setErrors(result.error.fieldErrors)
      toggleNotification({
        type: "danger",
        message: tError(result.error.code) ?? "",
      })
    },
    [
      buildPayload,
      createVenue,
      form,
      isEdit,
      isSaving,
      onSuccess,
      t,
      tError,
      toggleNotification,
      updateVenue,
      venue,
    ]
  )

  return (
    <Modal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {isEdit
              ? t("form.edit.title", { name: venue?.name ?? "" })
              : t("form.create.title")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {/*
            A real <form> so Enter submits and the browser's own validation
            semantics apply; the DS binding sheet asks for exactly this shape
            (a form inside Modal.Content).
          */}
          <form id="venue-form" onSubmit={handleSubmit} noValidate>
            <Flex direction="column" alignItems="stretch" gap={6}>
              {/* ---------------------------------------- Informations générales */}
              <Box>
                <Box paddingBottom={3}>
                  <Typography variant="delta" fontWeight="bold">
                    {t("form.section.general")}
                  </Typography>
                </Box>
                <Grid.Root gap={4}>
                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="name"
                      required
                      error={tError(errors.name)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.name")}</Field.Label>
                      <TextInput
                        value={form.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleNameChange(e.target.value)
                        }
                      />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="slug"
                      error={tError(errors.slug)}
                      hint={t("form.hint.slug")}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.slug")}</Field.Label>
                      <TextInput
                        value={form.slug}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setSlugTouched(true)
                          setField("slug", e.target.value)
                        }}
                      />
                      <Field.Hint />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="type"
                      required
                      error={tError(errors.type)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.type")}</Field.Label>
                      <SingleSelect
                        value={form.type}
                        placeholder={t("form.placeholder.select")}
                        onChange={(value: string) =>
                          setField("type", value as VenueType)
                        }
                      >
                        {VENUE_TYPES.map((type) => (
                          <SingleSelectOption key={type} value={type}>
                            {t(typeLabelKey(type))}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="status"
                      error={tError(errors.status)}
                      hint={
                        canManageAll ? undefined : t("form.hint.statusReadOnly")
                      }
                      width="100%"
                    >
                      <Field.Label>{t("form.field.status")}</Field.Label>
                      <SingleSelect
                        value={form.status}
                        disabled={!canManageAll}
                        onChange={(value: string) =>
                          setField("status", value as VenueStatus)
                        }
                      >
                        {VENUE_STATUSES.map((status) => (
                          <SingleSelectOption key={status} value={status}>
                            {t(statusLabelKey(status))}
                          </SingleSelectOption>
                        ))}
                      </SingleSelect>
                      <Field.Hint />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={12} alignItems="stretch">
                    <Field.Root
                      name="description"
                      error={tError(errors.description)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.description")}</Field.Label>
                      <Textarea
                        value={form.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setField("description", e.target.value)
                        }
                      />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  {/*
                    `manager` is what the whole tenant boundary keys off: a venue
                    with none is invisible to every scoped Venue Manager, which
                    is why the field has to exist here (AC 9) and why only a
                    manage-all caller sees it — the server refuses it from
                    anyone else rather than dropping it.
                  */}
                  {canManageAll && (
                    <Grid.Item col={6} s={12} alignItems="stretch">
                      <Field.Root
                        name="manager"
                        error={tError(errors.manager)}
                        hint={t("form.hint.manager")}
                        width="100%"
                      >
                        <Field.Label>{t("form.field.manager")}</Field.Label>
                        <SingleSelect
                          value={form.manager}
                          disabled={managersLoading}
                          placeholder={
                            managersLoading
                              ? t("manager.loading")
                              : t("form.manager.none")
                          }
                          onChange={(value: string) =>
                            setField("manager", value)
                          }
                        >
                          {/* First option clears the relation — without it the
                              field is a one-way door once set. */}
                          <SingleSelectOption value="">
                            {t("form.manager.none")}
                          </SingleSelectOption>
                          {managers.map((manager) => (
                            <SingleSelectOption
                              key={manager.id}
                              value={String(manager.id)}
                            >
                              {managerLabel(manager)}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                        <Field.Hint />
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>
                  )}
                </Grid.Root>
              </Box>

              {/* ---------------------------------------------------- Localisation */}
              <Box>
                <Box paddingBottom={3}>
                  <Typography variant="delta" fontWeight="bold">
                    {t("form.section.location")}
                  </Typography>
                </Box>
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <MapPicker
                    address={form.address}
                    onAddressChange={(value) => setField("address", value)}
                    value={form.geo}
                    onChange={(value) => setField("geo", value)}
                    error={errors.address ?? errors.geo}
                    disabled={isSaving}
                  />

                  <Grid.Root gap={4}>
                    <Grid.Item col={6} s={12} alignItems="stretch">
                      <Field.Root
                        name="cityRef"
                        error={tError(errors.cityRef)}
                        width="100%"
                      >
                        <Field.Label>{t("form.field.city")}</Field.Label>
                        <SingleSelect
                          value={form.cityRef}
                          disabled={citiesLoading}
                          placeholder={
                            citiesLoading
                              ? t("city.loading")
                              : t("form.placeholder.select")
                          }
                          onChange={(value: string) =>
                            setField("cityRef", value)
                          }
                        >
                          {cityOptions.map((option) => (
                            <SingleSelectOption
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </SingleSelectOption>
                          ))}
                        </SingleSelect>
                        {/* Truncation is SAID, never silent: a stored city the
                            select never received would otherwise render blank
                            and be cleared by the next save. */}
                        {citiesTruncated && (
                          <Field.Hint>
                            {t("city.truncated", {
                              count: formatNumber(MAX_CITIES),
                            })}
                          </Field.Hint>
                        )}
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>

                    <Grid.Item col={6} s={12} alignItems="stretch">
                      <Field.Root
                        name="capacity"
                        error={tError(errors.capacity)}
                        width="100%"
                      >
                        <Field.Label>{t("form.field.capacity")}</Field.Label>
                        {/* DS v2: NumberInput reports through `onValueChange`. */}
                        <NumberInput
                          value={
                            form.capacity === ""
                              ? undefined
                              : Number(form.capacity)
                          }
                          onValueChange={(value?: number) =>
                            setField(
                              "capacity",
                              value === undefined || Number.isNaN(value)
                                ? ""
                                : String(value)
                            )
                          }
                        />
                        <Field.Error />
                      </Field.Root>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>
              </Box>

              {/* --------------------------------------------------------- Contact */}
              <Box>
                <Box paddingBottom={3}>
                  <Typography variant="delta" fontWeight="bold">
                    {t("form.section.contact")}
                  </Typography>
                </Box>
                <Grid.Root gap={4}>
                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="phone"
                      error={tError(errors.phone)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.phone")}</Field.Label>
                      <TextInput
                        value={form.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setField("phone", e.target.value)
                        }
                      />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={6} s={12} alignItems="stretch">
                    <Field.Root
                      name="email"
                      error={tError(errors.email)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.email")}</Field.Label>
                      <TextInput
                        type="email"
                        value={form.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setField("email", e.target.value)
                        }
                      />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>

                  <Grid.Item col={12} alignItems="stretch">
                    <Field.Root
                      name="website"
                      error={tError(errors.website)}
                      width="100%"
                    >
                      <Field.Label>{t("form.field.website")}</Field.Label>
                      <TextInput
                        value={form.website}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setField("website", e.target.value)
                        }
                      />
                      <Field.Error />
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Box>

              {/* ---------------------------------------------------------- Médias */}
              <Box>
                <Box paddingBottom={3}>
                  <Typography variant="delta" fontWeight="bold">
                    {t("form.section.media")}
                  </Typography>
                </Box>
                {/*
                  STUB (AC 9). `logo`/`images` are not editable here yet: the
                  upload control is the shared `MediaInput` port, which this
                  story does not do. Saying so beats rendering a dead dropzone —
                  and nothing here writes the fields, so an existing venue's
                  media survives every save made through this form.
                */}
                <Typography variant="omega" textColor="neutral600">
                  {t("form.media.deferred")}
                </Typography>
              </Box>

              {/* ------------------------------------------------------ Propriétés */}
              <Box>
                <Box paddingBottom={3}>
                  <Typography variant="delta" fontWeight="bold">
                    {t("form.section.properties")}
                  </Typography>
                </Box>
                {/* STUB (AC 9): property-value editing is story 2D.4. */}
                <Typography variant="omega" textColor="neutral600">
                  {t("form.properties.deferred")}
                </Typography>
              </Box>
            </Flex>
          </form>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">{t("form.cancel")}</Button>
          </Modal.Close>
          {/*
            `type="button"` + an explicit handler, NOT `type="submit"` with a
            `form="venue-form"` association: the footer lives outside the
            `<form>` (it is a sibling of `Modal.Body`), and pairing both would
            fire the submit twice wherever the DS Button does forward `form`.
            Enter inside the form still submits through the form's own
            `onSubmit`.
          */}
          <Button
            type="button"
            onClick={() => handleSubmit()}
            loading={isSaving}
          >
            {t(isEdit ? "form.submit.save" : "form.submit.create")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  )
}
