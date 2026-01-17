import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"
import { getRegions } from "@/lib/strapi-api/content/geography"

import { ProfilePageClient } from "./ProfilePageClient"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export const metadata: Metadata = {
  title: "Mon profil | Tiween",
  description: "Gérez votre profil et vos préférences sur Tiween",
  robots: { index: false, follow: false },
}

export default async function ProfilePage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    // Redirect to sign in with callback
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/auth/profile`)
  }

  // Fetch regions for preference selector
  const regions = await getRegions(locale)

  // Transform regions for ProfileForm
  const regionOptions = regions.map((region) => ({
    id: region.documentId,
    name: region.name,
  }))

  return (
    <ProfilePageClient
      locale={locale}
      regions={regionOptions}
      user={{
        id: session.user.userId,
        email: session.user.email || "",
        name: session.user.name || "",
      }}
    />
  )
}
