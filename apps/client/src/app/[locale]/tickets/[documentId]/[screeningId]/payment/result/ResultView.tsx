"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { useOrderStatus } from "@/features/tickets/hooks/useOrderStatus"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { Button } from "@/components/ui/button"

export interface ResultViewProps {
  /** Order number from the `?order` query. */
  orderNumber: string | null
  /** Locale for building links. */
  locale: string
  /** Route back to the payment step for a retry. */
  paymentHref: string
  /** Where the "view my order" CTA points on success. */
  viewOrderHref: string
}

type ViewStatus = "loading" | "paid" | "failed" | "pending" | "verifying"

/**
 * ResultView — client child of the payment result route (Story 6.3).
 *
 * Triggers the idempotent reconciliation (`POST /orders/:orderNumber/confirm`)
 * and renders a MINIMAL status-driven outcome. The `?status` query is a hint
 * only — the confirmed status is authoritative and never trusted from the
 * redirect. Clears the selection store on success.
 *
 * Only a genuine `failed` reconcile (Konnect says the payment failed / no
 * charge) shows the "not charged" copy + a repay-retry link. Anything the
 * confirm cannot prove failed — a thrown confirm (network error), a missing
 * order number, or a non-terminal/unknown status — resolves to the NEUTRAL
 * `verifying` view, which never claims "not charged" and offers no repay button
 * (a repay path there is a double-charge trap for a buyer who actually paid).
 */
export function ResultView({
  orderNumber,
  paymentHref,
  viewOrderHref,
}: ResultViewProps) {
  const t = useTranslations("ticketing")
  const { confirmOrder } = useOrderStatus()
  const clearSelection = useTicketSelectionStore((s) => s.clear)

  const [status, setStatus] = React.useState<ViewStatus>(
    orderNumber ? "loading" : "verifying"
  )
  const ran = React.useRef(false)

  React.useEffect(() => {
    if (ran.current || !orderNumber) return
    ran.current = true

    let active = true
    void (async () => {
      try {
        const result = await confirmOrder(orderNumber)
        if (!active) return
        if (result.status === "paid") {
          setStatus("paid")
          clearSelection()
        } else if (result.status === "failed") {
          setStatus("failed")
        } else if (result.status === "pending") {
          setStatus("pending")
        } else {
          // not_found / refunded / unknown — cannot prove a failure, so stay
          // neutral (never claim "not charged", never offer a repay button).
          setStatus("verifying")
        }
      } catch {
        // A thrown confirm (e.g. network error) is NOT proof of no charge —
        // stay neutral and DO NOT clear the selection store.
        if (active) setStatus("verifying")
      }
    })()

    return () => {
      active = false
    }
  }, [orderNumber, confirmOrder, clearSelection])

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex flex-col items-center gap-3 py-12"
      >
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <p className="text-muted-foreground text-sm">{t("redirecting")}</p>
      </div>
    )
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-foreground text-xl font-bold">
          {t("paymentSuccessTitle")}
        </h2>
        {orderNumber && (
          <p className="text-muted-foreground text-sm">
            {t("orderNumberLabel")}: {orderNumber}
          </p>
        )}
        <Button asChild size="lg">
          <Link href={viewOrderHref}>{t("viewOrder")}</Link>
        </Button>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-foreground text-xl font-bold">
          {t("paymentPendingTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("paymentPendingDescription")}
        </p>
        {orderNumber && (
          <p className="text-muted-foreground text-sm">
            {t("orderNumberLabel")}: {orderNumber}
          </p>
        )}
      </div>
    )
  }

  if (status === "failed") {
    // Genuine failure (Konnect confirmed no charge) → safe to offer a repay.
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <h2 className="text-foreground text-xl font-bold">
          {t("paymentFailedTitle")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("paymentFailedDescription")}
        </p>
        <Button asChild size="lg">
          <Link href={paymentHref}>{t("retryPayment")}</Link>
        </Button>
      </div>
    )
  }

  // verifying (neutral) — cannot prove a failure. NEVER claims "not charged"
  // and offers NO repay-retry button (double-charge trap). Points to the order.
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <h2 className="text-foreground text-xl font-bold">
        {t("paymentVerifyingTitle")}
      </h2>
      <p className="text-muted-foreground text-sm">
        {t("paymentVerifyingDescription")}
      </p>
      {orderNumber && (
        <p className="text-muted-foreground text-sm">
          {t("orderNumberLabel")}: {orderNumber}
        </p>
      )}
      <Button asChild size="lg" variant="outline">
        <Link href={viewOrderHref}>{t("viewOrder")}</Link>
      </Button>
    </div>
  )
}

ResultView.displayName = "ResultView"
