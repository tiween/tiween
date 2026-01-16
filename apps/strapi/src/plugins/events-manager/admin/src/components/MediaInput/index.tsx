/**
 * MediaInput Component
 *
 * A simplified media picker for Strapi v5 that displays previews
 * and allows selecting/removing images via URL input or direct upload.
 *
 * Note: The full Media Library dialog integration requires additional
 * setup in Strapi v5. This simplified version provides basic functionality.
 */

import { useCallback, useState } from "react"
import {
  Box,
  Button,
  Field,
  Flex,
  IconButton,
  Modal,
  TextInput,
  Typography,
} from "@strapi/design-system"
import { Image, Pencil, Plus, Trash } from "@strapi/icons"

/** Media asset from Strapi */
export interface MediaAsset {
  id: number
  documentId?: string
  name: string
  url: string
  mime: string
  width?: number
  height?: number
  formats?: {
    thumbnail?: { url: string }
    small?: { url: string }
    medium?: { url: string }
  }
}

interface MediaInputProps {
  /** Current value (single asset or array) */
  value: MediaAsset | MediaAsset[] | null
  /** Change handler */
  onChange: (value: MediaAsset | MediaAsset[] | null) => void
  /** Allow multiple files */
  multiple?: boolean
  /** Allowed file types */
  allowedTypes?: ("images" | "videos" | "files" | "audios")[]
  /** Label for the field */
  label?: string
  /** Disabled state */
  disabled?: boolean
}

export function MediaInput({
  value,
  onChange,
  multiple = false,
  allowedTypes = ["images"],
  label,
  disabled = false,
}: MediaInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  // Normalize value to array
  const selectedAssets: MediaAsset[] = value
    ? Array.isArray(value)
      ? value
      : [value]
    : []

  const handleRemoveAsset = useCallback(
    (assetId: number) => {
      if (multiple) {
        const filtered = selectedAssets.filter((a) => a.id !== assetId)
        onChange(filtered.length > 0 ? filtered : null)
      } else {
        onChange(null)
      }
    },
    [multiple, selectedAssets, onChange]
  )

  const handleAddFromUrl = useCallback(() => {
    if (!urlInput.trim()) return

    const newAsset: MediaAsset = {
      id: Date.now(), // Temporary ID
      name: urlInput.split("/").pop() || "image",
      url: urlInput,
      mime: "image/*",
    }

    if (multiple) {
      onChange([...selectedAssets, newAsset])
    } else {
      onChange(newAsset)
    }

    setUrlInput("")
    setIsModalOpen(false)
  }, [urlInput, multiple, selectedAssets, onChange])

  // Get preview URL for an asset
  const getPreviewUrl = (asset: MediaAsset) => {
    return (
      asset.formats?.thumbnail?.url || asset.formats?.small?.url || asset.url
    )
  }

  return (
    <Box>
      {label && (
        <Typography
          variant="pi"
          fontWeight="bold"
          textColor="neutral800"
          tag="label"
        >
          {label}
        </Typography>
      )}

      <Box marginTop={1}>
        {selectedAssets.length === 0 ? (
          // Empty state
          <Box
            background="neutral100"
            hasRadius
            padding={6}
            style={{
              border: "1px dashed var(--strapi-color-neutral300)",
              minHeight: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Flex direction="column" gap={2} alignItems="center">
              <Image width={32} height={32} fill="neutral500" />
              <Typography variant="pi" textColor="neutral600">
                {multiple ? "Aucune image sélectionnée" : "Aucune image"}
              </Typography>
              <Button
                variant="secondary"
                startIcon={<Plus />}
                onClick={() => setIsModalOpen(true)}
                disabled={disabled}
                size="S"
              >
                {multiple ? "Ajouter des images" : "Sélectionner une image"}
              </Button>
            </Flex>
          </Box>
        ) : multiple ? (
          // Multiple images grid
          <Box>
            <Flex wrap="wrap" gap={2}>
              {selectedAssets.map((asset) => (
                <Box
                  key={asset.id}
                  position="relative"
                  background="neutral100"
                  hasRadius
                  style={{
                    width: 100,
                    height: 100,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={getPreviewUrl(asset)}
                    alt={asset.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <Box
                    position="absolute"
                    style={{
                      top: 4,
                      right: 4,
                    }}
                  >
                    <IconButton
                      label="Supprimer"
                      onClick={() => handleRemoveAsset(asset.id)}
                      variant="secondary"
                      size="S"
                    >
                      <Trash />
                    </IconButton>
                  </Box>
                </Box>
              ))}
              {!disabled && (
                <Box
                  as="button"
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  background="neutral100"
                  hasRadius
                  style={{
                    width: 100,
                    height: 100,
                    border: "1px dashed var(--strapi-color-neutral300)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Flex direction="column" gap={1} alignItems="center">
                    <Plus width={20} height={20} />
                    <Typography variant="pi" textColor="neutral600">
                      Ajouter
                    </Typography>
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>
        ) : (
          // Single image preview
          <Box
            position="relative"
            background="neutral100"
            hasRadius
            style={{
              minHeight: 120,
              border: "1px dashed var(--strapi-color-neutral300)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={getPreviewUrl(selectedAssets[0])}
              alt={selectedAssets[0].name}
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                objectFit: "contain",
              }}
            />
            {!disabled && (
              <Flex position="absolute" gap={1} style={{ top: 8, right: 8 }}>
                <IconButton
                  label="Modifier"
                  onClick={() => setIsModalOpen(true)}
                  variant="secondary"
                >
                  <Pencil />
                </IconButton>
                <IconButton
                  label="Supprimer"
                  onClick={() => handleRemoveAsset(selectedAssets[0].id)}
                  variant="secondary"
                >
                  <Trash />
                </IconButton>
              </Flex>
            )}
          </Box>
        )}
      </Box>

      {/* URL Input Modal */}
      <Modal.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Ajouter une image</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Field.Root>
              <Field.Label>URL de l'image</Field.Label>
              <TextInput
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUrlInput(e.target.value)
                }
              />
              <Field.Hint>Entrez l'URL d'une image existante</Field.Hint>
            </Field.Root>
          </Modal.Body>
          <Modal.Footer>
            <Modal.Close>
              <Button variant="tertiary">Annuler</Button>
            </Modal.Close>
            <Button onClick={handleAddFromUrl} disabled={!urlInput.trim()}>
              Ajouter
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Box>
  )
}
