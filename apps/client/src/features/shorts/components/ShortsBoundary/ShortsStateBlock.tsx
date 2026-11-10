import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * The gold Réessayer / "Voir tous les courts métrages" pill (DESIGN.md: full
 * pill, 48px, Gold Ink label, no shadow). The stock shadcn Button is 40px,
 * rounded-md and shadowed, so geometry is applied here. Focus is a 3px white
 * ring with a 2px field band, never a gold ring on a gold fill.
 */
export const SHORTS_PRIMARY_PILL_CLASS =
  "h-12 gap-2 rounded-full px-6 text-base font-bold shadow-none hover:bg-primary hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-foreground"

export interface ShortsStateBlockProps {
  /** A 48px icon element. Decorative: the headline always carries the meaning. */
  icon: React.ReactNode
  title: string
  /** `1` when the block is the only heading on the page, `2` under an h1. */
  headingLevel: 1 | 2
  body: string
  /** `alert` for failures; omit for plain content such as "introuvable". */
  role?: "alert"
  className?: string
  /** Actions below the copy. */
  children?: React.ReactNode
}

/**
 * Centered empty/error/not-found block for the shorts routes, built from the
 * shadcn `Empty` parts (UI-SPEC A5, C3): max 420px, 48px vertical padding, a
 * Title 18/700 headline and a Body 16 sentence. Callers pass the copy, so
 * this component never decides what an error says.
 */
export function ShortsStateBlock({
  icon,
  title,
  headingLevel,
  body,
  role,
  className,
  children,
}: ShortsStateBlockProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2"

  return (
    <Empty
      role={role}
      className={cn(
        "mx-auto w-full max-w-[420px] flex-none gap-6 px-0 py-12 md:px-0 md:py-12",
        className
      )}
    >
      <EmptyHeader className="max-w-none gap-2">
        <EmptyMedia className="mb-2">{icon}</EmptyMedia>
        <EmptyTitle>
          <Heading className="text-lg leading-[1.3] font-bold">{title}</Heading>
        </EmptyTitle>
        <EmptyDescription className="text-base leading-6">
          {body}
        </EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  )
}

ShortsStateBlock.displayName = "ShortsStateBlock"
