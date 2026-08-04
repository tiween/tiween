import { useTranslations } from "next-intl"

import type { TicketListLabels } from "@/features/tickets/components/TicketList"

/**
 * The `ticketing`-namespace translator, so the label builder can be shared by
 * the result page and the "Mes Billets" page without either importing the
 * other's component tree. Typed off `useTranslations` so a key typo is a
 * compile error, not a runtime fallback.
 */
export type TicketTranslator = ReturnType<typeof useTranslations<"ticketing">>

/**
 * Build the `TicketList` / `TicketQR` labels from the `ticketing` namespace
 * (Story 6.4). Every user-facing ticket string resolves here — no hardcoded
 * copy in the components.
 */
export function buildTicketListLabels(t: TicketTranslator): TicketListLabels {
  return {
    tickets: (count: number) => t("ticketCard.tickets", { count }),
    addToWallet: t("ticketCard.addToWallet"),
    share: t("ticketCard.share"),
    scanned: t("ticketCard.scanned"),
    scannedAt: t("ticketCard.scannedAt"),
    expired: t("ticketCard.expired"),
    offlineAvailable: t("ticketCard.offlineAvailable"),
    qrAlt: t("ticketCard.qrAlt"),
    qrPending: t("ticketCard.qrPending"),
    emptyTitle: t("myTickets.emptyTitle"),
    emptyDescription: t("myTickets.emptyDescription"),
  }
}
