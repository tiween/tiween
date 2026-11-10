import * as React from "react"

import { cn } from "@/lib/utils"

import { getInitials } from "../../utils"
import styles from "./ShortFilmDetail.module.css"

export interface InitialsDiscProps {
  /** The person's full name; the letters are derived from it. */
  name: string
  /** 40 for a crew row, 88 for the cast rail. */
  size: 40 | 88
  className?: string
}

/**
 * A person as two letters on a disc (D-12, D-21).
 *
 * The API exposes no person photos, so there is no image branch, and no
 * avatar library: this is a plain span. It is `aria-hidden` because the name
 * always sits beside it as text, so a screen reader would only hear the
 * letters twice.
 */
export function InitialsDisc({ name, size, className }: InitialsDiscProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        styles.initialsDisc,
        size === 88 ? styles.initialsDisc88 : styles.initialsDisc40,
        className
      )}
    >
      {getInitials(name)}
    </span>
  )
}
