import "@/styles/globals.css"

import { Metadata, Viewport } from "next"
import { notFound } from "next/navigation"
import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { fontInter, fontLalezar, fontNotoSansArabic } from "@/lib/fonts"
import { routing } from "@/lib/navigation"
import { cn } from "@/lib/styles"
import StrapiPreviewListener from "@/components/elementary/StrapiPreviewListener"
import { TailwindIndicator } from "@/components/elementary/TailwindIndicator"
import { ClientProviders } from "@/components/providers/ClientProviders"
import { ServerProviders } from "@/components/providers/ServerProviders"
import TrackingScripts from "@/components/providers/TrackingScripts"
import { Toaster } from "@/components/ui/toaster"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

const APP_NAME = "Tiween"
const APP_DEFAULT_TITLE = "Tiween - Online Ticketing"
const APP_TITLE_TEMPLATE = "%s | Tiween"
const APP_DESCRIPTION = "Discover cultural events in Tunisia"

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192x192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#032523",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = (await params) as { locale: Locale }

  // Enable static rendering
  // https://next-intl-docs.vercel.app/docs/getting-started/app-router/with-i18n-routing#static-rendering
  setRequestLocale(locale)

  if (!routing.locales.includes(locale)) {
    notFound()
  }

  // Determine text direction based on locale
  const dir = locale === "ar" ? "rtl" : "ltr"

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className="dark">
      <head />
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          fontInter.variable,
          fontLalezar.variable,
          fontNotoSansArabic.variable
        )}
      >
        <TrackingScripts />
        <ServerProviders>
          <StrapiPreviewListener />
          <ClientProviders>
            <div className="relative flex min-h-screen flex-col">
              {/* TODO: Add Tiween Navbar component */}

              <div className="flex-1">
                <div>{children}</div>
              </div>

              <TailwindIndicator />

              <Toaster />

              {/* TODO: Add Tiween Footer component */}
            </div>
          </ClientProviders>
        </ServerProviders>
      </body>
    </html>
  )
}
