"use client"

import * as React from "react"
import Link from "next/link"
import { TicketList } from "@/features/tickets/components/TicketList"
import {
  myTicketKeys,
  useMyTickets,
} from "@/features/tickets/hooks/useMyTickets"
import { useOrderStatus } from "@/features/tickets/hooks/useOrderStatus"
import { useOrderTickets } from "@/features/tickets/hooks/useOrderTickets"
import { useTicketSelectionStore } from "@/features/tickets/stores/ticketSelectionStore"
import { readOrderAccess } from "@/features/tickets/utils/orderAccess"
import { toKnownTicketErrorCode } from "@/features/tickets/utils/ticketErrorCode"
import { buildTicketListLabels } from "@/features/tickets/utils/ticketLabels"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

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
  locale,
  paymentHref,
  viewOrderHref,
}: ResultViewProps) {
  const t = useTranslations("ticketing")
  const { confirmOrder } = useOrderStatus()
  const clearSelection = useTicketSelectionStore((s) => s.clear)
  // Held in a ref so the confirm effect below does NOT list the client as a
  // dependency: a re-created client would tear down and re-run that effect,
  // whose `ran` guard then discards the in-flight confirm's result.
  const queryClient = useQueryClient()
  const queryClientRef = React.useRef(queryClient)
  React.useEffect(() => {
    queryClientRef.current = queryClient
  }, [queryClient])

  const [status, setStatus] = React.useState<ViewStatus>(
    orderNumber ? "loading" : "verifying"
  )
  const ran = React.useRef(false)

  // Story 6.4 — show the issued tickets on success. Two authorization paths:
  // a guest reads with the access token this browser stored before the Konnect
  // redirect; a signed-in buyer reads their own tickets via the JWT. Both
  // queries are `enabled`-gated, and neither runs until the payment is `paid`
  // (there is no QR before that).
  const [accessToken, setAccessToken] = React.useState<string | undefined>()
  React.useEffect(() => {
    // localStorage is browser-only — read after mount so SSR and the first
    // client render agree.
    if (orderNumber) {
      setAccessToken(readOrderAccess(orderNumber)?.accessToken)
    }
  }, [orderNumber])

  const isPaid = status === "paid"
  const guestTickets = useOrderTickets(
    isPaid ? orderNumber ?? undefined : undefined,
    accessToken
  )
  const accountTickets = useMyTickets()

  const tickets = React.useMemo(() => {
    if (!isPaid || !orderNumber) return []
    if (guestTickets.data?.length) return guestTickets.data
    return (accountTickets.data ?? []).filter(
      (ticket) => ticket.orderNumber === orderNumber
    )
  }, [isPaid, orderNumber, guestTickets.data, accountTickets.data])

  // A read that FAILED must never look like "this order has no tickets": a
  // stale stored token (403) or a 5xx would otherwise leave the buyer on a
  // success page with an order number and nothing else. Same rule as
  // "Mes Billets". Only shown when we actually have nothing to render.
  const readErrorCode =
    isPaid && tickets.length === 0
      ? guestTickets.isError
        ? toKnownTicketErrorCode(guestTickets.error)
        : accountTickets.isError
          ? toKnownTicketErrorCode(accountTickets.error)
          : null
      : null

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
          // The tickets this order just issued did not exist when the account
          // list was last fetched. `useMyTickets` has a 30s staleTime, so a
          // buyer who opened "Mes Billets" shortly before paying would be shown
          // the cached PRE-purchase list here and on the next page. Invalidate
          // the bare `["my-tickets"]` prefix so every user scope refetches.
          void queryClientRef.current.invalidateQueries({
            queryKey: myTicketKeys.all,
          })
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

        {tickets.length > 0 && (
          <TicketList
            tickets={tickets}
            locale={locale}
            labels={buildTicketListLabels(t)}
          />
        )}

        {readErrorCode && (
          // The backend answers with a CODE; the copy lives here.
          <p role="alert" className="text-destructive text-sm">
            {t(`errors.${readErrorCode}`)}
          </p>
        )}

        <Button asChild size="lg">
          <Link href={viewOrderHref}>{t("viewMyTickets")}</Link>
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
  // and offers NO repay-retry button (double-charge trap). `viewOrderHref` is
  // "Mes Billets" (Story 6.4), so the label must say so — "View my order" here
  // would promise an order page this app does not have.
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
        <Link href={viewOrderHref}>{t("viewMyTickets")}</Link>
      </Button>
    </div>
  )
}

ResultView.displayName = "ResultView"
