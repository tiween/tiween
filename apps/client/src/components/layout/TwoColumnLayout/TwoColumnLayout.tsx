import { cn } from "@/lib/utils"

interface TwoColumnLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  className?: string
  /** Sidebar position - end places it on the right in LTR, left in RTL */
  sidebarPosition?: "start" | "end"
  /** Sidebar width ratio (of 12 columns) */
  sidebarWidth?: 3 | 4 | 5
  /** Makes the sidebar sticky on scroll */
  stickySidebar?: boolean
  /** Gap between columns */
  gap?: "sm" | "md" | "lg" | "xl"
}

const gapClasses = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
  xl: "gap-12",
}

const sidebarWidthClasses = {
  3: {
    sidebar: "lg:col-span-3",
    main: "lg:col-span-9",
  },
  4: {
    sidebar: "lg:col-span-4",
    main: "lg:col-span-8",
  },
  5: {
    sidebar: "lg:col-span-5",
    main: "lg:col-span-7",
  },
}

/**
 * TwoColumnLayout
 *
 * Responsive layout with main content and sidebar.
 * On mobile, content stacks vertically (main first, then sidebar).
 * On desktop (lg+), displays as two columns.
 *
 * Supports RTL via logical positioning (start/end).
 */
export function TwoColumnLayout({
  children,
  sidebar,
  className,
  sidebarPosition = "end",
  sidebarWidth = 4,
  stickySidebar = false,
  gap = "lg",
}: TwoColumnLayoutProps) {
  const widthClasses = sidebarWidthClasses[sidebarWidth]

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-12",
        gapClasses[gap],
        className
      )}
    >
      {/* Main Content */}
      <main
        className={cn(
          widthClasses.main,
          sidebarPosition === "start" && "lg:order-2"
        )}
      >
        {children}
      </main>

      {/* Sidebar */}
      <aside
        className={cn(
          widthClasses.sidebar,
          sidebarPosition === "start" && "lg:order-1",
          stickySidebar && "lg:sticky lg:top-24 lg:self-start"
        )}
      >
        {sidebar}
      </aside>
    </div>
  )
}
