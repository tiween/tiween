/**
 * Namespace-BINDING guard for the labels that moved from server props to
 * client-side `useTranslations` (the RSC-serializability fix).
 *
 * `parameterizedLabelsI18n.test.tsx` proves the CATALOG is well-formed, but it
 * hardcodes the namespace strings, so it cannot see the component drift away
 * from them. Every component suite mocks next-intl outright, so it cannot
 * either. The gap is real and was demonstrated: rewriting
 * `useTranslations("home.bottomNav")` to a nonsense namespace left the entire
 * 1098-test suite green while every badge would render a raw key in the
 * browser.
 *
 * This suite closes it the only way that actually binds the two halves —
 * render the real component inside a real `NextIntlClientProvider` carrying the
 * real `fr` catalog, with NO next-intl mock, and assert the human-readable
 * French string appears. Change the namespace or the key in the component and
 * this goes red.
 */
import { EventCard } from "@/features/events/components/EventCard"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { describe, expect, it, vi } from "vitest"

import { BottomNav } from "@/components/layout/BottomNav"

import fr from "../../../../locales/fr.json"

// Purchase gate ON so the price line renders (Story 3.12); next/image needs a
// plain <img> in jsdom. next-intl itself is deliberately NOT mocked.
vi.mock("@/lib/feature-flags", () => ({
  isTicketPurchaseEnabled: () => true,
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider
      locale="fr"
      messages={fr}
      timeZone="Africa/Tunis"
      now={new Date("2026-01-01T00:00:00Z")}
    >
      {ui}
    </NextIntlClientProvider>
  )
}

describe("parameterized label namespace binding (real provider, no mock)", () => {
  it("BottomNav resolves both badge labels through `home.bottomNav`", () => {
    renderWithIntl(
      <BottomNav
        activeTab="home"
        ticketCount={3}
        accountBadgeCount={5}
        onNavigate={vi.fn()}
      />
    )

    // The real fr catalog strings — not a key echo.
    expect(screen.getByLabelText("3 billets non scannés")).toHaveTextContent(
      "3"
    )
    expect(screen.getByLabelText("5 notifications non lues")).toHaveTextContent(
      "5"
    )
  })

  it("EventCard resolves the price label through `events`", () => {
    renderWithIntl(
      <EventCard
        event={{
          documentId: "evt-1",
          title: "Test Event",
          category: "cinema",
          venue: "Test Venue",
          date: "2026-02-01",
          price: 25,
          currency: "TND",
        }}
        onClick={vi.fn()}
      />
    )

    // `events.priceFrom` is "À partir de {price}" in fr.
    expect(screen.getByText(/^À partir de /)).toBeInTheDocument()
  })
})
