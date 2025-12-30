"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface PageContainerProps {
  /** Content to render */
  children: React.ReactNode
  /** Whether to add bottom padding for BottomNav clearance */
  hasBottomNav?: boolean
  /** Max width constraint (default: 1280px) */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  /** Additional class names */
  className?: string
  /** Remove horizontal padding */
  noPadding?: boolean
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
}

export function PageContainer({
  children,
  hasBottomNav = true,
  maxWidth = "xl",
  className,
  noPadding = false,
}: PageContainerProps) {
  return (
    <main
      className={cn(
        // Max width and centering
        maxWidthClasses[maxWidth],
        "mx-auto",
        // Responsive padding: 16px mobile, 24px tablet+
        !noPadding && "px-4 md:px-6",
        // Top padding
        "pt-4",
        // Bottom padding for BottomNav clearance (64px + safe area)
        hasBottomNav && "pb-20 pb-[calc(64px+env(safe-area-inset-bottom))]",
        !hasBottomNav && "pb-4",
        // Minimum height
        "min-h-[calc(100vh-48px)]",
        className
      )}
    >
      {children}
    </main>
  )
}

PageContainer.displayName = "PageContainer"
