"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import { Camera, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Localized labels for AvatarUpload
 */
export interface AvatarUploadLabels {
  change: string
  remove: string
  uploadHint: string
}

const defaultLabels: AvatarUploadLabels = {
  change: "Changer",
  remove: "Supprimer",
  uploadHint: "JPG, PNG ou GIF. Max 2MB.",
}

export interface AvatarUploadProps {
  /** Current avatar URL (can be external URL or data URL for preview) */
  avatarUrl?: string
  /** Called when user selects a new file */
  onFileSelect: (file: File) => void
  /** Called when user removes the avatar */
  onRemove?: () => void
  /** Disable upload functionality */
  disabled?: boolean
  /** Localized labels */
  labels?: AvatarUploadLabels
  /** Additional class names */
  className?: string
}

/**
 * AvatarUpload - Profile picture upload with preview
 *
 * Features:
 * - Circular avatar display
 * - Click-to-upload functionality
 * - Preview before upload
 * - Remove button
 * - Fallback user icon
 *
 * @example
 * ```tsx
 * <AvatarUpload
 *   avatarUrl={user.avatarUrl}
 *   onFileSelect={(file) => setAvatarFile(file)}
 *   onRemove={() => setAvatarUrl(null)}
 * />
 * ```
 */
export function AvatarUpload({
  avatarUrl,
  onFileSelect,
  onRemove,
  disabled = false,
  labels = defaultLabels,
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Display preview URL if available, otherwise current avatar
  const displayUrl = previewUrl || avatarUrl

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith("image/")) {
        console.warn("Invalid file type:", file.type)
        return
      }

      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        console.warn("File too large:", file.size)
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Notify parent
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleRemove = useCallback(() => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onRemove?.()
  }, [onRemove])

  const triggerFileSelect = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Avatar display */}
      <div className="relative">
        <button
          type="button"
          onClick={triggerFileSelect}
          disabled={disabled}
          className={cn(
            "bg-muted relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full",
            "transition-opacity hover:opacity-80",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
          aria-label={labels.change}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="text-muted-foreground h-12 w-12" />
          )}

          {/* Camera overlay on hover */}
          {!disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-8 w-8 text-white" />
            </div>
          )}
        </button>

        {/* Remove button */}
        {displayUrl && onRemove && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemove}
            className="absolute -end-1 -top-1 h-6 w-6 rounded-full"
            aria-label={labels.remove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Upload hint */}
      <p className="text-muted-foreground text-center text-xs">
        {labels.uploadHint}
      </p>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  )
}

AvatarUpload.displayName = "AvatarUpload"
