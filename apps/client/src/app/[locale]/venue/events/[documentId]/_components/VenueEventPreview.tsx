"use client"

import * as React from "react"
import { EventDetailPage } from "@/features/events/components/EventDetailPage"
import {
  useMyEvent,
  useVenueEventMutations,
} from "@/features/venues/hooks/useVenueEvents"
import {
  extractVenueEventErrorCode,
  isVenueEventErrorCode,
  toPreviewStrapiEvent,
} from "@/features/venues/schemas/venue-events"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

/**
 * VenueEventPreview (Story 7.3): the authenticated draft read mapped to the
 * `StrapiEvent` wire shape and rendered by the PRODUCTION `EventDetailPage`
 * under a "draft preview" banner — the preview cannot drift from reality
 * because it IS the production renderer. The banner carries the explicit
 * Publish button (with confirmation); a pending venue's refusal surfaces as
 * the translated `VENUE_NOT_APPROVED` toast and the event stays draft.
 */
export function VenueEventPreview({ documentId }: { documentId: string }) {
  const t = useTranslations("venues.events")
  const { toast } = useToast()

  const { data: event, isLoading, isError, error } = useMyEvent(documentId)
  const { publishEventMutation } = useVenueEventMutations()

  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const translateCode = (code: string) =>
    t(`errors.${isVenueEventErrorCode(code) ? code : "INTERNAL_ERROR"}`)

  async function onPublish() {
    setConfirmOpen(false)
    try {
      await publishEventMutation.mutateAsync({ documentId })
      toast({ description: t("success.published") })
    } catch (err) {
      toast({
        variant: "destructive",
        description: translateCode(extractVenueEventErrorCode(err)),
      })
    }
  }

  if (isLoading) {
    return (
      <div
        className="container mx-auto animate-pulse space-y-4 px-4 py-10"
        data-testid="venue-event-preview-skeleton"
      >
        <div className="bg-muted h-8 w-64 rounded" />
        <div className="bg-muted h-64 w-full rounded" />
      </div>
    )
  }

  if (isError || !event) {
    const code = isError ? extractVenueEventErrorCode(error) : "EVENT_NOT_FOUND"
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="m-auto w-full max-w-[720px]">
          <CardHeader>
            <CardTitle>{t("preview.pageTitle")}</CardTitle>
            <CardDescription>{translateCode(code)}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isPublishing = publishEventMutation.isPending

  return (
    <div>
      {/* The draft-preview banner: state, publish action, way back. */}
      <div className="border-border bg-muted/50 border-b">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium" data-testid="preview-banner">
              {event.isPublished
                ? t("preview.publishedBanner")
                : t("preview.draftBanner")}
            </p>
            <p className="text-muted-foreground text-sm">
              {event.isPublished
                ? t("preview.publishedHint")
                : t("preview.draftHint")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/venue/events">{t("buttons.backToList")}</Link>
            </Button>
            {event.isPublished ? (
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {t("state.published")}
              </p>
            ) : (
              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={isPublishing}
                data-testid="publish-button"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t("buttons.publishing")}
                  </>
                ) : (
                  t("buttons.publish")
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* The production detail renderer, fed the draft projection. */}
      <EventDetailPage event={toPreviewStrapiEvent(event)} />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("publishConfirm.title")}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {t("publishConfirm.description")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              type="button"
              onClick={onPublish}
              data-testid="confirm-publish-button"
            >
              {t("buttons.confirmPublish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

VenueEventPreview.displayName = "VenueEventPreview"
