/**
 * Purchase-gate tests for the checkout ROUTES, BOTH directions (Story 3.12).
 *
 * Flag OFF (the default): each of the three server components must call
 * `notFound()` BEFORE doing any work — the belt-and-braces layer under the
 * middleware rewrite — and no Strapi fetch may happen.
 *
 * Flag ON: the guard must be a no-op — the render proceeds into the real page
 * body (the event fetch is reached, `notFound` is not called by the gate), so
 * a guard degrading to an unconditional `notFound()` cannot pass unnoticed.
 */
import { describe, expect, it, vi } from "vitest"

import TicketsPage from "./page"
import PaymentPage from "./payment/page"
import PaymentResultPage from "./payment/result/page"

const { purchaseFlag, notFoundSpy, getEventSpy } = vi.hoisted(() => ({
  purchaseFlag: { enabled: false },
  notFoundSpy: vi.fn(() => {
    // Mirror Next's real behavior: `notFound()` throws, aborting the render.
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404")
  }),
  getEventSpy: vi.fn(),
}))

// The gate under test — mutable so both directions run on the same pages.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => purchaseFlag.enabled,
}))

vi.mock("next/navigation", () => ({ notFound: notFoundSpy }))

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}))

vi.mock("@/lib/strapi-api/content/server", () => ({
  getEventByDocumentId: getEventSpy,
}))

// Client children — mocked so importing/rendering the pages stays cheap.
vi.mock("./TicketTypesSection", () => ({ TicketTypesSection: () => null }))
vi.mock("./payment/PaymentStep", () => ({ PaymentStep: () => null }))
vi.mock("./payment/result/ResultView", () => ({ ResultView: () => null }))

const params = Promise.resolve({
  locale: "fr" as never,
  documentId: "doc-1",
  screeningId: "scr-1",
})

function reset(flagEnabled: boolean) {
  purchaseFlag.enabled = flagEnabled
  notFoundSpy.mockClear()
  getEventSpy.mockReset()
}

describe("purchase routes with the flag OFF", () => {
  it("ticket-selection page 404s without fetching the event", async () => {
    reset(false)
    await expect(TicketsPage({ params })).rejects.toThrow()
    expect(notFoundSpy).toHaveBeenCalled()
    expect(getEventSpy).not.toHaveBeenCalled()
  })

  it("payment page 404s without fetching the event", async () => {
    reset(false)
    await expect(PaymentPage({ params })).rejects.toThrow()
    expect(notFoundSpy).toHaveBeenCalled()
    expect(getEventSpy).not.toHaveBeenCalled()
  })

  it("payment result page 404s", async () => {
    reset(false)
    await expect(
      PaymentResultPage({
        params,
        searchParams: Promise.resolve({ order: "TW-ABC-1234" }),
      })
    ).rejects.toThrow()
    expect(notFoundSpy).toHaveBeenCalled()
  })
})

describe("purchase routes with the flag ON", () => {
  const eventFixture = {
    documentId: "doc-1",
    title: "Le Film",
    screenings: [
      { documentId: "scr-1", startDateTime: "2026-09-01T20:00:00.000Z" },
    ],
  }

  it("ticket-selection page renders through the gate (event fetch reached)", async () => {
    reset(true)
    getEventSpy.mockResolvedValue(eventFixture)

    await expect(TicketsPage({ params })).resolves.toBeTruthy()
    expect(notFoundSpy).not.toHaveBeenCalled()
    expect(getEventSpy).toHaveBeenCalledWith("doc-1", "fr")
  })

  it("payment page renders through the gate (event fetch reached)", async () => {
    reset(true)
    getEventSpy.mockResolvedValue(eventFixture)

    await expect(PaymentPage({ params })).resolves.toBeTruthy()
    expect(notFoundSpy).not.toHaveBeenCalled()
    expect(getEventSpy).toHaveBeenCalledWith("doc-1", "fr")
  })

  it("payment result page renders through the gate", async () => {
    reset(true)

    await expect(
      PaymentResultPage({
        params,
        searchParams: Promise.resolve({ order: "TW-ABC-1234" }),
      })
    ).resolves.toBeTruthy()
    expect(notFoundSpy).not.toHaveBeenCalled()
  })
})
