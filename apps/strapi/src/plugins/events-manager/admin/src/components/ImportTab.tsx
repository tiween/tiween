import { useState } from "react"
import {
  Badge,
  Box,
  Button,
  Flex,
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
import { Plus } from "@strapi/icons"

import { useEvents } from "../hooks/useEvents"

type StatusFilter = "all" | "published" | "draft"

const ImportTab = () => {
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

  return (
    <Box padding={4} background="neutral0" hasRadius>
      {/* Top bar with filters and action */}
      <Flex
        justifyContent="space-between"
        alignItems="flex-end"
        paddingBottom={4}
      >
        {/* Filters on the left */}
        <Flex gap={4}>
          <Box minWidth="200px">
            <SingleSelect
              label="Status"
              value={statusFilter}
              onChange={(value: StatusFilter) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SingleSelectOption value="all">All</SingleSelectOption>
              <SingleSelectOption value="published">
                Published
              </SingleSelectOption>
              <SingleSelectOption value="draft">Draft</SingleSelectOption>
            </SingleSelect>
          </Box>
        </Flex>

        {/* Action on the right */}
        <Button startIcon={<Plus />} onClick={handleBulkImport}>
          Add Bulk
        </Button>
      </Flex>

      {/* Events Table */}
      <Table>
        <Thead>
          <Tr>
            <Th>
              <Typography variant="sigma">Title</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Venue</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Date</Typography>
            </Th>
            <Th>
              <Typography variant="sigma">Status</Typography>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr>
              <Td colSpan={4}>
                <Typography>Loading...</Typography>
              </Td>
            </Tr>
          ) : events.length === 0 ? (
            <Tr>
              <Td colSpan={4}>
                <Typography textColor="neutral600">No events found</Typography>
              </Td>
            </Tr>
          ) : (
            events.map((event) => (
              <Tr key={event.id}>
                <Td>
                  <Typography>{event.title}</Typography>
                </Td>
                <Td>
                  <Typography>{event.venue?.name || "-"}</Typography>
                </Td>
                <Td>
                  <Typography>
                    {event.startDate
                      ? new Date(event.startDate).toLocaleDateString()
                      : "-"}
                  </Typography>
                </Td>
                <Td>
                  <Badge
                    backgroundColor={
                      event.publishedAt ? "success100" : "neutral150"
                    }
                    textColor={event.publishedAt ? "success700" : "neutral700"}
                  >
                    {event.publishedAt ? "Published" : "Draft"}
                  </Badge>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      {/* Pagination */}
      {pagination && pagination.pageCount > 1 && (
        <Flex justifyContent="center" gap={2} paddingTop={4}>
          <Button
            variant="tertiary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <Typography>
            Page {page} of {pagination.pageCount}
          </Typography>
          <Button
            variant="tertiary"
            disabled={page >= pagination.pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Box>
  )
}

export { ImportTab }
export default ImportTab
