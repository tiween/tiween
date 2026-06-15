import { cn } from "@/lib/utils"

interface SidebarProps {
  children: React.ReactNode
  className?: string
  /** Title shown at top of sidebar */
  title?: string
  /** Makes sidebar sticky on desktop */
  sticky?: boolean
  /** Adds a border around the sidebar */
  bordered?: boolean
  /** Adds background color */
  filled?: boolean
}

/**
 * Sidebar
 *
 * A panel for secondary content like filters, navigation, or booking info.
 * Typically used within TwoColumnLayout or as a standalone filter panel.
 */
export function Sidebar({
  children,
  className,
  title,
  sticky = false,
  bordered = false,
  filled = false,
}: SidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        sticky && "lg:sticky lg:top-24 lg:self-start",
        bordered && "border-border/50 rounded-xl border",
        filled && "bg-secondary",
        (bordered || filled) && "p-4 lg:p-6",
        className
      )}
    >
      {title && (
        <h2 className="text-foreground mb-4 text-lg font-semibold lg:mb-6">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
