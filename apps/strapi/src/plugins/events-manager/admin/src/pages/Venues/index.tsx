/**
 * VenuesPage Component
 *
 * Full venue management interface with table, filters, pagination,
 * and bulk actions. Uses Strapi DS components exclusively.
 */

import { useCallback, useState } from "react"
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
import { CaretDown, CaretUp, House, Pencil, Plus, Trash } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"
import { useDebounce } from "use-debounce"

import type {
  Venue,
  VenueStatus,
  VenueType,
} from "../../hooks/useVenuesEnhanced"

import { ConfirmDialog } from "../../components/ConfirmDialog"
import { STATUS_OPTIONS, StatusBadge } from "../../components/StatusBadge"
import { VENUE_TYPE_OPTIONS } from "../../components/VenueCard"
import { VenueFormModal } from "../../components/VenueFormModal"
import { useVenueMutations, useVenuesList } from "../../hooks/useVenuesEnhanced"
import { BulkActionsDropdown } from "./BulkActionsDropdown"

/** Sortable column definition */
type SortField = "name" | "city" | "type" | "status" | "capacity"
type SortOrder = "asc" | "desc"

export function VenuesPage() {
  // Filters state
  const [searchValue, setSearchValue] = useState("")
  const [debouncedSearch] = useDebounce(searchValue, 300)
  const [statusFilter, setStatusFilter] = useState<VenueStatus | "">("")
  const [typeFilter, setTypeFilter] = useState<VenueType | "">("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal state
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Venue | null>(null)
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [bulkStatusConfirm, setBulkStatusConfirm] =
    useState<VenueStatus | null>(null)

  // Fetch venues
  const { venues, pagination, isLoading, refetch } = useVenuesList({
    page,
    pageSize,
    search: debouncedSearch,
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    sort: `${sortField}:${sortOrder}`,
  })

  // Mutations
  const {
    deleteVenue,
    bulkUpdateStatus,
    bulkDelete,
    checkVenueShowtimes,
    isLoading: isMutating,
  } = useVenueMutations()

  // Delete protection state
  const [deleteBlockedVenue, setDeleteBlockedVenue] = useState<{
    venue: Venue
    showtimeCount: number
  } | null>(null)

  // Selection handlers
  const allSelected =
    venues.length > 0 && venues.every((v) => selectedIds.has(v.documentId))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(venues.map((v) => v.documentId)))
    }
  }, [allSelected, venues])

  const handleSelectOne = useCallback((documentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(documentId)) {
        next.delete(documentId)
      } else {
        next.add(documentId)
      }
      return next
    })
  }, [])

  // Clear selection when filters change
  const handleFilterChange = useCallback(() => {
    setSelectedIds(new Set())
    setPage(1)
  }, [])

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Toggle order if same field
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        // New field, default to ascending
        setSortField(field)
        setSortOrder("asc")
      }
      setPage(1)
    },
    [sortField]
  )

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    const isActive = sortField === field
    const Icon = sortOrder === "asc" ? CaretUp : CaretDown
    return (
      <Box
        style={{ display: "flex", alignItems: "center" }}
        color={isActive ? "primary600" : "neutral400"}
      >
        <Icon width={12} height={12} />
      </Box>
    )
  }

  // Action handlers
  const handleEdit = useCallback((venue: Venue) => {
    setEditingVenue(venue)
  }, [])

  const handleDelete = useCallback(
    async (venue: Venue) => {
      // Check if venue has associated showtimes
      const showtimeCount = await checkVenueShowtimes(venue.documentId)
      if (showtimeCount > 0) {
        setDeleteBlockedVenue({ venue, showtimeCount })
      } else {
        setDeleteConfirm(venue)
      }
    },
    [checkVenueShowtimes]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return

    const success = await deleteVenue(deleteConfirm.documentId)
    if (success) {
      setDeleteConfirm(null)
      refetch()
    }
  }, [deleteConfirm, deleteVenue, refetch])

  const handleBulkStatusChange = useCallback((status: VenueStatus) => {
    setBulkStatusConfirm(status)
  }, [])

  const handleConfirmBulkStatus = useCallback(async () => {
    if (!bulkStatusConfirm) return

    const success = await bulkUpdateStatus(
      Array.from(selectedIds),
      bulkStatusConfirm
    )
    if (success) {
      setBulkStatusConfirm(null)
      setSelectedIds(new Set())
      refetch()
    }
  }, [bulkStatusConfirm, bulkUpdateStatus, selectedIds, refetch])

  const handleBulkDelete = useCallback(() => {
    setBulkDeleteConfirm(true)
  }, [])

  const handleConfirmBulkDelete = useCallback(async () => {
    const result = await bulkDelete(Array.from(selectedIds))
    setBulkDeleteConfirm(false)
    setSelectedIds(new Set())
    refetch()
  }, [bulkDelete, selectedIds, refetch])

  const handleModalClose = useCallback(() => {
    setEditingVenue(null)
    setIsCreateModalOpen(false)
  }, [])

  const handleSaveSuccess = useCallback(() => {
    handleModalClose()
    refetch()
  }, [handleModalClose, refetch])

  // Get location display text
  const getLocationText = (venue: Venue) => {
    const city = venue.cityRef?.name || venue.city
    const region = venue.cityRef?.region?.name || venue.region
    if (city && region) return `${city}, ${region}`
    if (city) return city
    return "-"
  }

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Lieux"
          subtitle="Gérez les lieux et salles pour vos événements"
          primaryAction={
            <Button
              startIcon={<Plus />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Ajouter un lieu
            </Button>
          }
        />
        <Layouts.Content>
          {/* Filters */}
          <Flex gap={2} marginBottom={4} wrap="wrap">
            <Box style={{ flex: 1, minWidth: 200, maxWidth: 400 }}>
              <SearchForm>
                <Searchbar
                  name="search"
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value)
                    handleFilterChange()
                  }}
                  onClear={() => {
                    setSearchValue("")
                    handleFilterChange()
                  }}
                  placeholder="Rechercher un lieu..."
                  clearLabel="Effacer la recherche"
                />
              </SearchForm>
            </Box>

            <Box style={{ minWidth: 160 }}>
              <SingleSelect
                value={statusFilter}
                onChange={(value: string) => {
                  setStatusFilter(value as VenueStatus | "")
                  handleFilterChange()
                }}
                placeholder="Statut"
                size="S"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <SingleSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>

            <Box style={{ minWidth: 160 }}>
              <SingleSelect
                value={typeFilter}
                onChange={(value: string) => {
                  setTypeFilter(value as VenueType | "")
                  handleFilterChange()
                }}
                placeholder="Type"
                size="S"
              >
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <SingleSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Box>

            {/* Bulk Actions */}
            {someSelected && (
              <BulkActionsDropdown
                selectedCount={selectedIds.size}
                onApprove={() => handleBulkStatusChange("approved")}
                onSuspend={() => handleBulkStatusChange("suspended")}
                onDelete={handleBulkDelete}
              />
            )}
          </Flex>

          {/* Table */}
          <Box
            background="neutral0"
            hasRadius
            style={{
              border: "1px solid var(--strapi-color-neutral200)",
              overflow: "hidden",
            }}
          >
            {isLoading ? (
              <Flex justifyContent="center" padding={8}>
                <Loader>Chargement des lieux...</Loader>
              </Flex>
            ) : venues.length === 0 ? (
              <Box padding={8} style={{ textAlign: "center" }}>
                <EmptyStateLayout
                  icon={<House width={64} height={64} />}
                  content={
                    debouncedSearch || statusFilter || typeFilter
                      ? "Aucun lieu ne correspond aux filtres"
                      : "Aucun lieu enregistré"
                  }
                  action={
                    !(debouncedSearch || statusFilter || typeFilter) ? (
                      <Button
                        variant="secondary"
                        startIcon={<Plus />}
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        Ajouter le premier lieu
                      </Button>
                    ) : undefined
                  }
                />
              </Box>
            ) : (
              <>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected ? true : undefined}
                          onCheckedChange={handleSelectAll}
                          aria-label="Tout sélectionner"
                        />
                      </Th>
                      <Th>
                        <VisuallyHidden>Logo</VisuallyHidden>
                      </Th>
                      <Th>
                        <Flex
                          alignItems="center"
                          gap={1}
                          onClick={() => handleSort("name")}
                          role="button"
                          aria-label="Trier par nom"
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          <Typography variant="sigma">Nom</Typography>
                          {renderSortIcon("name")}
                        </Flex>
                      </Th>
                      <Th>
                        <Typography variant="sigma">Ville</Typography>
                      </Th>
                      <Th>
                        <Flex
                          alignItems="center"
                          gap={1}
                          onClick={() => handleSort("type")}
                          role="button"
                          aria-label="Trier par type"
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          <Typography variant="sigma">Type</Typography>
                          {renderSortIcon("type")}
                        </Flex>
                      </Th>
                      <Th>
                        <Flex
                          alignItems="center"
                          gap={1}
                          onClick={() => handleSort("status")}
                          role="button"
                          aria-label="Trier par statut"
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          <Typography variant="sigma">Statut</Typography>
                          {renderSortIcon("status")}
                        </Flex>
                      </Th>
                      <Th>
                        <Flex
                          alignItems="center"
                          gap={1}
                          onClick={() => handleSort("capacity")}
                          role="button"
                          aria-label="Trier par capacité"
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          <Typography variant="sigma">Capacité</Typography>
                          {renderSortIcon("capacity")}
                        </Flex>
                      </Th>
                      <Th>
                        <VisuallyHidden>Actions</VisuallyHidden>
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {venues.map((venue) => {
                      const logoUrl =
                        venue.logo?.formats?.thumbnail?.url || venue.logo?.url
                      const typeLabel = venue.type
                        ? VENUE_TYPE_OPTIONS.find((t) => t.value === venue.type)
                            ?.label
                        : "-"

                      return (
                        <Tr key={venue.documentId}>
                          <Td>
                            <Checkbox
                              checked={selectedIds.has(venue.documentId)}
                              onCheckedChange={() =>
                                handleSelectOne(venue.documentId)
                              }
                              aria-label={`Sélectionner ${venue.name}`}
                            />
                          </Td>
                          <Td>
                            <Box
                              background="neutral100"
                              hasRadius
                              style={{
                                width: 40,
                                height: 40,
                                overflow: "hidden",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <House
                                  width={20}
                                  height={20}
                                  fill="neutral400"
                                />
                              )}
                            </Box>
                          </Td>
                          <Td>
                            <Typography fontWeight="bold">
                              {venue.name}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral600">
                              {getLocationText(venue)}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography>{typeLabel}</Typography>
                          </Td>
                          <Td>
                            <StatusBadge status={venue.status} />
                          </Td>
                          <Td>
                            <Typography>
                              {venue.capacity ? `${venue.capacity}` : "-"}
                            </Typography>
                          </Td>
                          <Td>
                            <Flex gap={1}>
                              <IconButton
                                label="Modifier"
                                onClick={() => handleEdit(venue)}
                              >
                                <Pencil />
                              </IconButton>
                              <IconButton
                                label="Supprimer"
                                onClick={() => handleDelete(venue)}
                              >
                                <Trash />
                              </IconButton>
                            </Flex>
                          </Td>
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>

                {/* Pagination */}
                {pagination.pageCount > 1 && (
                  <Flex
                    justifyContent="space-between"
                    alignItems="center"
                    padding={4}
                    style={{
                      borderTop: "1px solid var(--strapi-color-neutral200)",
                    }}
                  >
                    <Typography variant="pi" textColor="neutral600">
                      {pagination.total} lieu{pagination.total > 1 ? "x" : ""}{" "}
                      au total
                    </Typography>
                    <Pagination
                      activePage={pagination.page}
                      pageCount={pagination.pageCount}
                      onPageChange={setPage}
                    />
                  </Flex>
                )}
              </>
            )}
          </Box>
        </Layouts.Content>

        {/* Create/Edit Modal */}
        {(isCreateModalOpen || editingVenue) && (
          <VenueFormModal
            venue={editingVenue}
            isOpen={true}
            onClose={handleModalClose}
            onSuccess={handleSaveSuccess}
          />
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleConfirmDelete}
          title="Supprimer le lieu"
          message={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.name}" ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={isMutating}
        />

        {/* Bulk Status Confirmation */}
        <ConfirmDialog
          isOpen={!!bulkStatusConfirm}
          onClose={() => setBulkStatusConfirm(null)}
          onConfirm={handleConfirmBulkStatus}
          title={
            bulkStatusConfirm === "approved"
              ? "Approuver les lieux"
              : "Suspendre les lieux"
          }
          message={`${selectedIds.size} lieu${selectedIds.size > 1 ? "x" : ""} ${
            selectedIds.size > 1 ? "seront" : "sera"
          } ${bulkStatusConfirm === "approved" ? "approuvé" : "suspendu"}${
            selectedIds.size > 1 ? "s" : ""
          }.`}
          confirmLabel={
            bulkStatusConfirm === "approved" ? "Approuver" : "Suspendre"
          }
          variant={bulkStatusConfirm === "approved" ? "success" : "warning"}
          isLoading={isMutating}
        />

        {/* Bulk Delete Confirmation */}
        <ConfirmDialog
          isOpen={bulkDeleteConfirm}
          onClose={() => setBulkDeleteConfirm(false)}
          onConfirm={handleConfirmBulkDelete}
          title="Supprimer les lieux"
          message={`${selectedIds.size} lieu${selectedIds.size > 1 ? "x" : ""} ${
            selectedIds.size > 1 ? "seront supprimés" : "sera supprimé"
          }. Cette action est irréversible.`}
          confirmLabel="Supprimer"
          variant="danger"
          isLoading={isMutating}
        />

        {/* Delete Blocked Dialog (venue has showtimes) */}
        <ConfirmDialog
          isOpen={!!deleteBlockedVenue}
          onClose={() => setDeleteBlockedVenue(null)}
          onConfirm={() => setDeleteBlockedVenue(null)}
          title="Suppression impossible"
          message={`Le lieu "${deleteBlockedVenue?.venue.name}" ne peut pas être supprimé car il a ${deleteBlockedVenue?.showtimeCount} séance${(deleteBlockedVenue?.showtimeCount ?? 0) > 1 ? "s" : ""} programmée${(deleteBlockedVenue?.showtimeCount ?? 0) > 1 ? "s" : ""}. Supprimez d'abord les séances associées.`}
          confirmLabel="Compris"
          variant="warning"
        />
      </Main>
    </Layouts.Root>
  )
}
