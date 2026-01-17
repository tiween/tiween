"use client"

import * as React from "react"
import { Keyboard, Users, Zap, ZapOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ScannerViewfinder } from "./ScannerViewfinder"

/**
 * Event data for scanner dropdown
 */
export interface TicketScannerEvent {
  id: string
  title: string
  date: string
  scannedCount: number
  totalTickets: number
}

/**
 * Localized labels for TicketScanner
 */
export interface TicketScannerLabels {
  selectEvent: string
  scanned: string
  of: string
  flash: string
  manualEntry: string
  noEvents: string
}

const defaultLabels: TicketScannerLabels = {
  selectEvent: "Sélectionner l'événement",
  scanned: "Scannés",
  of: "sur",
  flash: "Flash",
  manualEntry: "Saisie manuelle",
  noEvents: "Aucun événement",
}

export interface TicketScannerProps {
  /** List of events available for scanning */
  events: TicketScannerEvent[]
  /** Currently selected event ID */
  selectedEventId?: string
  /** Called when event selection changes */
  onEventChange: (eventId: string) => void
  /** Called when QR code is scanned */
  onScan: (qrData: string) => void
  /** Called when manual entry button is pressed */
  onManualEntry: () => void
  /** Whether flash is currently on */
  isFlashOn?: boolean
  /** Called when flash toggle is pressed */
  onFlashToggle?: () => void
  /** Show placeholder for Storybook */
  showPlaceholder?: boolean
  /** Localized labels */
  labels?: TicketScannerLabels
  /** Additional class names */
  className?: string
}

/**
 * TicketScanner - Full-screen QR scanner interface for venue staff
 *
 * Features:
 * - Camera viewfinder with scan guide
 * - Event selector dropdown
 * - Attendance counter display
 * - Flash toggle button
 * - Manual entry fallback
 * - High contrast for dark venues
 * - Optimized for rapid scanning throughput
 *
 * Note: This component provides the UI shell. Actual QR scanning
 * is handled by a separate library (e.g., @yudiel/react-qr-scanner)
 * which renders into the viewfinder area.
 *
 * @example
 * ```tsx
 * <TicketScanner
 *   events={todayEvents}
 *   selectedEventId={selectedEvent.id}
 *   onEventChange={setSelectedEventId}
 *   onScan={handleQRScan}
 *   onManualEntry={() => setShowManualModal(true)}
 *   isFlashOn={flashEnabled}
 *   onFlashToggle={() => setFlashEnabled(!flashEnabled)}
 * />
 * ```
 */
export function TicketScanner({
  events,
  selectedEventId,
  onEventChange,
  onScan,
  onManualEntry,
  isFlashOn = false,
  onFlashToggle,
  showPlaceholder = false,
  labels = defaultLabels,
  className,
}: TicketScannerProps) {
  const selectedEvent = events.find((e) => e.id === selectedEventId)

  // Calculate percentage for progress indicator
  const scannedPercentage = selectedEvent
    ? Math.round(
        (selectedEvent.scannedCount / selectedEvent.totalTickets) * 100
      )
    : 0

  return (
    <div
      className={cn(
        // Full height container with dark background
        "bg-background flex min-h-screen flex-col",
        className
      )}
    >
      {/* Header: Event selector */}
      <div className="border-border bg-card border-b p-4">
        <Select value={selectedEventId} onValueChange={onEventChange}>
          <SelectTrigger className="w-full text-base">
            <SelectValue placeholder={labels.selectEvent} />
          </SelectTrigger>
          <SelectContent>
            {events.length === 0 ? (
              <div className="text-muted-foreground px-3 py-2 text-sm">
                {labels.noEvents}
              </div>
            ) : (
              events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {event.date}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Main: Camera viewfinder */}
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <ScannerViewfinder
          isScanning={!!selectedEventId}
          showPlaceholder={showPlaceholder}
          className="shadow-2xl"
        />

        {/* Scanning hint */}
        {selectedEventId && (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Placez le QR code dans le cadre
          </p>
        )}

        {!selectedEventId && (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Sélectionnez un événement pour commencer
          </p>
        )}
      </div>

      {/* Footer: Controls and counter */}
      <div className="border-border bg-card border-t p-4">
        {/* Attendance counter */}
        {selectedEvent && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground h-5 w-5" />
                <span className="text-muted-foreground text-sm">
                  {labels.scanned}
                </span>
              </div>
              <span className="font-mono text-lg font-bold">
                {selectedEvent.scannedCount}{" "}
                <span className="text-muted-foreground text-sm font-normal">
                  {labels.of} {selectedEvent.totalTickets}
                </span>
              </span>
            </div>
            {/* Progress bar */}
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${scannedPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Control buttons */}
        <div className="flex gap-3">
          {/* Flash toggle */}
          {onFlashToggle && (
            <Button
              type="button"
              variant={isFlashOn ? "default" : "outline"}
              size="lg"
              onClick={onFlashToggle}
              className="flex-1"
            >
              {isFlashOn ? (
                <Zap className="me-2 h-5 w-5" />
              ) : (
                <ZapOff className="me-2 h-5 w-5" />
              )}
              {labels.flash}
            </Button>
          )}

          {/* Manual entry */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onManualEntry}
            className={cn(onFlashToggle ? "flex-1" : "w-full")}
          >
            <Keyboard className="me-2 h-5 w-5" />
            {labels.manualEntry}
          </Button>
        </div>
      </div>
    </div>
  )
}

TicketScanner.displayName = "TicketScanner"
