"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { ArrowLeft, Key, LogOut } from "lucide-react"
import { signOut } from "next-auth/react"

import type {
  Language,
  ProfileFormData,
  Region,
} from "@/features/auth/components/ProfileForm"

import { cn } from "@/lib/utils"
import { useCurrentUser, useUserMutations } from "@/hooks/useUser"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"

export interface ProfilePageClientProps {
  locale: string
  regions: Region[]
  user: {
    id: number
    email: string
    name: string
  }
}

/**
 * ProfilePageClient - Profile management page
 *
 * Features:
 * - View and edit profile (name, avatar)
 * - Set language preference
 * - Set default region
 * - Change password link
 * - Sign out button
 */
export function ProfilePageClient({
  locale,
  regions,
  user,
}: ProfilePageClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isRTL = locale === "ar"

  // Fetch full user profile
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUser(true)

  // Mutations
  const { updateProfileMutation, uploadAvatarMutation } = useUserMutations()

  // Pending avatar file
  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)

  // Build initial form data
  const initialData: ProfileFormData = React.useMemo(
    () => ({
      name: profile?.username || user.name,
      email: profile?.email || user.email,
      language: (profile?.preferredLanguage || locale) as Language,
      region: profile?.defaultRegion,
      avatarUrl: profile?.avatar?.url,
    }),
    [profile, user, locale]
  )

  // Handle form submit
  const handleSubmit = async (data: ProfileFormData) => {
    try {
      // Upload avatar if changed
      if (pendingAvatar) {
        await uploadAvatarMutation.mutateAsync({
          userId: user.id,
          file: pendingAvatar,
        })
        setPendingAvatar(null)
      }

      // Update profile
      await updateProfileMutation.mutateAsync({
        userId: user.id,
        data: {
          username: data.name,
          preferredLanguage: data.language,
          defaultRegion: data.region,
        },
      })

      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées.",
      })

      // If language changed, redirect to apply it
      if (data.language !== locale) {
        router.push(`/${data.language}/auth/profile`)
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour.",
        variant: "destructive",
      })
    }
  }

  // Handle avatar change
  const handleAvatarChange = (file: File) => {
    setPendingAvatar(file)
  }

  // Handle sign out
  const handleSignOut = () => {
    signOut({ callbackUrl: `/${locale}` })
  }

  const isUpdating =
    updateProfileMutation.isPending || uploadAvatarMutation.isPending

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Retour"
          >
            <ArrowLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
          </Button>
          <h1 className="text-foreground text-lg font-semibold">Mon profil</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 py-6">
        {isLoadingProfile ? (
          <ProfileFormSkeleton />
        ) : (
          <>
            <ProfileForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onAvatarChange={handleAvatarChange}
              isLoading={isUpdating}
              regions={regions}
            />

            <Separator className="my-6" />

            {/* Additional Actions */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => router.push(`/${locale}/auth/change-password`)}
              >
                <Key className="h-4 w-4" />
                Changer le mot de passe
              </Button>

              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/**
 * Loading skeleton for profile form
 */
function ProfileFormSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Avatar skeleton */}
      <div className="flex justify-center">
        <div className="bg-muted h-24 w-24 rounded-full" />
      </div>

      {/* Name field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-20 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Language field */}
      <div className="space-y-2">
        <div className="bg-muted h-4 w-16 rounded" />
        <div className="bg-muted h-10 w-full rounded" />
      </div>

      {/* Button */}
      <div className="bg-muted h-10 w-full rounded" />
    </div>
  )
}

ProfilePageClient.displayName = "ProfilePageClient"
