import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { NotificationsPageClient } from "./NotificationsPageClient"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export const metadata: Metadata = {
  title: "Notifications | Tiween",
  description: "Vos notifications de changement d'horaire sur Tiween",
  robots: { index: false, follow: false },
}

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect(
      `/${locale}/auth/signin?callbackUrl=/${locale}/auth/notifications`
    )
  }

  return <NotificationsPageClient locale={locale} />
}
