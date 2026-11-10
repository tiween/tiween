"use client"

import * as React from "react"

import { consumeRetryFocus } from "../../utils/retryFocus"

export interface ShortsPageIntroProps {
  /** The page h1 ("Courts métrages"). */
  title: string
  /** One sentence, no call to action. */
  description: string
  /**
   * Whether this heading claims a pending retry focus on mount (UI-SPEC C3:
   * a successful retry lands focus on the h1). The real page keeps the
   * default. The error boundary and the loading skeleton pass `false`: neither
   * is where a retry ends, and a heading that took the mark there would steal
   * focus from the retry button or vanish before the page arrives.
   */
  restoreFocus?: boolean
  className?: string
}

/**
 * The `/shorts` page intro shared by the directory, its loading skeleton and
 * its error block, so the h1 and description never jump between states
 * (UI-SPEC C1, C3, C5; D-07).
 *
 * Heading 24/700 (`tabIndex -1` so a retry can focus it), then a Body 16
 * reading-weight description capped at 660px. Takes plain strings, so server
 * files can render it.
 */
export function ShortsPageIntro({
  title,
  description,
  restoreFocus = true,
  className,
}: ShortsPageIntroProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    if (restoreFocus) consumeRetryFocus(headingRef.current)
  }, [restoreFocus])

  return (
    <div className={className}>
      <h1
        ref={headingRef}
        id="shorts-page-title"
        tabIndex={-1}
        className="text-2xl leading-8 font-bold outline-none"
      >
        {title}
      </h1>
      <p className="text-muted-foreground mt-2 max-w-[660px] text-base leading-6">
        {description}
      </p>
    </div>
  )
}

ShortsPageIntro.displayName = "ShortsPageIntro"
