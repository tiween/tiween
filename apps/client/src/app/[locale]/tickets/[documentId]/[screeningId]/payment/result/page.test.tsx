/**
 * Tests for the payment-result PAGE (Story 6.4).
 *
 * `ResultView.test.tsx` passes `viewOrderHref` in as a literal prop, so it can
 * never catch the page handing over the wrong destination. This asserts what
 * the page actually computes: after a payment settles, the CTA must lead to
 * "Mes Billets" — the acceptance criterion — not back to the homepage.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import PaymentResultPage from "./page"

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}))

// Purchase flag stubbed ON (Story 3.12): the page now guards with `notFound()`
// when purchases are disabled; this suite asserts the flag-on destinations.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => true,
}))

// Stand in for the client child: render the hrefs it was handed so they can be
// asserted without running the confirm effect.
vi.mock("./ResultView", () => ({
  ResultView: ({
    viewOrderHref,
    paymentHref,
  }: {
    viewOrderHref: string
    paymentHref: string
  }) => (
    <div>
      <span data-testid="view-order-href">{viewOrderHref}</span>
      <span data-testid="payment-href">{paymentHref}</span>
    </div>
  ),
}))

async function renderPage(locale: string) {
  const ui = await PaymentResultPage({
    params: Promise.resolve({
      locale: locale as never,
      documentId: "doc-1",
      screeningId: "scr-1",
    }),
    searchParams: Promise.resolve({ order: "TW-ABC-1234" }),
  })
  render(ui)
}

describe("PaymentResultPage destinations", () => {
  it.each(["fr", "ar", "en"])(
    "sends the success CTA to /%s/tickets",
    async (locale) => {
      await renderPage(locale)

      expect(screen.getByTestId("view-order-href")).toHaveTextContent(
        `/${locale}/tickets`
      )
    }
  )

  it("keeps the retry link on the payment step", async () => {
    await renderPage("fr")

    expect(screen.getByTestId("payment-href")).toHaveTextContent(
      "/fr/tickets/doc-1/scr-1/payment"
    )
  })
})
