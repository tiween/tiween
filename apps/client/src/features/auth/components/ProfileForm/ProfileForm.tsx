"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"

import type { AvatarUploadLabels } from "./AvatarUpload"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { AvatarUpload } from "./AvatarUpload"

/**
 * Supported languages
 */
export type Language = "ar" | "fr" | "en"

/**
 * Language option configuration
 */
const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
]

/**
 * Region option
 */
export interface Region {
  id: string
  name: string
}

/**
 * Profile form data
 */
export interface ProfileFormData {
  name: string
  email: string
  language: Language
  region?: string
  avatarUrl?: string
}

/**
 * Localized labels for ProfileForm
 */
export interface ProfileFormLabels {
  title: string
  name: string
  namePlaceholder: string
  email: string
  language: string
  region: string
  regionPlaceholder: string
  save: string
  saving: string
  avatar: AvatarUploadLabels
}

const defaultLabels: ProfileFormLabels = {
  title: "Mon profil",
  name: "Nom complet",
  namePlaceholder: "Votre nom",
  email: "Email",
  language: "Langue",
  region: "Région par défaut",
  regionPlaceholder: "Sélectionner une région",
  save: "Enregistrer",
  saving: "Enregistrement...",
  avatar: {
    change: "Changer",
    remove: "Supprimer",
    uploadHint: "JPG, PNG ou GIF. Max 2MB.",
  },
}

export interface ProfileFormProps {
  /** Initial form data */
  initialData: ProfileFormData
  /** Called when form is submitted */
  onSubmit: (data: ProfileFormData) => void
  /** Called when avatar file is selected */
  onAvatarChange?: (file: File) => void
  /** Show loading state */
  isLoading?: boolean
  /** Available regions for selection */
  regions?: Region[]
  /** Localized labels */
  labels?: ProfileFormLabels
  /** Additional class names */
  className?: string
}

/**
 * ProfileForm - User profile editing form
 *
 * Features:
 * - Avatar upload with preview
 * - Name input
 * - Email display (read-only)
 * - Language preference selector (AR/FR/EN)
 * - Region selector
 * - Save button with loading state
 * - Full RTL support
 *
 * @example
 * ```tsx
 * <ProfileForm
 *   initialData={{
 *     name: "Ahmed Ben Ali",
 *     email: "ahmed@example.com",
 *     language: "ar",
 *   }}
 *   onSubmit={async (data) => updateProfile(data)}
 *   onAvatarChange={(file) => uploadAvatar(file)}
 *   regions={regions}
 * />
 * ```
 */
export function ProfileForm({
  initialData,
  onSubmit,
  onAvatarChange,
  isLoading = false,
  regions = [],
  labels = defaultLabels,
  className,
}: ProfileFormProps) {
  // Form state
  const [name, setName] = useState(initialData.name)
  const [language, setLanguage] = useState<Language>(initialData.language)
  const [region, setRegion] = useState(initialData.region || "")
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const handleAvatarSelect = useCallback(
    (file: File) => {
      setAvatarFile(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onload = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      onAvatarChange?.(file)
    },
    [onAvatarChange]
  )

  const handleAvatarRemove = useCallback(() => {
    setAvatarUrl(undefined)
    setAvatarFile(null)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      const formData: ProfileFormData = {
        name,
        email: initialData.email, // Email is read-only
        language,
        region: region || undefined,
        avatarUrl,
      }

      onSubmit(formData)
    },
    [name, language, region, avatarUrl, initialData.email, onSubmit]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6", className)}
      noValidate
    >
      {/* Avatar upload */}
      <AvatarUpload
        avatarUrl={avatarUrl}
        onFileSelect={handleAvatarSelect}
        onRemove={handleAvatarRemove}
        disabled={isLoading}
        labels={labels.avatar}
      />

      {/* Name input */}
      <div className="space-y-2">
        <Label htmlFor="profile-name">{labels.name}</Label>
        <Input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={labels.namePlaceholder}
          disabled={isLoading}
          required
        />
      </div>

      {/* Email display (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="profile-email">{labels.email}</Label>
        <Input
          id="profile-email"
          type="email"
          value={initialData.email}
          disabled
          readOnly
          className="bg-muted"
        />
      </div>

      {/* Language selector */}
      <div className="space-y-2">
        <Label htmlFor="profile-language">{labels.language}</Label>
        <Select
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
          disabled={isLoading}
        >
          <SelectTrigger id="profile-language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Region selector (optional) */}
      {regions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="profile-region">{labels.region}</Label>
          <Select value={region} onValueChange={setRegion} disabled={isLoading}>
            <SelectTrigger id="profile-region">
              <SelectValue placeholder={labels.regionPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {labels.saving}
          </>
        ) : (
          labels.save
        )}
      </Button>
    </form>
  )
}

ProfileForm.displayName = "ProfileForm"
