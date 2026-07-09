"use client"

import * as React from "react"
import { Copy } from "lucide-react"

import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { buildSocialShareLinks } from "../../utils"

export interface ShareDialogLabels {
  /** Dialog heading, e.g. "Partager via". */
  shareVia: string
  /** Copy-link button label. */
  copyLink: string
  /** Success toast shown after the URL is copied. */
  linkCopied: string
  /** Destructive toast shown when the clipboard write fails. */
  copyFailed: string
  /** WhatsApp deep-link label. */
  shareOnWhatsapp: string
  /** Facebook deep-link label. */
  shareOnFacebook: string
  /** Twitter/X deep-link label. */
  shareOnTwitter: string
}

export interface ShareDialogProps {
  /** Controlled open state. */
  open: boolean
  /** Open-state change handler (backdrop/escape/close). */
  onOpenChange: (open: boolean) => void
  /** Canonical absolute URL to share. */
  url: string
  /** Event title (used for the social deep-link text). */
  title: string
  /** Localized labels. */
  labels: ShareDialogLabels
}

/**
 * ShareDialog — the copy-to-clipboard + social deep-link fallback for the event
 * detail share flow (Story 3.10). Opened programmatically by `EventDetailPage`
 * when the Web Share API is unavailable (or a native share errors); it is NOT a
 * second visible share affordance — `FilmHero`'s Share2 button is the sole
 * trigger.
 *
 * Controlled (`open`/`onOpenChange`). Copy uses `navigator.clipboard.writeText`
 * and confirms with a toast; a clipboard failure surfaces a destructive toast
 * and never throws. Social links open in a new tab with `rel="noopener
 * noreferrer"` and URL-encoded parameters.
 */
export function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  labels,
}: ShareDialogProps) {
  const socialLinks = React.useMemo(
    () => buildSocialShareLinks({ url, title }),
    [url, title]
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: labels.linkCopied })
    } catch {
      // Clipboard can reject (permissions, insecure context) — surface an error
      // toast rather than throwing so the dialog stays usable.
      toast({ title: labels.copyFailed, variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{labels.shareVia}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={handleCopy}
          >
            <Copy className="me-2 h-4 w-4" />
            {labels.copyLink}
          </Button>

          <Button asChild variant="outline" className="justify-start">
            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              {labels.shareOnWhatsapp}
            </a>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <a
              href={socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              {labels.shareOnFacebook}
            </a>
          </Button>
          <Button asChild variant="outline" className="justify-start">
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
            >
              {labels.shareOnTwitter}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

ShareDialog.displayName = "ShareDialog"
