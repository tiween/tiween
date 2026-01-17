"use client"

import * as React from "react"
import Image from "next/image"
import {
  Calendar,
  Check,
  Clock,
  MapPin,
  Share2,
  Ticket,
  Wallet,
  WifiOff,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * Ticket validation status
 */
export type TicketStatus = "valid" | "scanned" | "expired"

/**
 * Size variants for different contexts
 */
export type TicketQRSize = "small" | "large"

/**
 * Ticket data for QR display
 */
export interface TicketQRTicket {
  /** Unique ticket ID (e.g., "TIW-2024-XXXX") */
  id: string
  /** Data encoded in the QR code */
  qrData: string
  /** Event title */
  eventTitle: string
  /** Event date (formatted) */
  date: string
  /** Event time */
  time: string
  /** Venue name */
  venueName: string
  /** Number of tickets */
  quantity: number
  /** Validation status */
  status: TicketStatus
  /** When the ticket was scanned (if applicable) */
  scannedAt?: Date
}

/**
 * Localized labels for TicketQR
 */
export interface TicketQRLabels {
  tickets: (count: number) => string
  addToWallet: string
  share: string
  scanned: string
  scannedAt: string
  expired: string
  offlineAvailable: string
}

const defaultLabels: TicketQRLabels = {
  tickets: (count) => `${count} billet${count > 1 ? "s" : ""}`,
  addToWallet: "Ajouter au wallet",
  share: "Partager",
  scanned: "Scanné",
  scannedAt: "Scanné à",
  expired: "Événement passé",
  offlineAvailable: "Disponible hors ligne",
}

export interface TicketQRProps {
  /** Ticket data to display */
  ticket: TicketQRTicket
  /** Size variant */
  size?: TicketQRSize
  /** Whether device is offline */
  isOffline?: boolean
  /** Enable high brightness for better scanning */
  highBrightness?: boolean
  /** Called when "Add to Wallet" is clicked */
  onAddToWallet?: () => void
  /** Called when "Share" is clicked */
  onShare?: () => void
  /** Whether to show action buttons */
  showActions?: boolean
  /** Localized labels */
  labels?: TicketQRLabels
  /** Additional class names */
  className?: string
}

/**
 * Status-based styling
 */
const statusStyles: Record<TicketStatus, string> = {
  valid: "border-green-500 border-2",
  scanned: "opacity-70 border-muted",
  expired: "opacity-50 grayscale border-muted",
}

/**
 * QR code sizes based on variant
 */
const qrSizes: Record<TicketQRSize, { qr: number; container: string }> = {
  small: { qr: 120, container: "max-w-[200px]" },
  large: { qr: 200, container: "max-w-[320px]" },
}

/**
 * Format time for scanned display
 */
function formatScanTime(date: Date): string {
  return date.toLocaleTimeString("fr-TN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * TicketQR - QR code display for event tickets
 *
 * Features:
 * - Large, high-contrast QR code for scanning
 * - Ticket ID and event details
 * - Multiple states: valid (green border), scanned (checkmark), expired (dimmed)
 * - Size variants: small (list view) and large (detail view)
 * - High brightness mode for better scanning in dark venues
 * - Offline availability indicator
 * - Add to Wallet and Share buttons
 *
 * @example
 * ```tsx
 * <TicketQR
 *   ticket={{
 *     id: "TIW-2024-1234",
 *     qrData: "encoded-ticket-data",
 *     eventTitle: "Inception",
 *     date: "20/01/2024",
 *     time: "20:30",
 *     venueName: "Cinéma Le Palace",
 *     quantity: 2,
 *     status: "valid",
 *   }}
 *   size="large"
 *   showActions
 *   onShare={() => shareTicket()}
 * />
 * ```
 */
export function TicketQR({
  ticket,
  size = "large",
  isOffline = false,
  highBrightness = false,
  onAddToWallet,
  onShare,
  showActions = true,
  labels = defaultLabels,
  className,
}: TicketQRProps) {
  const { qr: qrSize, container: containerClass } = qrSizes[size]
  const isSmall = size === "small"

  return (
    <div
      className={cn(
        // Base styles
        "bg-card text-card-foreground relative rounded-lg border p-4",
        // Status-based styling
        statusStyles[ticket.status],
        // High brightness mode
        highBrightness && "bg-white",
        // Container width
        containerClass,
        className
      )}
    >
      {/* Offline badge */}
      {isOffline && ticket.status === "valid" && (
        <Badge
          variant="secondary"
          className="absolute start-1/2 -top-2 -translate-x-1/2"
        >
          <WifiOff className="me-1 h-3 w-3" />
          {labels.offlineAvailable}
        </Badge>
      )}

      {/* Scanned overlay */}
      {ticket.status === "scanned" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-black/60">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <span className="mt-2 text-lg font-semibold text-white">
            {labels.scanned}
          </span>
          {ticket.scannedAt && (
            <span className="text-sm text-white/80">
              {labels.scannedAt} {formatScanTime(ticket.scannedAt)}
            </span>
          )}
        </div>
      )}

      {/* Expired overlay */}
      {ticket.status === "expired" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/40">
          <Badge variant="secondary" className="text-base">
            {labels.expired}
          </Badge>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col items-center">
        {/* QR Code container */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-lg bg-white p-2",
            highBrightness && "brightness-110"
          )}
          style={{ width: qrSize + 16, height: qrSize + 16 }}
        >
          {/*
            Using a placeholder image for Storybook.
            In production, replace with QRCodeSVG from qrcode.react:
            <QRCodeSVG value={ticket.qrData} size={qrSize} level="H" />
          */}
          <Image
            src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(ticket.qrData)}`}
            alt={`QR code for ticket ${ticket.id}`}
            width={qrSize}
            height={qrSize}
            className="rounded"
            unoptimized // External URL, skip optimization
          />
        </div>

        {/* Ticket ID */}
        <span className="text-muted-foreground mt-3 font-mono text-sm">
          {ticket.id}
        </span>

        {/* Event details (larger view only) */}
        {!isSmall && (
          <>
            {/* Event title */}
            <h3 className="text-foreground mt-2 text-center text-lg font-semibold">
              {ticket.eventTitle}
            </h3>

            {/* Date, time, venue */}
            <div className="text-muted-foreground mt-2 space-y-1 text-center text-sm">
              <div className="flex items-center justify-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{ticket.date}</span>
                <span className="mx-1">•</span>
                <Clock className="h-4 w-4" />
                <span>{ticket.time}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{ticket.venueName}</span>
              </div>
            </div>

            {/* Ticket count */}
            <Badge variant="secondary" className="mt-3">
              <Ticket className="me-1 h-3 w-3" />
              {labels.tickets(ticket.quantity)}
            </Badge>
          </>
        )}

        {/* Small view - compact info */}
        {isSmall && (
          <div className="mt-2 text-center">
            <p className="text-foreground line-clamp-1 text-sm font-medium">
              {ticket.eventTitle}
            </p>
            <p className="text-muted-foreground text-xs">
              {ticket.date} • {ticket.time}
            </p>
          </div>
        )}

        {/* Action buttons (large view, valid status only) */}
        {showActions && !isSmall && ticket.status === "valid" && (
          <div className="mt-4 flex w-full gap-2">
            {onAddToWallet && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onAddToWallet}
              >
                <Wallet className="me-1 h-4 w-4" />
                {labels.addToWallet}
              </Button>
            )}
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onShare}
              >
                <Share2 className="me-1 h-4 w-4" />
                {labels.share}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

TicketQR.displayName = "TicketQR"
