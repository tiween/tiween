/**
 * ShortFilmCardSkeleton: loading and loaded cards share one 16px frame
 * (UI-SPEC B, Part F "Card"), and a skeleton never carries a heart.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ShortFilmCardSkeleton } from "./ShortFilmCardSkeleton"

afterEach(cleanup)

describe("ShortFilmCardSkeleton", () => {
  it("uses the 16px (rounded-2xl) radius of the loaded card", () => {
    const { container } = render(<ShortFilmCardSkeleton />)
    const frame = container.firstElementChild as HTMLElement

    expect(frame.className).toContain("rounded-2xl")
    expect(frame.className).not.toContain("rounded-lg")
    expect(frame.className).toContain("aspect-[2/3]")
  })

  it("renders no control, so no heart and no link", () => {
    render(<ShortFilmCardSkeleton />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
