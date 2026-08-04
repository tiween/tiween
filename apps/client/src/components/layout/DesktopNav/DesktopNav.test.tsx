/**
 * Tests for the `DesktopNav` destinations (Story 6.4).
 *
 * The "Billets" item used to point at `/[locale]/auth/profile`; it must now
 * reach the real "Mes Billets" page. Nothing else asserted the hrefs, so that
 * destination could silently revert — this pins it.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { DesktopNav } from "./DesktopNav"

vi.mock("next-intl", () => ({
  useLocale: () => "fr",
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/fr",
}))

// Pulls in `lib/navigation`, which eagerly validates `env.mjs` (rejected under
// NODE_ENV=test); irrelevant to the nav destinations under test.
vi.mock("@/components/elementary/LocaleSwitcher", () => ({
  default: () => null,
}))

const labels = {
  home: "Accueil",
  search: "Recherche",
  tickets: "Mes Billets",
  account: "Mon Compte",
  navigation: "Navigation",
}

describe("DesktopNav destinations", () => {
  it("points the tickets item at /[locale]/tickets, not the profile", () => {
    render(<DesktopNav labels={labels} />)

    expect(screen.getByRole("link", { name: "Mes Billets" })).toHaveAttribute(
      "href",
      "/fr/tickets"
    )
  })

  it("keeps the account item on the profile page", () => {
    render(<DesktopNav labels={labels} />)

    expect(screen.getByRole("link", { name: "Mon Compte" })).toHaveAttribute(
      "href",
      "/fr/auth/profile"
    )
  })
})
