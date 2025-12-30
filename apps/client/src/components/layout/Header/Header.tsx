"use client"

import * as React from "react"
import Image from "next/image"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useLocale } from "next-intl"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import LocaleSwitcher from "@/components/elementary/LocaleSwitcher"

export interface HeaderProps {
  /** Optional title displayed in center */
  title?: string
  /** Show back button */
  showBackButton?: boolean
  /** Called when back button is clicked */
  onBack?: () => void
  /** Show language switcher */
  showLanguageSwitcher?: boolean
  /** Show logo */
  showLogo?: boolean
  /** Additional class names */
  className?: string
  /** Right side content slot */
  rightContent?: React.ReactNode
}

export function Header({
  title,
  showBackButton = false,
  onBack,
  showLanguageSwitcher = true,
  showLogo = true,
  className,
  rightContent,
}: HeaderProps) {
  const locale = useLocale()
  const isRTL = locale === "ar"

  // Arrow icon based on RTL
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  return (
    <header
      className={cn(
        // Sticky positioning
        "sticky top-0 z-40",
        // Height: 48px (space-12)
        "h-12",
        // Background
        "bg-background",
        // Border bottom
        "border-b border-border",
        // Flex layout
        "flex items-center justify-between",
        // Padding
        "px-4",
        className
      )}
    >
      {/* Left side: Back button or Logo */}
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={isRTL ? "رجوع" : "Retour"}
            className="h-10 w-10"
          >
            <BackArrow className="h-5 w-5" />
          </Button>
        )}
        {showLogo && !showBackButton && (
          <Image
            src="/images/logo.svg"
            alt="Tiween"
            width={82}
            height={23}
            priority
            className="h-6 w-auto"
          />
        )}
      </div>

      {/* Center: Optional title */}
      {title && (
        <h1 className="absolute inset-x-0 text-center text-base font-semibold text-foreground">
          {title}
        </h1>
      )}

      {/* Right side: Language switcher or custom content */}
      <div className="flex items-center gap-2">
        {rightContent}
        {showLanguageSwitcher && (
          <LocaleSwitcher locale={locale as "ar" | "fr" | "en"} />
        )}
      </div>
    </header>
  )
}

Header.displayName = "Header"
