"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

import type { TicketTypeListLabels } from "@/features/tickets/components"

import { useTicketTiers } from "@/features/tickets/hooks/useTicketTiers"
import { TicketTypeList } from "@/features/tickets/components"
import { EmptyState } from "@/components/common"
import { TicketCardSkeleton } from "@/components/common"

export interface TicketTypesSectionProps {
  /** The sub-event (screening/performance) documentId to load tiers for. */
  screeningId: string
}

/**
 * TicketTypesSection - client child of the tickets route (Story 6.1).
 *
 * Fetches a sub-event's ticket tiers with react-query (`useTicketTiers`) and
 * renders every async path: loading (skeletons), error (retryable state), empty
 * (no tiers), and the populated `TicketTypeList`. Labels come from the
 * `ticketing` next-intl namespace via `useTranslations` (kept client-side so no
 * functions cross the server/client boundary).
 */
export function TicketTypesSection({ screeningId }: TicketTypesSectionProps) {
  const t = useTranslations("ticketing")

  const { data, isLoading, isError, refetch } = useTicketTiers(screeningId)

  const listLabels: TicketTypeListLabels = {
    types: {
      standard: t("types.standard"),
      reduced: t("types.reduced"),
      vip: t("types.vip"),
    },
    remaining: (count: number) => t("remaining", { count }),
    soldOut: t("soldOut"),
    restrictionPrefix: t("restrictionPrefix"),
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
      >
        <TicketCardSkeleton size="small" />
        <TicketCardSkeleton size="small" />
        <TicketCardSkeleton size="small" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        variant="custom"
        title={t("errorTitle")}
        description={t("errorDescription")}
        primaryAction={{
          label: t("retry"),
          onClick: () => {
            void refetch()
          },
        }}
      />
    )
  }

  if (data.tiers.length === 0) {
    return (
      <EmptyState
        variant="custom"
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    )
  }

  return (
    <TicketTypeList
      tiers={data.tiers}
      currency={data.currency}
      labels={listLabels}
    />
  )
}

TicketTypesSection.displayName = "TicketTypesSection"
