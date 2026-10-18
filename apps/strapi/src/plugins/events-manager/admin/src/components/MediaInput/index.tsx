/**
 * MediaInput Component
 *
 * Media picker backed by Strapi's own media-library dialog (FR57).
 *
 * `@strapi/upload` registers that dialog in the admin shell as the
 * `media-library` component; Strapi's own WYSIWYG reads it the same way. Picking
 * or uploading there goes through the configured upload provider (ImageKit when
 * its keys are set, local disk otherwise) and yields real upload rows, so the
 * assets held here keep their real `id`, `url` and `formats`.
 *
 * There is deliberately no URL-paste path and no id is ever invented: an asset
 * can only come from the media library. When the dialog is not registered the
 * input renders a disabled control and says so rather than fabricating one.
 */

import { useCallback, useState } from "react"
import {
  Box,
  Button,
  Flex,
  IconButton,
  Typography,
} from "@strapi/design-system"
import { Image, Plus, Trash } from "@strapi/icons"
import { useStrapiApp } from "@strapi/strapi/admin"
import { styled } from "styled-components"

import { useCatalogT } from "../Catalog/i18n"

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

type AllowedType = "images" | "videos" | "files" | "audios"

interface MediaInputProps {
  /** Current value (single asset or array) */
  value: MediaAsset | MediaAsset[] | null
  /** Change handler */
  onChange: (value: MediaAsset | MediaAsset[] | null) => void
  /** Allow multiple files */
  multiple?: boolean
  /** Allowed file types */
  allowedTypes?: AllowedType[]
  /** Label for the field */
  label?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * A file as the media-library dialog hands it back. It carries the full upload
 * row (hash, size, provider, ...); only the fields in `MediaAsset` are kept.
 */
export interface MediaLibraryFile {
  id: number
  documentId?: string
  name: string
  url: string
  mime: string
  width?: number | null
  height?: number | null
  formats?: Record<string, { url?: string } | undefined> | null
  [key: string]: unknown
}

/** Props of the `media-library` dialog registered by `@strapi/upload`. */
interface MediaLibraryDialogProps {
  allowedTypes?: AllowedType[]
  onClose: () => void
  onSelectAssets: (files: MediaLibraryFile[]) => void
}

type MediaLibraryDialog = React.ComponentType<MediaLibraryDialogProps>

const EmptyFrame = styled(Flex)`
  min-height: 120px;
  border: 1px dashed ${({ theme }) => theme.colors.neutral300};
`

const AssetFrame = styled(Box)<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  overflow: hidden;
`

const AssetImage = styled.img<{ $fit: "cover" | "contain" }>`
  width: 100%;
  height: 100%;
  object-fit: ${({ $fit }) => $fit};
`

const RemoveSlot = styled(Box)`
  position: absolute;
  top: 4px;
  right: 4px;
`

const FORMAT_KEYS = ["thumbnail", "small", "medium"] as const

/**
 * Reduce an upload row to the `MediaAsset` the form stores. Everything not in
 * the interface (hash, size, provider, timestamps, other formats) is dropped,
 * so the saved payload never carries upload internals.
 */
export function toMediaAsset(file: MediaLibraryFile): MediaAsset {
  const asset: MediaAsset = {
    id: file.id,
    name: file.name,
    url: file.url,
    mime: file.mime,
  }

  if (file.documentId) asset.documentId = file.documentId
  if (typeof file.width === "number") asset.width = file.width
  if (typeof file.height === "number") asset.height = file.height

  const formats: NonNullable<MediaAsset["formats"]> = {}
  for (const key of FORMAT_KEYS) {
    const url = file.formats?.[key]?.url
    if (url) formats[key] = { url }
  }
  if (Object.keys(formats).length > 0) asset.formats = formats

  return asset
}

/** Append `incoming` to `current`, skipping ids already present. */
function mergeById(current: MediaAsset[], incoming: MediaAsset[]) {
  const seen = new Set(current.map((asset) => asset.id))
  const merged = [...current]
  for (const asset of incoming) {
    if (seen.has(asset.id)) continue
    seen.add(asset.id)
    merged.push(asset)
  }
  return merged
}

function previewUrl(asset: MediaAsset) {
  return asset.formats?.thumbnail?.url || asset.formats?.small?.url || asset.url
}

export function MediaInput({
  value,
  onChange,
  multiple = false,
  allowedTypes = ["images"],
  label,
  disabled = false,
}: MediaInputProps) {
  const t = useCatalogT()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const components = useStrapiApp(
    "MediaInput",
    (state: { components: Record<string, unknown> }) => state.components
  )
  const Dialog = components?.["media-library"] as MediaLibraryDialog | undefined

  const selectedAssets: MediaAsset[] = value
    ? Array.isArray(value)
      ? value
      : [value]
    : []

  const handleRemove = useCallback(
    (assetId: number) => {
      if (multiple) {
        onChange(selectedAssets.filter((asset) => asset.id !== assetId))
      } else {
        onChange(null)
      }
    },
    [multiple, selectedAssets, onChange]
  )

  const handleSelectAssets = useCallback(
    (files: MediaLibraryFile[]) => {
      const incoming = files.map(toMediaAsset)
      setIsDialogOpen(false)

      if (incoming.length === 0) return

      if (multiple) {
        onChange(mergeById(selectedAssets, incoming))
      } else {
        // The dialog always allows multi-select; a single-value input takes
        // the first asset.
        onChange(incoming[0])
      }
    },
    [multiple, selectedAssets, onChange]
  )

  const hasSingleAsset = !multiple && selectedAssets.length > 0
  const addLabel = hasSingleAsset
    ? t("media.replace", "Replace")
    : t("media.add", "Add from media library")

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
          <EmptyFrame
            background="neutral100"
            hasRadius
            padding={6}
            alignItems="center"
            justifyContent="center"
          >
            <Image width={32} height={32} fill="neutral500" />
          </EmptyFrame>
        ) : (
          <Flex wrap="wrap" gap={2}>
            {selectedAssets.map((asset) => (
              <AssetFrame
                key={asset.id}
                $size={multiple ? 100 : 160}
                background="neutral100"
                hasRadius
              >
                <AssetImage
                  src={previewUrl(asset)}
                  alt={asset.name}
                  $fit={multiple ? "cover" : "contain"}
                />
                <RemoveSlot>
                  <IconButton
                    label={t("media.remove", "Remove")}
                    onClick={() => handleRemove(asset.id)}
                    disabled={disabled}
                    variant="secondary"
                    size="S"
                  >
                    <Trash />
                  </IconButton>
                </RemoveSlot>
              </AssetFrame>
            ))}
          </Flex>
        )}
      </Box>

      <Flex gap={2} alignItems="center" marginTop={2}>
        <Button
          variant="secondary"
          startIcon={<Plus />}
          size="S"
          onClick={() => setIsDialogOpen(true)}
          disabled={disabled || !Dialog}
        >
          {addLabel}
        </Button>
        {!Dialog && (
          <Typography variant="pi" textColor="neutral600">
            {t("media.unavailable", "The media library is unavailable")}
          </Typography>
        )}
      </Flex>

      {Dialog && isDialogOpen && (
        <Dialog
          allowedTypes={allowedTypes}
          onClose={() => setIsDialogOpen(false)}
          onSelectAssets={handleSelectAssets}
        />
      )}
    </Box>
  )
}
