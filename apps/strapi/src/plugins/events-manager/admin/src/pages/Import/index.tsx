/**
 * ImportPage Component
 *
 * Manage and import events from external sources.
 * Uses Strapi DS components with proper loading and empty states.
 */

import { useState } from "react"
import {
  Badge,
  Box,
  Button,
  Card,
  EmptyStateLayout,
  Flex,
  Grid,
  Loader,
  Main,
  Pagination,
  SingleSelect,
  SingleSelectOption,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from "@strapi/design-system"
import { Check, Clock, Play, Plus, Upload } from "@strapi/icons"
import { Layouts } from "@strapi/strapi/admin"

import { useEvents } from "../../hooks/useEvents"

type StatusFilter = "all" | "published" | "draft"

/** Stats Card Component */
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: string
}

function StatCard({ title, value, icon, color = "primary600" }: StatCardProps) {
  return (
    <Card padding={4}>
      <Flex gap={3} alignItems="center">
        <Box
          background="primary100"
          padding={2}
          hasRadius
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="pi" textColor="neutral600">
            {title}
          </Typography>
          <Typography variant="beta" fontWeight="bold">
            {value}
          </Typography>
        </Box>
      </Flex>
    </Card>
  )
}

const ImportPage = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)

  const { events, isLoading, pagination } = useEvents({
    status: statusFilter === "all" ? undefined : statusFilter,
    page,
    pageSize: 10,
  })

  const handleBulkImport = () => {
    // TODO: Open bulk import modal
    console.log("Open bulk import modal")
  }

  // Calculate stats
  const totalEvents = pagination?.total || 0
  const publishedCount = events.filter((e) => e.publishedAt).length
  const draftCount = events.filter((e) => !e.publishedAt).length

  return (
    <Layouts.Root>
      <Main>
        <Layouts.Header
          title="Import"
          subtitle="Gérez et importez des événements depuis des sources externes"
          primaryAction={
            <Button startIcon={<Plus />} onClick={handleBulkImport}>
              Importer
            </Button>
          }
        />
        <Layouts.Content>
          <Flex direction="column" gap={6}>
            {/* Stats Overview */}
            <Grid.Root gap={4}>
              <Grid.Item col={4} s={12}>
                <StatCard
                  title="Total événements"
                  value={totalEvents}
                  icon={<Play width={20} height={20} fill="primary600" />}
                />
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <StatCard
                  title="Publiés"
                  value={publishedCount}
                  icon={<Check width={20} height={20} fill="success600" />}
                />
              </Grid.Item>
              <Grid.Item col={4} s={12}>
                <StatCard
                  title="Brouillons"
                  value={draftCount}
                  icon={<Clock width={20} height={20} fill="warning600" />}
                />
              </Grid.Item>
            </Grid.Root>

            {/* Filters */}
            <Flex gap={3} alignItems="flex-end">
              <Box style={{ minWidth: 180 }}>
                <SingleSelect
                  value={statusFilter}
                  onChange={(value: StatusFilter) => {
                    setStatusFilter(value)
                    setPage(1)
                  }}
                  placeholder="Filtrer par statut"
                  size="S"
                >
                  <SingleSelectOption value="all">
                    Tous les statuts
                  </SingleSelectOption>
                  <SingleSelectOption value="published">
                    Publiés
                  </SingleSelectOption>
                  <SingleSelectOption value="draft">
                    Brouillons
                  </SingleSelectOption>
                </SingleSelect>
              </Box>
            </Flex>

            {/* Events Table */}
            <Box
              background="neutral0"
              hasRadius
              style={{
                border: "1px solid var(--strapi-color-neutral200)",
                overflow: "hidden",
              }}
            >
              {isLoading ? (
                <Flex justifyContent="center" alignItems="center" padding={8}>
                  <Loader>Chargement des événements...</Loader>
                </Flex>
              ) : events.length === 0 ? (
                <Box padding={8}>
                  <EmptyStateLayout
                    icon={<Upload width={64} height={64} />}
                    content={
                      <Flex direction="column" gap={2} alignItems="center">
                        <Typography variant="delta" textColor="neutral600">
                          {statusFilter !== "all"
                            ? "Aucun événement ne correspond aux filtres"
                            : "Aucun événement importé"}
                        </Typography>
                        {statusFilter === "all" && (
                          <Typography variant="omega" textColor="neutral500">
                            Importez des événements depuis des sources externes
                          </Typography>
                        )}
                      </Flex>
                    }
                    action={
                      statusFilter === "all" ? (
                        <Button startIcon={<Plus />} onClick={handleBulkImport}>
                          Importer des événements
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
                          <Typography variant="sigma">Titre</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Lieu</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Date</Typography>
                        </Th>
                        <Th>
                          <Typography variant="sigma">Statut</Typography>
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {events.map((event) => (
                        <Tr key={event.id}>
                          <Td>
                            <Typography fontWeight="semiBold">
                              {event.title}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral600">
                              {event.venue?.name || "-"}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral600">
                              {event.startDate
                                ? new Date(event.startDate).toLocaleDateString(
                                    "fr-FR",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )
                                : "-"}
                            </Typography>
                          </Td>
                          <Td>
                            <Badge
                              backgroundColor={
                                event.publishedAt ? "success100" : "neutral150"
                              }
                              textColor={
                                event.publishedAt ? "success700" : "neutral700"
                              }
                            >
                              {event.publishedAt ? "Publié" : "Brouillon"}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>

                  {/* Pagination */}
                  {pagination && pagination.pageCount > 1 && (
                    <Flex
                      justifyContent="space-between"
                      alignItems="center"
                      padding={4}
                      style={{
                        borderTop: "1px solid var(--strapi-color-neutral200)",
                      }}
                    >
                      <Typography variant="pi" textColor="neutral600">
                        {pagination.total} événement
                        {pagination.total > 1 ? "s" : ""} au total
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
          </Flex>
        </Layouts.Content>
      </Main>
    </Layouts.Root>
  )
}

export { ImportPage }
export default ImportPage
