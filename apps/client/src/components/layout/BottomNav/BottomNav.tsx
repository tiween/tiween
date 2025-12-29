"use client"

import * as React from "react"
import { Home, Search, Ticket, User } from "lucide-react"

import { cn } from "@/lib/utils"

export type TabType = "home" | "search" | "tickets" | "account"

interface BottomNavTab {
  id: TabType
  label: string
  icon: React.ComponentType<{ className?: string }>
  ariaLabel: string
}

const tabs: BottomNavTab[] = [
  { id: "home", label: "Accueil", icon: Home, ariaLabel: "Accueil" },
  { id: "search", label: "Recherche", icon: Search, ariaLabel: "Rechercher" },
  { id: "tickets", label: "Billets", icon: Ticket, ariaLabel: "Mes billets" },
  { id: "account", label: "Compte", icon: User, ariaLabel: "Mon compte" },
]

export interface BottomNavProps {
  /** Currently active tab */
  activeTab: TabType
  /** Number of unscanned tickets to show as badge */
  ticketCount?: number
  /** Called when a tab is tapped */
  onNavigate: (tab: TabType) => void
  /** Additional class names */
  className?: string
}

export function BottomNav({
  activeTab,
  ticketCount = 0,
  onNavigate,
  className,
}: BottomNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="Navigation principale"
      className={cn(
        // Fixed positioning at bottom
        "fixed inset-x-0 bottom-0 z-50",
        // Height: 64px + safe area padding for iOS
        "h-16 pb-[env(safe-area-inset-bottom)]",
        // Background with backdrop blur
        "bg-background/95 backdrop-blur-md",
        // Border top
        "border-t border-border",
        // Hide on desktop (lg and above)
        "lg:hidden",
        className
      )}
    >
      <div className="flex h-full items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const showBadge = tab.id === "tickets" && ticketCount > 0

          return (
            <button
              key={tab.id}
              type="button"
              role="link"
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.ariaLabel}
              onClick={() => onNavigate(tab.id)}
              className={cn(
                // Size and centering - minimum 48x48px touch target
                "relative flex min-h-12 min-w-12 flex-col items-center justify-center",
                // Padding for tap target
                "px-4 py-2",
                // Transition for smooth color changes
                "transition-colors duration-150",
                // Focus styles
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                // Rounded for focus ring
                "rounded-lg"
              )}
            >
              {/* Icon */}
              <tab.icon
                className={cn(
                  "h-6 w-6 transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />

              {/* Label */}
              <span
                className={cn(
                  "mt-1 text-xs font-medium transition-colors duration-150",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {tab.label}
              </span>

              {/* Badge for ticket count */}
              {showBadge && (
                <span
                  className={cn(
                    "absolute top-1 ltr:right-2 rtl:left-2",
                    "flex h-5 min-w-5 items-center justify-center",
                    "rounded-full bg-destructive px-1.5",
                    "text-xs font-bold text-destructive-foreground"
                  )}
                  aria-label={`${ticketCount} billets non scannés`}
                >
                  {ticketCount > 99 ? "99+" : ticketCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

BottomNav.displayName = "BottomNav"
