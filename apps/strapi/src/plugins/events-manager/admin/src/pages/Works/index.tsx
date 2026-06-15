/**
 * WorksListPage
 *
 * Catalog list of creative works (films, short films, plays) with
 * search, type filter, pagination and links to view / edit / create.
 */

import { useState } from "react"
import {
  Badge,
  Box,
  Button,
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
import { Eye, Pencil, Plus, Trash } from "@strapi/icons"
import { Layouts, useNotification } from "@strapi/strapi/admin"
import { useNavigate } from "react-router-dom"
import { useDebounce } from "use-debounce"

import type { CreativeWork, WorkType } from "../../hooks/useCreativeWorks"

import { humanize, useCatalogT } from "../../components/Catalog/i18n"
import { WORK_TYPES } from "../../components/Catalog/options"
import { ConfirmDialog } from "../../components/ConfirmDialog"
import { useWorkMutations, useWorksList } from "../../hooks/useCreativeWorks"
import { PLUGIN_ID } from "../../pluginId"

const BASE_PATH = `/plugins/${PLUGIN_ID}/works`

export function WorksListPage() {
  const t = useCatalogT()
  const navigate = useNavigate()
  const { toggleNotification } = useNotification()

  const [searchValue, setSearchValue] = useState("")
  const [debouncedSearch] = useDebounce(searchValue, 300)
  const [typeFilter, setTypeFilter] = useState<WorkType | "">("")
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<CreativeWork | null>(null)

  const { works, pagination, isLoading, refetch } = useWorksList({
    page,
    search: debouncedSearch,
    type: typeFilter,
  })
  const { deleteWork, isLoading: isMutating } = useWorkMutations()

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteWork(deleteTarget.documentId)
      toggleNotification({
        type: "success",
        message: t("works.deleted", "Work deleted"),
      })
      setDeleteTarget(null)
      refetch()
    } catch {
      toggleNotification({
        type: "danger",
        message: t("common.error", "Something went wrong"),
      })
    }
  }

  return (
    <Main>
      <Layouts.Header
        title={t("works.title", "Works")}
        subtitle={t(
          "works.subtitle",
          "Films, short films and plays of the catalog"
        )}
        primaryAction={
          <Button
            startIcon={<Plus />}
            onClick={() => navigate(`${BASE_PATH}/new`)}
          >
            {t("works.create", "Add a work")}
          </Button>
        }
      />
      <Layouts.Content>
        <Flex gap={2} marginBottom={4} wrap="wrap">
          <Box flex="1" minWidth="200px" maxWidth="400px">
            <SearchForm>
              <Searchbar
                name="search"
                value={searchValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchValue(event.target.value)
                  setPage(1)
                }}
                onClear={() => {
                  setSearchValue("")
                  setPage(1)
                }}
                clearLabel={t("common.clear", "Clear")}
              >
                {t("works.searchPlaceholder", "Search a title…")}
              </Searchbar>
            </SearchForm>
          </Box>
          <SingleSelect
            aria-label={t("works.filterType", "Filter by type")}
            placeholder={t("works.allTypes", "All types")}
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value as WorkType | "")
              setPage(1)
            }}
            onClear={() => {
              setTypeFilter("")
              setPage(1)
            }}
          >
            {WORK_TYPES.map((type) => (
              <SingleSelectOption key={type} value={type}>
                {t(`workType.${type}`, humanize(type))}
              </SingleSelectOption>
            ))}
          </SingleSelect>
        </Flex>

        <Box background="neutral0" hasRadius shadow="filterShadow">
          {isLoading ? (
            <Flex justifyContent="center" padding={8}>
              <Loader>{t("common.loading", "Loading…")}</Loader>
            </Flex>
          ) : works.length === 0 ? (
            <EmptyStateLayout
              content={t("works.empty", "No work found")}
              action={
                <Button
                  variant="secondary"
                  startIcon={<Plus />}
                  onClick={() => navigate(`${BASE_PATH}/new`)}
                >
                  {t("works.create", "Add a work")}
                </Button>
              }
            />
          ) : (
            <>
              <Table colCount={6} rowCount={works.length + 1}>
                <Thead>
                  <Tr>
                    <Th>
                      <Typography variant="sigma">
                        {t("works.colTitle", "Title")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("works.colType", "Type")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("works.colYear", "Year")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("works.colDuration", "Duration")}
                      </Typography>
                    </Th>
                    <Th>
                      <Typography variant="sigma">
                        {t("works.colStatus", "Status")}
                      </Typography>
                    </Th>
                    <Th>
                      <VisuallyHidden>
                        {t("common.actions", "Actions")}
                      </VisuallyHidden>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {works.map((work) => (
                    <Tr key={work.documentId}>
                      <Td>
                        <Flex gap={2} alignItems="center">
                          {work.poster?.formats?.thumbnail?.url ||
                          work.poster?.url ? (
                            <Box
                              tag="img"
                              src={
                                work.poster.formats?.thumbnail?.url ??
                                work.poster.url
                              }
                              alt=""
                              width="28px"
                              height="40px"
                              hasRadius
                            />
                          ) : null}
                          <Typography fontWeight="semiBold">
                            {work.title}
                          </Typography>
                        </Flex>
                      </Td>
                      <Td>
                        <Badge>
                          {t(`workType.${work.type}`, humanize(work.type))}
                        </Badge>
                      </Td>
                      <Td>
                        <Typography>{work.releaseYear ?? "—"}</Typography>
                      </Td>
                      <Td>
                        <Typography>
                          {work.duration ? `${work.duration} min` : "—"}
                        </Typography>
                      </Td>
                      <Td>
                        {work.publishedAt ? (
                          <Badge
                            backgroundColor="success100"
                            textColor="success700"
                          >
                            {t("common.published", "Published")}
                          </Badge>
                        ) : (
                          <Badge>{t("common.draft", "Draft")}</Badge>
                        )}
                      </Td>
                      <Td>
                        <Flex gap={1} justifyContent="flex-end">
                          <IconButton
                            label={t("common.view", "View")}
                            variant="ghost"
                            onClick={() =>
                              navigate(`${BASE_PATH}/${work.documentId}`)
                            }
                          >
                            <Eye />
                          </IconButton>
                          <IconButton
                            label={t("common.edit", "Edit")}
                            variant="ghost"
                            onClick={() =>
                              navigate(`${BASE_PATH}/${work.documentId}/edit`)
                            }
                          >
                            <Pencil />
                          </IconButton>
                          <IconButton
                            label={t("common.delete", "Delete")}
                            variant="ghost"
                            onClick={() => setDeleteTarget(work)}
                          >
                            <Trash />
                          </IconButton>
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {pagination.pageCount > 1 && (
                <Flex justifyContent="flex-end" padding={4}>
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={t("works.deleteTitle", "Delete work")}
        message={t(
          "works.deleteMessage",
          "This will permanently remove the work from the catalog."
        )}
        confirmLabel={t("common.delete", "Delete")}
        variant="danger"
        isLoading={isMutating}
      />
    </Main>
  )
}
