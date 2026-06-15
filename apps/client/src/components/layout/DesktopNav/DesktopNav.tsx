"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Ticket, User } from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import LocaleSwitcher from "@/components/elementary/LocaleSwitcher"

export type NavItemType = "home" | "search" | "tickets" | "account"

interface NavItem {
  id: NavItemType
  icon: React.ComponentType<{ className?: string }>
  href: string
}

export interface DesktopNavLabels {
  home: string
  search: string
  tickets: string
  account: string
  navigation: string
}

const defaultLabels: DesktopNavLabels = {
  home: "Accueil",
  search: "Recherche",
  tickets: "Mes Billets",
  account: "Mon Compte",
  navigation: "Navigation principale",
}

export interface DesktopNavProps {
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: DesktopNavLabels
  /** Number of unscanned tickets to show as badge */
  ticketCount?: number
}

/**
 * DesktopNav
 *
 * Horizontal top navigation bar for desktop screens (lg+).
 * Hidden on mobile where BottomNav is used instead.
 */
export function DesktopNav({
  className,
  labels = defaultLabels,
  ticketCount = 0,
}: DesktopNavProps) {
  const locale = useLocale()
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { id: "home", icon: Home, href: `/${locale}` },
    { id: "search", icon: Search, href: `/${locale}/search` },
    { id: "tickets", icon: Ticket, href: `/${locale}/auth/profile` },
    { id: "account", icon: User, href: `/${locale}/auth/profile` },
  ]

  const isActive = (href: string) => {
    if (href === `/${locale}`) {
      return pathname === `/${locale}` || pathname === `/${locale}/`
    }
    return pathname.startsWith(href)
  }

  return (
    <header
      className={cn(
        // Only show on desktop
        "hidden lg:flex",
        // Sticky positioning
        "sticky top-0 z-40",
        // Height
        "h-16",
        // Background
        "bg-background/95 backdrop-blur-md",
        // Border bottom
        "border-border border-b",
        // Layout
        "items-center justify-between",
        // Padding
        "px-8",
        className
      )}
    >
      {/* Logo */}
      <Link href={`/${locale}`} className="flex-shrink-0">
        <Image
          src="/images/logo.svg"
          alt="Tiween"
          width={100}
          height={28}
          priority
          className="h-7 w-auto"
        />
      </Link>

      {/* Navigation Links */}
      <nav
        role="navigation"
        aria-label={labels.navigation}
        className="flex items-center gap-1"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const label = labels[item.id]
          const active = isActive(item.href)
          const showBadge = item.id === "tickets" && ticketCount > 0

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                // Base styles
                "relative flex items-center gap-2 rounded-lg px-4 py-2.5",
                // Transitions
                "transition-colors duration-150",
                // Active/inactive states
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                // Focus styles
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>

              {/* Badge for ticket count */}
              {showBadge && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center",
                    "bg-destructive rounded-full px-1.5",
                    "text-destructive-foreground text-xs font-bold"
                  )}
                >
                  {ticketCount > 99 ? "99+" : ticketCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Right side: Language switcher */}
      <div className="flex items-center gap-4">
        <LocaleSwitcher locale={locale as "ar" | "fr" | "en"} />
      </div>
    </header>
  )
}

DesktopNav.displayName = "DesktopNav"
