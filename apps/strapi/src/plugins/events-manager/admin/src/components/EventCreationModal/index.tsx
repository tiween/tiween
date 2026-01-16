import { useState } from "react"
import {
  Box,
  Button,
  DatePicker,
  Flex,
  Grid,
  Modal,
  NumberInput,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  TimePicker,
  Typography,
} from "@strapi/design-system"
import { useFetchClient } from "@strapi/strapi/admin"
import { useMutation } from "@tanstack/react-query"

import type { MovieCardData } from "../MovieCard"

import { ContentSearchPanel } from "../ContentSearchPanel"

interface EventCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  venueId: string
  prefilledDate: Date
}

type ShowtimeFormat = "VOST" | "VF" | "VO" | "THREE_D" | "IMAX"
type Language = "ar" | "fr" | "en" | "other"
type Subtitles = "ar" | "fr" | "en" | "none"

interface FormData {
  selectedMovie: MovieCardData | null
  date: Date
  time: string
  format: ShowtimeFormat
  language: Language
  subtitles: Subtitles
  price: number | null
}

/**
 * Event Creation Modal
 *
 * Two-column modal for creating events:
 * - Left: Content search panel
 * - Right: Showtime configuration form
 */
const EventCreationModal = ({
  isOpen,
  onClose,
  onSuccess,
  venueId,
  prefilledDate,
}: EventCreationModalProps) => {
  const { post } = useFetchClient()

  const [formData, setFormData] = useState<FormData>({
    selectedMovie: null,
    date: prefilledDate,
    time: `${String(prefilledDate.getHours()).padStart(2, "0")}:${String(prefilledDate.getMinutes()).padStart(2, "0")}`,
    format: "VOST",
    language: "fr",
    subtitles: "none",
    price: null,
  })

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!formData.selectedMovie) {
        throw new Error("Please select a movie")
      }

      // Combine date and time
      const [hours, minutes] = formData.time.split(":").map(Number)
      const datetime = new Date(formData.date)
      datetime.setHours(hours, minutes, 0, 0)

      // Create event first
      const eventResponse = await post(
        "/content-manager/collection-types/plugin::events-manager.event",
        {
          data: {
            title: formData.selectedMovie.title,
            tmdbId: formData.selectedMovie.id,
            startDate: datetime.toISOString(),
            status: "scheduled",
            venue: venueId,
          },
        }
      )

      const eventId = eventResponse.data.data.id

      // Create showtime
      await post(
        "/content-manager/collection-types/plugin::events-manager.showtime",
        {
          data: {
            datetime: datetime.toISOString(),
            format: formData.format,
            language: formData.language,
            subtitles: formData.subtitles,
            price: formData.price,
            event: eventId,
            venue: venueId,
          },
        }
      )

      return eventResponse.data
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const handleMovieSelect = (movie: MovieCardData) => {
    setFormData((prev) => ({ ...prev, selectedMovie: movie }))
  }

  const handleSubmit = () => {
    createEventMutation.mutate()
  }

  const isFormValid = formData.selectedMovie !== null

  if (!isOpen) return null

  return (
    <Modal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Content style={{ maxWidth: 900, width: "90vw" }}>
        <Modal.Header>
          <Modal.Title>Create Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Grid.Root gap={6}>
            {/* Left Column: Content Search */}
            <Grid.Item col={6} s={12}>
              <Box>
                <Typography variant="delta" tag="h3" marginBottom={4}>
                  Select Content
                </Typography>
                <ContentSearchPanel
                  selectedMovie={formData.selectedMovie}
                  onMovieSelect={handleMovieSelect}
                />
              </Box>
            </Grid.Item>

            {/* Right Column: Showtime Configuration */}
            <Grid.Item col={6} s={12}>
              <Box>
                <Typography variant="delta" tag="h3" marginBottom={4}>
                  Configure Showtime
                </Typography>

                {formData.selectedMovie ? (
                  <Flex direction="column" gap={4}>
                    {/* Selected Movie Summary */}
                    <Box padding={3} background="neutral100" hasRadius>
                      <Flex gap={3}>
                        {formData.selectedMovie.posterUrl && (
                          <img
                            src={formData.selectedMovie.posterUrl}
                            alt={formData.selectedMovie.title}
                            style={{
                              width: 60,
                              height: 90,
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        )}
                        <Box>
                          <Typography variant="omega" fontWeight="bold">
                            {formData.selectedMovie.title}
                          </Typography>
                          {formData.selectedMovie.runtime && (
                            <Typography variant="pi" textColor="neutral600">
                              {Math.floor(formData.selectedMovie.runtime / 60)}h{" "}
                              {formData.selectedMovie.runtime % 60}m
                            </Typography>
                          )}
                        </Box>
                      </Flex>
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
                      <SingleSelectOption value="THREE_D">
                        3D
                      </SingleSelectOption>
                      <SingleSelectOption value="IMAX">IMAX</SingleSelectOption>
                    </SingleSelect>

                    {/* Language & Subtitles */}
                    <Flex gap={4}>
                      <Box style={{ flex: 1 }}>
                        <SingleSelect
                          label="Language"
                          value={formData.language}
                          onChange={(value: Language) =>
                            setFormData((prev) => ({
                              ...prev,
                              language: value,
                            }))
                          }
                        >
                          <SingleSelectOption value="fr">
                            French
                          </SingleSelectOption>
                          <SingleSelectOption value="ar">
                            Arabic
                          </SingleSelectOption>
                          <SingleSelectOption value="en">
                            English
                          </SingleSelectOption>
                          <SingleSelectOption value="other">
                            Other
                          </SingleSelectOption>
                        </SingleSelect>
                      </Box>
                      <Box style={{ flex: 1 }}>
                        <SingleSelect
                          label="Subtitles"
                          value={formData.subtitles}
                          onChange={(value: Subtitles) =>
                            setFormData((prev) => ({
                              ...prev,
                              subtitles: value,
                            }))
                          }
                        >
                          <SingleSelectOption value="none">
                            None
                          </SingleSelectOption>
                          <SingleSelectOption value="fr">
                            French
                          </SingleSelectOption>
                          <SingleSelectOption value="ar">
                            Arabic
                          </SingleSelectOption>
                          <SingleSelectOption value="en">
                            English
                          </SingleSelectOption>
                        </SingleSelect>
                      </Box>
                    </Flex>

                    {/* Price */}
                    <NumberInput
                      label="Price (MAD)"
                      placeholder="e.g. 70"
                      value={formData.price ?? undefined}
                      onValueChange={(value: number | undefined) =>
                        setFormData((prev) => ({
                          ...prev,
                          price: value ?? null,
                        }))
                      }
                    />
                  </Flex>
                ) : (
                  <Box
                    padding={8}
                    background="neutral100"
                    hasRadius
                    style={{ textAlign: "center" }}
                  >
                    <Typography textColor="neutral600">
                      Search and select a movie to configure the showtime
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid.Item>
          </Grid.Root>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">Cancel</Button>
          </Modal.Close>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            loading={createEventMutation.isPending}
          >
            Create Event
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  )
}

export { EventCreationModal }
