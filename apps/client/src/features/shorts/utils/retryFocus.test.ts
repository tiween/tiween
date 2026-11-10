/**
 * retryFocus: the hand-off that returns focus to the page heading after a
 * successful retry from `shorts/error.tsx` (UI-SPEC C3 "Recovery").
 *
 * The error boundary marks a retry as pending; the heading of whichever page
 * renders next consumes it exactly once. A mark that nobody consumed expires,
 * so a heading that mounts much later is never yanked to.
 */
import { afterEach, describe, expect, it } from "vitest"

import {
  consumeRetryFocus,
  markRetryPending,
  resetRetryFocus,
  RETRY_FOCUS_TTL_MS,
} from "./retryFocus"

function makeHeading() {
  const heading = document.createElement("h1")
  heading.tabIndex = -1
  document.body.appendChild(heading)
  return heading
}

afterEach(() => {
  resetRetryFocus()
  document.body.innerHTML = ""
})

describe("retryFocus", () => {
  it("does nothing when no retry is pending", () => {
    const heading = makeHeading()

    expect(consumeRetryFocus(heading)).toBe(false)
    expect(document.activeElement).not.toBe(heading)
  })

  it("focuses the element once after a retry was marked, then clears", () => {
    const heading = makeHeading()
    markRetryPending(1_000)

    expect(consumeRetryFocus(heading, 2_000)).toBe(true)
    expect(document.activeElement).toBe(heading)

    heading.blur()
    expect(consumeRetryFocus(heading, 2_001)).toBe(false)
    expect(document.activeElement).not.toBe(heading)
  })

  it("expires a pending mark after 15 seconds", () => {
    const heading = makeHeading()
    markRetryPending(1_000)

    expect(RETRY_FOCUS_TTL_MS).toBe(15_000)
    expect(consumeRetryFocus(heading, 1_000 + RETRY_FOCUS_TTL_MS + 1)).toBe(
      false
    )
    expect(document.activeElement).not.toBe(heading)
  })

  it("still honours a mark exactly at the expiry boundary", () => {
    const heading = makeHeading()
    markRetryPending(1_000)

    expect(consumeRetryFocus(heading, 1_000 + RETRY_FOCUS_TTL_MS)).toBe(true)
  })

  it("clears an expired mark so a later fresh retry still works", () => {
    const heading = makeHeading()
    markRetryPending(1_000)
    consumeRetryFocus(heading, 100_000)

    markRetryPending(200_000)
    expect(consumeRetryFocus(heading, 200_010)).toBe(true)
  })

  it("accepts a null element (ref not attached yet) without throwing", () => {
    markRetryPending(1_000)

    expect(consumeRetryFocus(null, 1_001)).toBe(false)

    // The mark survives for the caller that does have an element.
    const heading = makeHeading()
    expect(consumeRetryFocus(heading, 1_002)).toBe(true)
  })
})
