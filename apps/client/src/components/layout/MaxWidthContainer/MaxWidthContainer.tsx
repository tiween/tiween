import { cn } from "@/lib/utils"

interface MaxWidthContainerProps {
  children: React.ReactNode
  className?: string
  /** Removes horizontal padding */
  noPadding?: boolean
  /** Uses a narrower max-width (768px) for focused content like auth forms */
  narrow?: boolean
}

/**
 * MaxWidthContainer
 *
 * Constrains content width to 1280px (or 768px for narrow) and centers it.
 * Used as the primary wrapper for page content on desktop.
 */
export function MaxWidthContainer({
  children,
  className,
  noPadding = false,
  narrow = false,
}: MaxWidthContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        narrow ? "max-w-3xl" : "max-w-screen-xl",
        !noPadding && "px-4 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  )
}
