import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { expectNoA11yViolations } from "./axe"

/**
 * The violating fixture is injected as an HTML string on purpose: written as
 * JSX, `jsx-a11y/alt-text` would reject this file at lint time, and the point
 * here is to prove the runtime axe check catches what the static rule cannot
 * see in a rendered tree.
 */
function renderMarkup(html: string): HTMLElement {
  const { container } = render(<div data-testid="fixture" />)
  const host = container.firstElementChild as HTMLElement
  host.innerHTML = html
  return host
}

const IMAGE_WITHOUT_ALT = '<img src="/poster.jpg">'

describe("expectNoA11yViolations", () => {
  it("passes on a labelled button", async () => {
    const { container } = render(
      <button type="button">Add to my watchlist</button>
    )

    await expect(expectNoA11yViolations(container)).resolves.toBeUndefined()
  })

  it("rejects an image without alt text and names the rule", async () => {
    const container = renderMarkup(IMAGE_WITHOUT_ALT)

    await expect(expectNoA11yViolations(container)).rejects.toThrow(/image-alt/)
  })

  it("lists the impact and the offending HTML in the failure message", async () => {
    const container = renderMarkup(IMAGE_WITHOUT_ALT)

    await expect(expectNoA11yViolations(container)).rejects.toThrow(
      /\[critical\] image-alt[\s\S]*<img/
    )
  })

  it("lets a caller disable a rule", async () => {
    const container = renderMarkup(IMAGE_WITHOUT_ALT)

    await expect(
      expectNoA11yViolations(container, {
        rules: { "image-alt": { enabled: false } },
      })
    ).resolves.toBeUndefined()
  })
})
