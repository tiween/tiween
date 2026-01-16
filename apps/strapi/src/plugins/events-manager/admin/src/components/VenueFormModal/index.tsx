/**
 * VenueFormModal Component
 *
 * Modal form for creating and editing venues.
 * Organized into sections: Basic Info, Location, Contact, Details.
 */

import { useCallback, useEffect, useState } from "react"
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

import type { City } from "../../hooks/useGeography"
import type {
  Venue,
  VenueInput,
  VenueStatus,
  VenueType,
} from "../../hooks/useVenuesEnhanced"
import type { MediaAsset } from "../MediaInput"

import { useVenue, useVenueMutations } from "../../hooks/useVenuesEnhanced"
import { CitySelector } from "../CitySelector"
import { MediaInput } from "../MediaInput"

interface VenueFormModalProps {
  /** Venue to edit (null for create mode) */
  venue: Venue | null
  /** Modal open state */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Success handler (after save) */
  onSuccess: () => void
}

interface FormData {
  name: string
  slug: string
  description: string
  type: VenueType | ""
  status: VenueStatus
  address: string
  cityId: number | null
  latitude: string
  longitude: string
  phone: string
  email: string
  website: string
  capacity: string
  logo: MediaAsset | null
  images: MediaAsset[]
}

const initialFormData: FormData = {
  name: "",
  slug: "",
  description: "",
  type: "",
  status: "pending",
  address: "",
  cityId: null,
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  website: "",
  capacity: "",
  logo: null,
  images: [],
}

const TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: "cinema", label: "Cinéma" },
  { value: "theater", label: "Théâtre" },
  { value: "cultural-center", label: "Centre culturel" },
  { value: "museum", label: "Musée" },
  { value: "other", label: "Autre" },
]

const STATUS_OPTIONS: { value: VenueStatus; label: string }[] = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvé" },
  { value: "suspended", label: "Suspendu" },
]

/** Generate slug from name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function VenueFormModal({
  venue,
  isOpen,
  onClose,
  onSuccess,
}: VenueFormModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  )
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const { createVenue, updateVenue, isLoading } = useVenueMutations()

  const isEditMode = !!venue

  // Populate form when editing
  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || "",
        slug: venue.slug || "",
        description: venue.description || "",
        type: venue.type || "",
        status: venue.status || "pending",
        address: venue.address || "",
        cityId: venue.cityRef?.id || null,
        latitude: venue.latitude?.toString() || "",
        longitude: venue.longitude?.toString() || "",
        phone: venue.phone || "",
        email: venue.email || "",
        website: venue.website || "",
        capacity: venue.capacity?.toString() || "",
        logo: venue.logo
          ? {
              id: venue.logo.id,
              name: "logo",
              url: venue.logo.url,
              mime: "image/*",
              formats: venue.logo.formats,
            }
          : null,
        images:
          venue.images?.map((img) => ({
            id: img.id,
            name: "image",
            url: img.url,
            mime: "image/*",
          })) || [],
      })
      setSlugManuallyEdited(true) // Don't auto-generate slug when editing
    } else {
      setFormData(initialFormData)
      setSlugManuallyEdited(false)
    }
    setErrors({})
  }, [venue, isOpen])

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (value: string) => {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: slugManuallyEdited ? prev.slug : generateSlug(value),
      }))
    },
    [slugManuallyEdited]
  )

  const handleSlugChange = useCallback((value: string) => {
    setSlugManuallyEdited(true)
    setFormData((prev) => ({ ...prev, slug: generateSlug(value) }))
  }, [])

  const handleChange = useCallback(
    (field: keyof FormData) => (value: string | number | null) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    },
    []
  )

  const handleCityChange = useCallback(
    (cityId: number | null, city: City | null) => {
      setFormData((prev) => ({ ...prev, cityId }))
    },
    []
  )

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis"
    }

    if (!formData.type) {
      newErrors.type = "Le type est requis"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email invalide"
    }

    if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
      newErrors.latitude = "Latitude invalide"
    }

    if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
      newErrors.longitude = "Longitude invalide"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    const data: VenueInput = {
      name: formData.name.trim(),
      slug: formData.slug || generateSlug(formData.name),
      description: formData.description || undefined,
      type: (formData.type as VenueType) || undefined,
      status: formData.status,
      address: formData.address || undefined,
      cityRef: formData.cityId || undefined,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude
        ? parseFloat(formData.longitude)
        : undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : undefined,
      logo: formData.logo?.id || null,
      images: formData.images.map((img) => img.id),
    }

    let result: Venue | null = null

    if (isEditMode && venue) {
      result = await updateVenue(venue.documentId, data)
    } else {
      result = await createVenue(data)
    }

    if (result) {
      onSuccess()
    }
  }, [
    formData,
    validate,
    isEditMode,
    venue,
    createVenue,
    updateVenue,
    onSuccess,
  ])

  return (
    <Modal.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {isEditMode ? `Modifier ${venue?.name}` : "Nouveau lieu"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Flex direction="column" gap={6}>
            {/* Section: Basic Info */}
            <Box>
              <Typography variant="delta" fontWeight="bold" marginBottom={3}>
                Informations générales
              </Typography>
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root error={errors.name} required>
                    <Field.Label>Nom</Field.Label>
                    <TextInput
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleNameChange(e.target.value)
                      }
                      placeholder="Nom du lieu"
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>Slug</Field.Label>
                    <TextInput
                      value={formData.slug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSlugChange(e.target.value)
                      }
                      placeholder="slug-du-lieu"
                    />
                    <Field.Hint>Généré automatiquement</Field.Hint>
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root error={errors.type} required>
                    <Field.Label>Type</Field.Label>
                    <SingleSelect
                      value={formData.type}
                      onChange={(value: string) => handleChange("type")(value)}
                      placeholder="Sélectionner un type"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <SingleSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>Statut</Field.Label>
                    <SingleSelect
                      value={formData.status}
                      onChange={(value: string) =>
                        handleChange("status")(value as VenueStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <SingleSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </SingleSelectOption>
                      ))}
                    </SingleSelect>
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>

            {/* Section: Location */}
            <Box>
              <Typography variant="delta" fontWeight="bold" marginBottom={3}>
                Localisation
              </Typography>
              <Grid.Root gap={4}>
                <Grid.Item col={12}>
                  <Field.Root>
                    <Field.Label>Adresse</Field.Label>
                    <TextInput
                      value={formData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("address")(e.target.value)
                      }
                      placeholder="Adresse complète"
                    />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={12}>
                  <Field.Root>
                    <Field.Label>Ville</Field.Label>
                    <CitySelector
                      value={formData.cityId}
                      onChange={handleCityChange}
                    />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root error={errors.latitude}>
                    <Field.Label>Latitude</Field.Label>
                    <TextInput
                      value={formData.latitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("latitude")(e.target.value)
                      }
                      placeholder="36.8065"
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root error={errors.longitude}>
                    <Field.Label>Longitude</Field.Label>
                    <TextInput
                      value={formData.longitude}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("longitude")(e.target.value)
                      }
                      placeholder="10.1815"
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>

            {/* Section: Contact */}
            <Box>
              <Typography variant="delta" fontWeight="bold" marginBottom={3}>
                Contact
              </Typography>
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>Téléphone</Field.Label>
                    <TextInput
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("phone")(e.target.value)
                      }
                      placeholder="+216 XX XXX XXX"
                    />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root error={errors.email}>
                    <Field.Label>Email</Field.Label>
                    <TextInput
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("email")(e.target.value)
                      }
                      placeholder="contact@lieu.tn"
                    />
                    <Field.Error />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={12}>
                  <Field.Root>
                    <Field.Label>Site web</Field.Label>
                    <TextInput
                      value={formData.website}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("website")(e.target.value)
                      }
                      placeholder="https://www.lieu.tn"
                    />
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>

            {/* Section: Details */}
            <Box>
              <Typography variant="delta" fontWeight="bold" marginBottom={3}>
                Détails
              </Typography>
              <Grid.Root gap={4}>
                <Grid.Item col={12}>
                  <Field.Root>
                    <Field.Label>Description</Field.Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        handleChange("description")(e.target.value)
                      }
                      placeholder="Description du lieu..."
                    />
                  </Field.Root>
                </Grid.Item>

                <Grid.Item col={6} s={12}>
                  <Field.Root>
                    <Field.Label>Capacité</Field.Label>
                    <TextInput
                      type="number"
                      value={formData.capacity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleChange("capacity")(e.target.value)
                      }
                      placeholder="Nombre de places"
                    />
                  </Field.Root>
                </Grid.Item>
              </Grid.Root>
            </Box>

            {/* Section: Media */}
            <Box>
              <Typography variant="delta" fontWeight="bold" marginBottom={3}>
                Médias
              </Typography>
              <Grid.Root gap={4}>
                <Grid.Item col={6} s={12}>
                  <MediaInput
                    label="Logo"
                    value={formData.logo}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        logo: value as MediaAsset | null,
                      }))
                    }
                    multiple={false}
                    allowedTypes={["images"]}
                  />
                </Grid.Item>

                <Grid.Item col={12}>
                  <MediaInput
                    label="Images de la galerie"
                    value={formData.images}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        images: (value as MediaAsset[]) || [],
                      }))
                    }
                    multiple={true}
                    allowedTypes={["images"]}
                  />
                </Grid.Item>
              </Grid.Root>
            </Box>
          </Flex>
        </Modal.Body>

        <Modal.Footer>
          <Modal.Close>
            <Button variant="tertiary">Annuler</Button>
          </Modal.Close>
          <Button onClick={handleSubmit} loading={isLoading}>
            {isEditMode ? "Enregistrer" : "Créer"}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  )
}
