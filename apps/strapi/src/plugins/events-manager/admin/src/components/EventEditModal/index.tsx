import { useState } from "react"
import {
  Box,
  Button,
  DatePicker,
  Flex,
  Modal,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TimePicker,
  Typography,
} from "@strapi/design-system"
import { Trash } from "@strapi/icons"
import { useFetchClient } from "@strapi/strapi/admin"
import { useMutation } from "@tanstack/react-query"

import type { ShowtimeWithEvent } from "../../hooks/useShowtimes"

import { ConfirmDialog } from "../ConfirmDialog"

interface EventEditModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  showtime: ShowtimeWithEvent
}

type ShowtimeFormat = "VOST" | "VF" | "VO" | "THREE_D" | "IMAX"
type Language = "ar" | "fr" | "en" | "other"
type Subtitles = "ar" | "fr" | "en" | "none"

interface FormData {
  date: Date
  time: string
  format: ShowtimeFormat
  language: Language
  subtitles: Subtitles
  price: number | null
}

/**
 * Event Edit Modal
 *
 * Modal for editing existing showtime details.
 * Includes delete functionality with confirmation.
 */
const EventEditModal = ({
  isOpen,
  onClose,
  onSuccess,
  showtime,
}: EventEditModalProps) => {
  const { put, del } = useFetchClient()

  const showtimeDate = new Date(showtime.datetime)

  const [formData, setFormData] = useState<FormData>({
    date: showtimeDate,
    time: `${String(showtimeDate.getHours()).padStart(2, "0")}:${String(showtimeDate.getMinutes()).padStart(2, "0")}`,
    format: showtime.format,
    language: showtime.language,
    subtitles: showtime.subtitles,
    price: showtime.price ?? null,
  })

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteMode, setDeleteMode] = useState<"single" | "all">("single")

  const isRecurring = !!showtime.parentShowtimeId

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Combine date and time
      const [hours, minutes] = formData.time.split(":").map(Number)
      const datetime = new Date(formData.date)
      datetime.setHours(hours, minutes, 0, 0)

      await put(
        `/content-manager/collection-types/plugin::events-manager.showtime/${showtime.documentId}`,
        {
          data: {
            datetime: datetime.toISOString(),
            format: formData.format,
            language: formData.language,
            subtitles: formData.subtitles,
            price: formData.price,
          },
        }
      )
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (deleteMode === "single") {
        // Delete only this showtime
        await del(
          `/content-manager/collection-types/plugin::events-manager.showtime/${showtime.documentId}`
        )
      } else {
        // Delete all occurrences (parent and children)
        // This would require a custom API endpoint
        // For now, just delete this one
        await del(
          `/content-manager/collection-types/plugin::events-manager.showtime/${showtime.documentId}`
        )
      }
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false)
      onSuccess()
    },
  })

  const handleSubmit = () => {
    updateMutation.mutate()
  }

  const handleDelete = () => {
    setDeleteMode("single")
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteAll = () => {
    setDeleteMode("all")
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    deleteMutation.mutate()
  }

  if (!isOpen) return null

  return (
    <>
      <Modal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Modal.Content style={{ maxWidth: 500 }}>
          <Modal.Header>
            <Modal.Title>Edit Showtime</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Flex direction="column" gap={4}>
              {/* Event Info */}
              <Box padding={3} background="neutral100" hasRadius>
                <Typography variant="omega" fontWeight="bold">
                  {showtime.event?.title || "Untitled Event"}
                </Typography>
                {isRecurring && (
                  <Typography variant="pi" textColor="primary600">
                    🔄 This is a recurring showtime
                  </Typography>
                )}
              </Box>

              {/* Date & Time */}
              <Flex gap={4}>
                <Box style={{ flex: 1 }}>
                  <DatePicker
                    label="Date"
                    value={formData.date}
                    onChange={(date: Date) =>
                      setFormData((prev) => ({ ...prev, date }))
                    }
                  />
                </Box>
                <Box style={{ flex: 1 }}>
                  <TimePicker
                    label="Time"
                    value={formData.time}
                    onChange={(time: string) =>
                      setFormData((prev) => ({ ...prev, time }))
                    }
                    step={15}
                  />
                </Box>
              </Flex>

              {/* Format */}
              <SingleSelect
                label="Format"
                value={formData.format}
                onChange={(value: ShowtimeFormat) =>
                  setFormData((prev) => ({ ...prev, format: value }))
                }
              >
                <SingleSelectOption value="VOST">
                  VOST (Original with subtitles)
                </SingleSelectOption>
                <SingleSelectOption value="VF">
                  VF (French dubbed)
                </SingleSelectOption>
                <SingleSelectOption value="VO">
                  VO (Original version)
                </SingleSelectOption>
                <SingleSelectOption value="THREE_D">3D</SingleSelectOption>
                <SingleSelectOption value="IMAX">IMAX</SingleSelectOption>
              </SingleSelect>

              {/* Language & Subtitles */}
              <Flex gap={4}>
                <Box style={{ flex: 1 }}>
                  <SingleSelect
                    label="Language"
                    value={formData.language}
                    onChange={(value: Language) =>
                      setFormData((prev) => ({ ...prev, language: value }))
                    }
                  >
                    <SingleSelectOption value="fr">French</SingleSelectOption>
                    <SingleSelectOption value="ar">Arabic</SingleSelectOption>
                    <SingleSelectOption value="en">English</SingleSelectOption>
                    <SingleSelectOption value="other">Other</SingleSelectOption>
                  </SingleSelect>
                </Box>
                <Box style={{ flex: 1 }}>
                  <SingleSelect
                    label="Subtitles"
                    value={formData.subtitles}
                    onChange={(value: Subtitles) =>
                      setFormData((prev) => ({ ...prev, subtitles: value }))
                    }
                  >
                    <SingleSelectOption value="none">None</SingleSelectOption>
                    <SingleSelectOption value="fr">French</SingleSelectOption>
                    <SingleSelectOption value="ar">Arabic</SingleSelectOption>
                    <SingleSelectOption value="en">English</SingleSelectOption>
                  </SingleSelect>
                </Box>
              </Flex>

              {/* Price */}
              <NumberInput
                label="Price (MAD)"
                placeholder="e.g. 70"
                value={formData.price ?? undefined}
                onValueChange={(value: number | undefined) =>
                  setFormData((prev) => ({ ...prev, price: value ?? null }))
                }
              />

              {/* Delete Actions */}
              <Box padding={3} background="danger100" hasRadius marginTop={4}>
                <Flex direction="column" gap={2}>
                  <Typography variant="sigma" textColor="danger700">
                    Danger Zone
                  </Typography>
                  <Flex gap={2}>
                    <Button
                      variant="danger-light"
                      startIcon={<Trash />}
                      onClick={handleDelete}
                    >
                      Delete this showtime
                    </Button>
                    {isRecurring && (
                      <Button
                        variant="danger"
                        startIcon={<Trash />}
                        onClick={handleDeleteAll}
                      >
                        Delete all occurrences
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </Box>
            </Flex>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Cancel</Button>
            </Modal.Close>
            <Button onClick={handleSubmit} loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={
          deleteMode === "all" ? "Delete All Occurrences" : "Delete Showtime"
        }
        message={
          deleteMode === "all"
            ? "Are you sure you want to delete all occurrences of this recurring showtime? This action cannot be undone."
            : "Are you sure you want to delete this showtime? This action cannot be undone."
        }
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </>
  )
}

export { EventEditModal }
