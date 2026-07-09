"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AvatarUpload } from "@/features/auth/components/ProfileForm"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import * as z from "zod"

import type { UpdateProfileData } from "@/hooks/useUser"

import { useCurrentUser, useUserMutations } from "@/hooks/useUser"
import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { AppSelect } from "@/components/forms/AppSelect"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

/** Supported UI languages (display name = user's `username`, unchanged here). */
type Language = "ar" | "fr" | "en"

const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
]

export interface ProfileFormProps {
  /** Active UI locale — a post-save language switch redirects to it. */
  locale: string
  /** Regions available for the default-region preference. */
  regions: Array<{ id: string; name: string }>
  /** Session-derived fallbacks while the full profile is still loading. */
  user: { id: number; email: string; name: string }
}

/** Backend error codes → literal i18n keys (next-intl needs static keys). */
type ProfileErrorKey =
  | "errors.NAME_REQUIRED"
  | "errors.USERNAME_TAKEN"
  | "errors.INVALID_EMAIL"
  | "errors.EMAIL_TAKEN"
  | "errors.EMAIL_UNCHANGED"
  | "errors.unexpectedError"

function mapErrorToKey(message: string | undefined): ProfileErrorKey {
  if (!message) return "errors.unexpectedError"
  if (message.includes("USERNAME_TAKEN")) return "errors.USERNAME_TAKEN"
  if (message.includes("EMAIL_TAKEN")) return "errors.EMAIL_TAKEN"
  if (message.includes("EMAIL_UNCHANGED")) return "errors.EMAIL_UNCHANGED"
  if (message.includes("INVALID_EMAIL")) return "errors.INVALID_EMAIL"
  if (message.includes("NAME_REQUIRED")) return "errors.NAME_REQUIRED"
  return "errors.unexpectedError"
}

/**
 * ProfileForm (routed) — the wired, validated profile editor for `auth/profile`.
 *
 * - RHF + zod inline validation (`mode: "onBlur"`), self-scoped `PUT /users/me`.
 * - Avatar is uploaded file-only, then its id is threaded into the profile save
 *   (never linked via an upload `ref`, which performs no ownership check).
 * - Email is read-only; changing it goes through the verification sub-form
 *   (`POST /auth/change-email`), which only stages the change and emails the
 *   NEW address. Backend error CODES are mapped to `profile.errors.*`.
 *
 * Distinct from the presentational `features/auth/.../ProfileForm` (Storybook).
 */
export function ProfileForm({ locale, regions, user }: ProfileFormProps) {
  const t = useTranslations("profile")
  const router = useRouter()
  const { toast } = useToast()

  const { data: profile } = useCurrentUser(true)
  const {
    updateProfileMutation,
    uploadAvatarMutation,
    requestEmailChangeMutation,
  } = useUserMutations()

  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)
  const [showChangeEmail, setShowChangeEmail] = React.useState(false)

  const currentEmail = profile?.email ?? user.email

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    // `values` keeps the form in sync once the async profile resolves.
    values: {
      name: profile?.username ?? user.name ?? "",
      language: (profile?.preferredLanguage ?? locale) as Language,
      region: profile?.defaultRegion ?? "",
    },
  })

  const emailForm = useForm<ChangeEmailValues>({
    resolver: zodResolver(ChangeEmailSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: { email: "" },
  })

  const regionOptions = regions.map((r) => ({ label: r.name, value: r.id }))

  const isSaving =
    updateProfileMutation.isPending || uploadAvatarMutation.isPending

  async function onSubmit(values: ProfileFormValues) {
    // Upload a newly-selected avatar first, then thread its id into the save.
    let avatarId: number | undefined
    if (pendingAvatar) {
      try {
        avatarId = await uploadAvatarMutation.mutateAsync({
          file: pendingAvatar,
        })
      } catch {
        toast({
          variant: "destructive",
          description: t("errors.unexpectedError"),
        })
        return
      }
    }

    const data: UpdateProfileData = {
      username: values.name,
      preferredLanguage: values.language,
      defaultRegion: values.region || undefined,
      ...(avatarId != null ? { avatar: avatarId } : {}),
    }

    updateProfileMutation.mutate(data, {
      onSuccess: () => {
        setPendingAvatar(null)
        toast({ description: t("toast.saveSuccess") })
        // A language change re-routes so the whole app picks up the new locale.
        if (values.language !== locale) {
          router.push(`/${values.language}/auth/profile`)
        }
      },
      onError: (error) => {
        const message = error instanceof Error ? error.message : undefined
        toast({
          variant: "destructive",
          description: t(mapErrorToKey(message)),
        })
      },
    })
  }

  function onSubmitEmail(values: ChangeEmailValues) {
    requestEmailChangeMutation.mutate(
      { email: values.email },
      {
        onSuccess: () => {
          toast({ description: t("changeEmail.emailSent") })
          emailForm.reset()
          setShowChangeEmail(false)
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : undefined
          toast({
            variant: "destructive",
            description: t(mapErrorToKey(message)),
          })
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <AppForm form={form} onSubmit={onSubmit} id={profileFormName}>
        <AvatarUpload
          avatarUrl={profile?.avatar?.url}
          onFileSelect={(file) => setPendingAvatar(file)}
          onRemove={() => setPendingAvatar(null)}
          disabled={isSaving}
          labels={{
            change: t("avatar.change"),
            remove: t("avatar.remove"),
            uploadHint: t("avatar.uploadHint"),
          }}
        />

        <AppField
          name="name"
          type="text"
          required
          label={t("name")}
          placeholder={t("namePlaceholder")}
        />

        <AppSelect
          name="language"
          label={t("language")}
          options={languageOptions}
        />

        {regionOptions.length > 0 && (
          <AppSelect
            name="region"
            label={t("region")}
            placeholder={t("regionPlaceholder")}
            options={regionOptions}
          />
        )}
      </AppForm>

      <Button
        type="submit"
        form={profileFormName}
        className="w-full"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            {t("saving")}
          </>
        ) : (
          t("save")
        )}
      </Button>

      {/* Email — read-only display + verification-gated change sub-form. */}
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="profile-email">{t("email")}</Label>
          <Input
            id="profile-email"
            type="email"
            value={currentEmail}
            disabled
            readOnly
            className="bg-muted"
          />
        </div>

        {!showChangeEmail ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowChangeEmail(true)}
          >
            {t("changeEmail.trigger")}
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {t("changeEmail.description")}
            </p>
            <AppForm
              form={emailForm}
              onSubmit={onSubmitEmail}
              id={changeEmailFormName}
            >
              <AppField
                name="email"
                type="email"
                required
                label={t("changeEmail.newEmail")}
              />
            </AppForm>
            <div className="flex gap-2">
              <Button
                type="submit"
                form={changeEmailFormName}
                disabled={requestEmailChangeMutation.isPending}
              >
                {requestEmailChangeMutation.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("changeEmail.submit")}
                  </>
                ) : (
                  t("changeEmail.submit")
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowChangeEmail(false)
                  emailForm.reset()
                }}
              >
                {t("changeEmail.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

ProfileForm.displayName = "ProfileForm"

const ProfileFormSchema = z
  .object({
    name: z.string(),
    language: z.enum(["ar", "fr", "en"]),
    region: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        params: { type: "nameRequired" },
        path: ["name"],
      })
    }
  })

type ProfileFormValues = z.infer<typeof ProfileFormSchema>

const ChangeEmailSchema = z.object({
  email: z.string().min(1).email(),
})

type ChangeEmailValues = z.infer<typeof ChangeEmailSchema>

const profileFormName = "profileForm"
const changeEmailFormName = "changeEmailForm"
