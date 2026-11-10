/**
 * ShortsPageIntro: the shared h1 + description, and the retry-focus claim that
 * lets a successful retry land on the heading (UI-SPEC C3).
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { markRetryPending, resetRetryFocus } from "../../utils/retryFocus"
import { ShortsPageIntro } from "./ShortsPageIntro"

afterEach(() => {
  cleanup()
  resetRetryFocus()
})

describe("ShortsPageIntro", () => {
  it("renders a focusable h1 and the description", () => {
    render(
      <ShortsPageIntro title="Courts métrages" description="Une phrase." />
    )

    const h1 = screen.getByRole("heading", {
      level: 1,
      name: "Courts métrages",
    })
    expect(h1).toHaveAttribute("tabindex", "-1")
    expect(screen.getByText("Une phrase.")).toBeInTheDocument()
  })

  it("takes focus on mount when a retry is pending", () => {
    markRetryPending()
    render(
      <ShortsPageIntro title="Courts métrages" description="Une phrase." />
    )

    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus()
  })

  it("leaves a pending retry alone when restoreFocus is false", () => {
    markRetryPending()
    render(
      <ShortsPageIntro
        title="Courts métrages"
        description="Une phrase."
        restoreFocus={false}
      />
    )

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus()
  })

  it("does not take focus when nothing is pending", () => {
    render(
      <ShortsPageIntro title="Courts métrages" description="Une phrase." />
    )

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveFocus()
  })
})
