/**
 * The venues list (Story 2D.2, S1 — AC 1/2/6/7/8).
 *
 * Behaviour ported from the Claude Design kit's `VenuesList`
 * (`design-export/ui_kit/App.jsx`): search over name+address, status/type/city
 * filters whose first option is "all" (`value=""`), a sortable Nom column,
 * tri-state bulk selection, a bulk delete that NAMES the count, and an
 * `EmptyStateLayout` that distinguishes "nothing yet" from "nothing matches".
 * The prototype's implementation is not ported: no custom DS bundle, no faked
 * data, real `@strapi/design-system` v2 components throughout.
 *
 * Mutation discipline (AC 2): confirm → mutate → REFETCH. Nothing is removed
 * from the table optimistically, so a delete that the server refused cannot
 * leave a row missing from a list that still contains it.
 */
import { useCallback, useEffect, useState } from "react"
import {
  Box,
  Button,
  Checkbox,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Main,
  Pagination,
  Searchbar,
  SearchForm,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from "@strapi/design-system"
import { CaretDown, CaretUp, Pencil, Plus, Store, Trash } from "@strapi/icons"
import { Layouts, Page, useNotification } from "@strapi/strapi/admin"
import { useIntl } from "react-intl"
import { useDebounce } from "use-debounce"

import type { Venue, VenueStatus, VenueType } from "../../hooks/useVenuesAdmin"

import { ConfirmDialog } from "../../components/ConfirmDialog"
import { StatusBadge } from "../../components/StatusBadge"
import { VenueFormModal } from "../../components/VenueFormModal"
import { useCities } from "../../hooks/useCities"
import { useVenuePermissions } from "../../hooks/useVenuePermissions"
import { useVenueMutations, useVenuesList } from "../../hooks/useVenuesAdmin"
import { errorTranslationKey } from "../../utils/errors"
import { formatDate, formatNumber } from "../../utils/format"
import { getTranslation } from "../../utils/getTranslation"
import {
  statusLabelKey,
  typeLabelKey,
  VENUE_STATUSES,
  VENUE_TYPES,
} from "../../utils/venueOptions"

const PAGE_SIZE = 20

/** The columns the admin API accepts a sort on. */
type SortField = "name" | "type" | "status" | "capacity"

export function VenuesPage() {
  const { formatMessage, messages } = useIntl()
  const { toggleNotification } = useNotification()
  const {
    isLoading: permissionsLoading,
    canRead,
    canManageAll,
    canCreate,
    canUpdate,
    canDelete,
  } = useVenuePermissions()

  const t = useCallback(
    (id: string, values?: Record<string, string>) =>
      formatMessage({ id: getTranslation(id) }, values),
    [formatMessage]
  )

  const tError = useCallback(
    (code: string) =>
      formatMessage({
        id: getTranslation(
          errorTranslationKey(code, messages as Record<string, unknown>)
        ),
      }),
    [formatMessage, messages]
  )

  /* ----------------------------------------------------------- query state */
  const [search, setSearch] = useState("")
  const [debouncedSearch] = useDebounce(search, 300)
  const [statusFilter, setStatusFilter] = useState<VenueStatus | "">("")
  const [typeFilter, setTypeFilter] = useState<VenueType | "">("")
  const [cityFilter, setCityFilter] = useState("")
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const [selected, setSelected] = useState<Set<string>>(new Set())

  /* ----------------------------------------------------------- modal state */
  const [editing, setEditing] = useState<Venue | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Venue | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const { cities } = useCities()
  const { venues, pagination, isLoading, error, refetch } = useVenuesList({
    // A caller without `plugin::venues.read` must not fire a request that can
    // only 403: the admin has a standard surface for "you may not see this",
    // and a 403-driven empty state reads as "there are no venues".
    enabled: canRead,
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
    city: cityFilter,
    sortField,
    sortOrder,
  })

  const {
    deleteVenue,
    bulkDeleteVenues,
    isLoading: isMutating,
  } = useVenueMutations()

  /**
   * Deleting the last rows of the last page leaves `page > pageCount`, and the
   * refetch then returns an empty page — the table reads "no venues" while
   * venues exist. Clamp onto the answer the server just gave.
   */
  useEffect(() => {
    if (isLoading) return
    if (pagination.pageCount > 0 && page > pagination.pageCount) {
      setPage(pagination.pageCount)
    }
  }, [isLoading, page, pagination.pageCount])

  const hasFilters = Boolean(
    debouncedSearch || statusFilter || typeFilter || cityFilter
  )

  /* -------------------------------------------------------------- handlers */

  /** Any filter change resets the page AND the selection: a selection that
   *  survives a filter change is a bulk delete aimed at rows nobody can see. */
  const resetView = useCallback(() => {
    setPage(1)
    setSelected(new Set())
  }, [])

  const handleSort = useCallback(
    (field: SortField) => {
      setSortOrder((prev) =>
        sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"
      )
      setSortField(field)
      resetView()
    },
    [resetView, sortField]
  )

  const allSelected =
    venues.length > 0 && venues.every((v) => selected.has(v.documentId))
  const someSelected = selected.size > 0

  const toggleAll = useCallback(() => {
    setSelected(
      allSelected ? new Set() : new Set(venues.map((v) => v.documentId))
    )
  }, [allSelected, venues])

  const toggleOne = useCallback((documentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(documentId)) next.delete(documentId)
      else next.add(documentId)
      return next
    })
  }, [])

  const closeForm = useCallback(() => {
    setEditing(null)
    setIsCreating(false)
  }, [])

  const handleSaved = useCallback(() => {
    closeForm()
    refetch()
  }, [closeForm, refetch])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    const result = await deleteVenue(deleteTarget.documentId)
    setDeleteTarget(null)

    toggleNotification(
      result.ok
        ? { type: "success", message: t("toast.deleted") }
        : { type: "danger", message: tError(result.error.code) }
    )

    // Refetch either way: a failed delete may still have changed the page (a
    // concurrent edit), and the table must never diverge from the server.
    refetch()
  }, [deleteTarget, deleteVenue, refetch, t, tError, toggleNotification])

  const confirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selected)
    const result = await bulkDeleteVenues(ids)
    setIsBulkDeleting(false)
    setSelected(new Set())

    if (!result.ok) {
      toggleNotification({ type: "danger", message: tError(result.error.code) })
    } else {
      toggleNotification({
        type: "success",
        message: t("toast.bulkDeleted", {
          count: formatNumber(result.data.deleted.length),
        }),
      })
      // A partial failure is reported, never swallowed — the refetch would
      // otherwise leave rows behind with no explanation.
      if (result.data.failed.length > 0) {
        toggleNotification({
          type: "warning",
          message: t("toast.bulkPartial", {
            count: formatNumber(result.data.failed.length),
          }),
        })
      }
    }

    refetch()
  }, [bulkDeleteVenues, refetch, selected, t, tError, toggleNotification])

  /* ------------------------------------------------------------- rendering */

  const sortIconFor = (field: SortField) => {
    const Icon =
      sortField === field && sortOrder === "desc" ? CaretDown : CaretUp
    return (
      <Icon
        width={12}
        height={12}
        fill={
          sortField === field
            ? "var(--colors-primary600)"
            : "var(--colors-neutral400)"
        }
      />
    )
  }

  const sortableHeader = (field: SortField, labelKey: string) => {
    const label = t(labelKey)
    return (
      <Th
        // `aria-sort` is what a screen reader announces; the caret is decoration.
        aria-sort={
          sortField === field
            ? sortOrder === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Button
          variant="ghost"
          size="S"
          onClick={() => handleSort(field)}
          endIcon={sortIconFor(field)}
        >
          <Typography variant="sigma">{label}</Typography>
          <VisuallyHidden>{t("list.sortBy", { column: label })}</VisuallyHidden>
        </Button>
      </Th>
    )
  }

  const subtitle = canManageAll
    ? t("pages.venues.subtitle", { count: formatNumber(pagination.total) })
    : t("pages.venues.subtitle.own")

  const cityNameOf = (venue: Venue) => venue.cityRef?.name ?? "-"

  const typeLabelOf = (venue: Venue) =>
    venue.type ? t(typeLabelKey(venue.type)) : "-"

  if (permissionsLoading) {
    return <Page.Loading />
  }

  if (!canRead) {
    return <Page.NoPermissions />
  }

  return (
    <Main>
      <Layouts.Header
        title={t("pages.venues.title")}
        subtitle={subtitle}
        primaryAction={
          canCreate && canManageAll ? (
            <Button startIcon={<Plus />} onClick={() => setIsCreating(true)}>
              {t("pages.venues.create")}
            </Button>
          ) : undefined
        }
      />

      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={4}>
          {/* --------------------------------------------------- filters row */}
          <Flex gap={2} wrap="wrap" alignItems="center">
            <Box flex="1" minWidth="20rem">
              <SearchForm>
                <Searchbar
                  name="search"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearch(e.target.value)
                    resetView()
                  }}
                  onClear={() => {
                    setSearch("")
                    resetView()
                  }}
                  clearLabel={t("list.search.clear")}
                  placeholder={t("list.search.placeholder")}
                >
                  {t("list.search.placeholder")}
                </Searchbar>
              </SearchForm>
            </Box>

            {/* Every filter's FIRST option is the "all" escape (`value=""`) —
                without it a filter is a one-way door once picked. */}
            <SingleSelect
              size="S"
              value={statusFilter}
              onChange={(value: string) => {
                setStatusFilter(value as VenueStatus | "")
                resetView()
              }}
              aria-label={t("list.column.status")}
              placeholder={t("list.filter.status")}
            >
              <SingleSelectOption value="">
                {t("list.filter.status.all")}
              </SingleSelectOption>
              {VENUE_STATUSES.map((status) => (
                <SingleSelectOption key={status} value={status}>
                  {t(statusLabelKey(status))}
                </SingleSelectOption>
              ))}
            </SingleSelect>

            <SingleSelect
              size="S"
              value={typeFilter}
              onChange={(value: string) => {
                setTypeFilter(value as VenueType | "")
                resetView()
              }}
              aria-label={t("list.column.type")}
              placeholder={t("list.filter.type")}
            >
              <SingleSelectOption value="">
                {t("list.filter.type.all")}
              </SingleSelectOption>
              {VENUE_TYPES.map((type) => (
                <SingleSelectOption key={type} value={type}>
                  {t(typeLabelKey(type))}
                </SingleSelectOption>
              ))}
            </SingleSelect>

            <SingleSelect
              size="S"
              value={cityFilter}
              onChange={(value: string) => {
                setCityFilter(value)
                resetView()
              }}
              aria-label={t("list.column.city")}
              placeholder={t("list.filter.city")}
            >
              <SingleSelectOption value="">
                {t("list.filter.city.all")}
              </SingleSelectOption>
              {cities.map((city) => (
                <SingleSelectOption
                  key={city.documentId}
                  value={city.documentId}
                >
                  {city.name}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Flex>

          {/* ------------------------------------------------ bulk action bar */}
          {someSelected && canDelete && (
            <Flex
              gap={3}
              alignItems="center"
              background="primary100"
              hasRadius
              padding={2}
            >
              <Typography
                variant="omega"
                fontWeight="semiBold"
                textColor="primary700"
              >
                {t("list.selected", { count: formatNumber(selected.size) })}
              </Typography>
              <Button
                size="S"
                variant="danger-light"
                startIcon={<Trash />}
                onClick={() => setIsBulkDeleting(true)}
              >
                {t("list.bulkDelete")}
              </Button>
            </Flex>
          )}

          {/* ------------------------------------------------------- the table */}
          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>{t("list.loading")}</Loader>
            </Flex>
          ) : venues.length === 0 ? (
            <EmptyStateLayout
              icon={<Store width="10rem" height="10rem" />}
              content={
                error
                  ? tError(error.code)
                  : hasFilters
                    ? t("list.empty.filtered")
                    : t("list.empty")
              }
              action={
                !hasFilters && canCreate && canManageAll ? (
                  <Button
                    variant="secondary"
                    startIcon={<Plus />}
                    onClick={() => setIsCreating(true)}
                  >
                    {t("pages.venues.create")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table colCount={7} rowCount={venues.length + 1}>
                <Thead>
                  <Tr>
                    <Th>
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : someSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={toggleAll}
                        aria-label={t("list.selectAll")}
                      />
                    </Th>
                    {sortableHeader("name", "list.column.name")}
                    <Th>
                      <Typography variant="sigma">
                        {t("list.column.city")}
                      </Typography>
                    </Th>
                    {sortableHeader("type", "list.column.type")}
                    {sortableHeader("status", "list.column.status")}
                    {sortableHeader("capacity", "list.column.capacity")}
                    <Th>
                      <VisuallyHidden>
                        {t("list.column.actions")}
                      </VisuallyHidden>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {venues.map((venue) => (
                    <Tr key={venue.documentId}>
                      <Td>
                        <Checkbox
                          checked={selected.has(venue.documentId)}
                          onCheckedChange={() => toggleOne(venue.documentId)}
                          aria-label={t("list.select", { name: venue.name })}
                        />
                      </Td>
                      <Td>
                        <Flex direction="column" alignItems="flex-start">
                          <Typography fontWeight="bold">
                            {venue.name}
                          </Typography>
                          {/*
                            The one date this surface shows. `formatDate` is
                            locale-independent `DD/MM/YYYY` in Western numerals,
                            in Arabic too (project i18n rule).
                          */}
                          <Typography variant="pi" textColor="neutral600">
                            {t("list.updatedAt", {
                              date: formatDate(venue.updatedAt),
                            })}
                          </Typography>
                        </Flex>
                      </Td>
                      <Td>
                        <Typography textColor="neutral600">
                          {cityNameOf(venue)}
                        </Typography>
                      </Td>
                      <Td>
                        <Typography>{typeLabelOf(venue)}</Typography>
                      </Td>
                      <Td>
                        <StatusBadge status={venue.status} />
                      </Td>
                      <Td>
                        <Typography>{formatNumber(venue.capacity)}</Typography>
                      </Td>
                      <Td>
                        <Flex gap={1} justifyContent="flex-end">
                          {canUpdate && (
                            <IconButton
                              label={t("list.edit")}
                              onClick={() => setEditing(venue)}
                            >
                              <Pencil />
                            </IconButton>
                          )}
                          {canDelete && (
                            <IconButton
                              label={t("list.delete")}
                              variant="danger-light"
                              onClick={() => setDeleteTarget(venue)}
                            >
                              <Trash />
                            </IconButton>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              <Flex justifyContent="space-between" alignItems="center">
                <Typography variant="pi" textColor="neutral600">
                  {t("list.total", { count: formatNumber(pagination.total) })}
                </Typography>
                {pagination.pageCount > 1 && (
                  <Pagination
                    activePage={pagination.page}
                    pageCount={pagination.pageCount}
                    onPageChange={setPage}
                  />
                )}
              </Flex>
            </>
          )}
        </Flex>
      </Layouts.Content>

      {(isCreating || editing) && (
        <VenueFormModal
          venue={editing}
          isOpen
          canManageAll={canManageAll}
          onClose={closeForm}
          onSuccess={handleSaved}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t("dialog.delete.title")}
        // NAMES the row, exactly as the bulk dialog names its count: an
        // unnamed confirm is how the wrong venue gets deleted after a misclick.
        body={
          deleteTarget?.name
            ? t("dialog.delete.bodyNamed", { name: deleteTarget.name })
            : t("dialog.delete.body")
        }
        confirmLabel={t("dialog.confirm")}
        cancelLabel={t("dialog.cancel")}
        isLoading={isMutating}
      />

      <ConfirmDialog
        isOpen={isBulkDeleting}
        onClose={() => setIsBulkDeleting(false)}
        onConfirm={confirmBulkDelete}
        title={t("dialog.delete.title")}
        // The confirm NAMES the scope ("Supprimer 3 lieux ?") — a generic
        // "Are you sure?" is what lets a forgotten selection be deleted.
        body={t("dialog.bulkDelete.body", {
          count: formatNumber(selected.size),
        })}
        confirmLabel={t("dialog.confirm")}
        cancelLabel={t("dialog.cancel")}
        isLoading={isMutating}
      />
    </Main>
  )
}
