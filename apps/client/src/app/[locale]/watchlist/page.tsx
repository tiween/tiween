import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Locale } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { authOptions } from "@/lib/auth"

import { WatchlistPageClient } from "./WatchlistPageClient"

interface PageProps {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "watchlist" })

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  }
}

export default async function WatchlistPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // Check authentication
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    // Redirect to sign in with callback URL
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/watchlist`)
  }

  // The client component owns its copy via `useTranslations("watchlist")`.
  return <WatchlistPageClient locale={locale} />
}
