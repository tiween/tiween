"use client"

import * as React from "react"
import { useMyEvents } from "@/features/venues/hooks/useVenueEvents"
import {
  extractVenueEventErrorCode,
  isVenueEventErrorCode,
} from "@/features/venues/schemas/venue-events"
import { CalendarPlus, Star } from "lucide-react"
import { useTranslations } from "next-intl"

import type { VenueEventListEntry } from "@/features/venues/schemas/venue-events"

import { formatVenueDate } from "@/lib/dates"
import { Link } from "@/lib/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * The manager's own events (Story 7.3): title, run dates, per-event
 * draft/published state, links to the preview and to `/venue/events/new`.
 * Every error arrives as a CODE and is translated — a raw code is never
 * rendered.
 */
export function VenueEventsList() {
  const t = useTranslations("venues.events")

  const { data: events, isLoading, isError, error } = useMyEvents()

  const translateCode = (code: string) =>
    t(`errors.${isVenueEventErrorCode(code) ? code : "INTERNAL_ERROR"}`)

  if (isLoading) {
    return (
      <div
        className="m-auto w-full max-w-[720px] animate-pulse space-y-4"
        data-testid="venue-events-skeleton"
      >
        {[0, 1, 2].map((row) => (
          <div key={row} className="bg-muted h-24 w-full rounded" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="m-auto w-full max-w-[720px]">
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {translateCode(extractVenueEventErrorCode(error))}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const list: VenueEventListEntry[] = events ?? []

  return (
    <div className="m-auto w-full max-w-[720px] space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("list.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("list.description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/venue/events/new">
            <CalendarPlus className="me-2 h-4 w-4" aria-hidden="true" />
            {t("buttons.newEvent")}
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        <Link className="underline" href="/venue/profile">
          {t("list.backToProfile")}
        </Link>
      </p>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("list.emptyTitle")}</CardTitle>
            <CardDescription>{t("list.emptyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/venue/events/new">{t("buttons.createFirst")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((event) => (
            <li key={event.documentId}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {event.featured ? (
                        <Star
                          className="h-4 w-4 shrink-0 text-amber-500"
                          aria-label={t("fields.featured")}
                        />
                      ) : null}
                      {event.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {event.startDateTime
                        ? formatVenueDate(event.startDateTime)
                        : ""}
                      {event.endDateTime
                        ? ` — ${formatVenueDate(event.endDateTime)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={event.isPublished ? "default" : "secondary"}
                      data-testid={`event-state-${event.documentId}`}
                    >
                      {event.isPublished
                        ? t("state.published")
                        : t("state.draft")}
                    </Badge>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/venue/events/${event.documentId}`}>
                        {t("buttons.preview")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

VenueEventsList.displayName = "VenueEventsList"
