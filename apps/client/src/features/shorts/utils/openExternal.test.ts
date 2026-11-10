// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"

import { openExternal } from "./index"

describe("openExternal", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("opens a validated URL in a new tab without leaking the opener", () => {
    const clicked: HTMLAnchorElement[] = []
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push(this)
    })

    openExternal("https://example.com/film")

    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toBe("https://example.com/film")
    expect(clicked[0].target).toBe("_blank")
    expect(clicked[0].rel).toBe("noopener noreferrer")
  })

  it("never navigates the current tab, even though noopener makes window.open return null", () => {
    // `noopener` means window.open returns null by spec; that must not be read
    // as a blocked popup.
    vi.spyOn(window, "open").mockReturnValue(null)
    const before = window.location.href
    const errors = vi.spyOn(console, "error").mockImplementation(() => {})
    // jsdom reports an attempted non-hash navigation of the current window as a
    // "Not implemented: navigation" error; a new-tab open reports nothing.
    openExternal("https://example.com/film")

    expect(window.location.href).toBe(before)
    expect(
      errors.mock.calls.filter((c) => String(c[0]).includes("navigation"))
    ).toEqual([])
  })

  it("ignores unsafe or blank URLs", () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {})

    openExternal("javascript:alert(1)")
    openExternal("")
    openExternal(null)

    expect(click).not.toHaveBeenCalled()
  })
})
