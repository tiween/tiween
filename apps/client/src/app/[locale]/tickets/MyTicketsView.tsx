"use client"

import * as React from "react"
import { TicketList } from "@/features/tickets/components/TicketList"
import { useMyTickets } from "@/features/tickets/hooks/useMyTickets"
import { useOrderTickets } from "@/features/tickets/hooks/useOrderTickets"
import { listOrderAccess } from "@/features/tickets/utils/orderAccess"
import { toKnownTicketErrorCode } from "@/features/tickets/utils/ticketErrorCode"
import { buildTicketListLabels } from "@/features/tickets/utils/ticketLabels"
import { AlertCircle, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"

import type { TicketView } from "@/features/tickets/types"
import type { KnownTicketErrorCode } from "@/features/tickets/utils/ticketErrorCode"

export interface MyTicketsViewProps {
  locale: string
}

/** What one guest order read has settled on. */
interface GuestReadResult {
  tickets: TicketView[]
  errorCode: KnownTicketErrorCode | null
}

/**
 * Read one locally-stored guest order. Rendered as its own component because a
 * hook cannot be called in a loop — one child per stored order keeps the hook
 * order stable.
 *
 * Reports BOTH outcomes upward: a 403 from a stale/wrong stored token must
 * surface as an error, never as "you have no tickets".
 */
function GuestOrderTickets({
  orderNumber,
  accessToken,
  onSettled,
}: {
  orderNumber: string
  accessToken: string
  onSettled: (orderNumber: string, result: GuestReadResult) => void
}) {
  const { data, isError, error } = useOrderTickets(orderNumber, accessToken)

  React.useEffect(() => {
    if (isError) {
      onSettled(orderNumber, {
        tickets: [],
        errorCode: toKnownTicketErrorCode(error),
      })
      return
    }
    if (data) onSettled(orderNumber, { tickets: data, errorCode: null })
  }, [data, isError, error, orderNumber, onSettled])

  return null
}

/**
 * MyTicketsView — the minimal "Mes Billets" list (Story 6.4).
 *
 * Two sources, because guest checkout is a first-class path: a signed-in buyer
 * reads their tickets with the JWT (`useMyTickets`), a guest reads each order
 * this browser stored a token for (`useOrderTickets`). Both render through the
 * same flat `TicketList`.
 *
 * Deliberately minimal: grouping by event/date, the QR-preview interaction and
 * the "Historique" section are Story 6.6's job. What this page delivers is that
 * the bottom-nav "Billets" tab stops 404-ing and paid tickets are reachable in
 * one tap.
 */
export function MyTicketsView({ locale }: MyTicketsViewProps) {
  const t = useTranslations("ticketing")
  const { status: sessionStatus } = useSession()
  const isAuthenticated = sessionStatus === "authenticated"

  const {
    data: accountTickets,
    isLoading: isLoadingAccount,
    isError: isAccountError,
    error: accountError,
  } = useMyTickets()

  // localStorage is browser-only: read after mount so the server render and the
  // first client render agree.
  const [guestOrders, setGuestOrders] = React.useState<
    Array<{ orderNumber: string; accessToken: string }>
  >([])
  React.useEffect(() => {
    setGuestOrders(
      listOrderAccess().map(({ orderNumber, accessToken }) => ({
        orderNumber,
        accessToken,
      }))
    )
  }, [])

  const [guestResults, setGuestResults] = React.useState<
    Record<string, GuestReadResult>
  >({})
  const handleSettled = React.useCallback(
    (orderNumber: string, result: GuestReadResult) => {
      setGuestResults((prev) => {
        const previous = prev[orderNumber]
        if (
          previous &&
          previous.tickets === result.tickets &&
          previous.errorCode === result.errorCode
        ) {
          return prev
        }
        return { ...prev, [orderNumber]: result }
      })
    },
    []
  )

  const tickets = React.useMemo(() => {
    const byNumber = new Map<string, TicketView>()
    for (const ticket of accountTickets ?? []) {
      byNumber.set(ticket.ticketNumber, ticket)
    }
    // A guest order that was later linked to the account can appear in both
    // sources; key by ticket number so it is listed once.
    for (const result of Object.values(guestResults)) {
      for (const ticket of result.tickets) {
        if (!byNumber.has(ticket.ticketNumber)) {
          byNumber.set(ticket.ticketNumber, ticket)
        }
      }
    }
    return [...byNumber.values()]
  }, [accountTickets, guestResults])

  // A stored guest order that has not reported yet is still in flight. Without
  // this the empty state flashes before the first read resolves.
  const hasPendingGuestRead = guestOrders.some(
    (order) => !(order.orderNumber in guestResults)
  )

  // The session itself is a load-bearing input: until it resolves we do not even
  // know whether the account read will run.
  const isLoading =
    sessionStatus === "loading" ||
    (isAuthenticated && isLoadingAccount) ||
    hasPendingGuestRead

  // ANY failed read is an error the buyer must see — a 403 from a stale stored
  // token would otherwise make a paid order vanish behind "no tickets yet".
  const firstGuestErrorCode =
    Object.values(guestResults).find((result) => result.errorCode)?.errorCode ??
    null
  const errorCode: KnownTicketErrorCode | null = isAccountError
    ? toKnownTicketErrorCode(accountError)
    : firstGuestErrorCode
  const isError = errorCode !== null
  const errorMessage = errorCode ? t(`errors.${errorCode}`) : ""

  return (
    <div className="flex flex-col gap-4">
      {guestOrders.map((order) => (
        <GuestOrderTickets
          key={order.orderNumber}
          orderNumber={order.orderNumber}
          accessToken={order.accessToken}
          onSettled={handleSettled}
        />
      ))}

      {isLoading && tickets.length === 0 ? (
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center gap-3 py-12"
        >
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <p className="text-muted-foreground text-sm">
            {t("myTickets.loading")}
          </p>
        </div>
      ) : isError && tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertCircle
            className="text-muted-foreground h-8 w-8"
            aria-hidden="true"
          />
          <h2 className="text-foreground text-lg font-semibold">
            {t("myTickets.errorTitle")}
          </h2>
          <p className="text-muted-foreground text-sm">
            {/* The backend answers with a CODE; the copy lives here. */}
            {errorMessage}
          </p>
        </div>
      ) : (
        <>
          {isError && (
            // Some reads succeeded and some failed: list what we have, but never
            // let the failure pass unmentioned.
            <p role="alert" className="text-destructive text-center text-sm">
              {errorMessage}
            </p>
          )}
          <TicketList
            tickets={tickets}
            locale={locale}
            labels={buildTicketListLabels(t)}
          />
          {!isAuthenticated && (
            <p className="text-muted-foreground text-center text-sm">
              {t("myTickets.signInPrompt")}
            </p>
          )}
        </>
      )}
    </div>
  )
}

MyTicketsView.displayName = "MyTicketsView"
