import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { TicketScannerEvent } from "./TicketScanner"

import { TicketScanner } from "./TicketScanner"

const meta: Meta<typeof TicketScanner> = {
  title: "Features/Scanner/TicketScanner",
  component: TicketScanner,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full-screen QR scanner interface for venue staff. Includes event selector, attendance counter, flash toggle, and manual entry fallback.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof TicketScanner>

// Sample events for stories
const sampleEvents: TicketScannerEvent[] = [
  {
    id: "evt-1",
    title: "Les Misérables - Le Concert",
    date: "16/01/2026 - 20:00",
    scannedCount: 127,
    totalTickets: 450,
  },
  {
    id: "evt-2",
    title: "Festival de Jazz de Tabarka",
    date: "17/01/2026 - 19:30",
    scannedCount: 0,
    totalTickets: 200,
  },
  {
    id: "evt-3",
    title: "Cinéma - Oppenheimer",
    date: "16/01/2026 - 22:00",
    scannedCount: 45,
    totalTickets: 50,
  },
]

/**
 * Interactive wrapper for stories
 */
function InteractiveScanner({
  events = sampleEvents,
  initialEventId,
}: {
  events?: TicketScannerEvent[]
  initialEventId?: string
}) {
  const [selectedEventId, setSelectedEventId] = useState(initialEventId)
  const [isFlashOn, setIsFlashOn] = useState(false)

  const handleScan = (qrData: string) => {
    console.log("Scanned QR:", qrData)
  }

  const handleManualEntry = () => {
    console.log("Manual entry requested")
  }

  return (
    <TicketScanner
      events={events}
      selectedEventId={selectedEventId}
      onEventChange={setSelectedEventId}
      onScan={handleScan}
      onManualEntry={handleManualEntry}
      isFlashOn={isFlashOn}
      onFlashToggle={() => setIsFlashOn(!isFlashOn)}
      showPlaceholder
    />
  )
}

/**
 * Default scanner with no event selected
 */
export const Default: Story = {
  render: () => <InteractiveScanner />,
}

/**
 * Scanner ready with event selected
 */
export const ScannerReady: Story = {
  render: () => <InteractiveScanner initialEventId="evt-1" />,
}

/**
 * Event nearly sold out
 */
export const NearlySoldOut: Story = {
  render: () => <InteractiveScanner initialEventId="evt-3" />,
}

/**
 * New event with no scans yet
 */
export const NoScansYet: Story = {
  render: () => <InteractiveScanner initialEventId="evt-2" />,
}

/**
 * No events available
 */
export const NoEvents: Story = {
  render: () => <InteractiveScanner events={[]} />,
}

/**
 * Flash enabled
 */
export const FlashOn: Story = {
  render: () => {
    const [isFlashOn, setIsFlashOn] = useState(true)

    return (
      <TicketScanner
        events={sampleEvents}
        selectedEventId="evt-1"
        onEventChange={() => {}}
        onScan={() => {}}
        onManualEntry={() => {}}
        isFlashOn={isFlashOn}
        onFlashToggle={() => setIsFlashOn(!isFlashOn)}
        showPlaceholder
      />
    )
  },
}

/**
 * Without flash toggle (device doesn't support flash)
 */
export const NoFlashSupport: Story = {
  render: () => (
    <TicketScanner
      events={sampleEvents}
      selectedEventId="evt-1"
      onEventChange={() => {}}
      onScan={() => {}}
      onManualEntry={() => console.log("Manual entry")}
      showPlaceholder
    />
  ),
}

/**
 * Arabic labels
 */
export const ArabicLabels: Story = {
  render: () => {
    const [selectedEventId, setSelectedEventId] = useState("evt-1")
    const [isFlashOn, setIsFlashOn] = useState(false)

    const arabicEvents: TicketScannerEvent[] = [
      {
        id: "evt-1",
        title: "البؤساء - الحفل",
        date: "16/01/2026 - 20:00",
        scannedCount: 127,
        totalTickets: 450,
      },
      {
        id: "evt-2",
        title: "مهرجان الجاز بطبرقة",
        date: "17/01/2026 - 19:30",
        scannedCount: 0,
        totalTickets: 200,
      },
    ]

    return (
      <div dir="rtl" lang="ar" className="font-arabic">
        <TicketScanner
          events={arabicEvents}
          selectedEventId={selectedEventId}
          onEventChange={setSelectedEventId}
          onScan={() => {}}
          onManualEntry={() => {}}
          isFlashOn={isFlashOn}
          onFlashToggle={() => setIsFlashOn(!isFlashOn)}
          showPlaceholder
          labels={{
            selectEvent: "اختر الحدث",
            scanned: "تم مسحها",
            of: "من",
            flash: "فلاش",
            manualEntry: "إدخال يدوي",
            noEvents: "لا توجد أحداث",
          }}
        />
      </div>
    )
  },
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  render: () => {
    const [selectedEventId, setSelectedEventId] = useState("evt-1")
    const [isFlashOn, setIsFlashOn] = useState(false)

    return (
      <TicketScanner
        events={sampleEvents}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
        onScan={() => {}}
        onManualEntry={() => {}}
        isFlashOn={isFlashOn}
        onFlashToggle={() => setIsFlashOn(!isFlashOn)}
        showPlaceholder
        labels={{
          selectEvent: "Select event",
          scanned: "Scanned",
          of: "of",
          flash: "Flash",
          manualEntry: "Manual entry",
          noEvents: "No events",
        }}
      />
    )
  },
}

/**
 * High throughput scenario (lots of tickets scanned)
 */
export const HighThroughput: Story = {
  render: () => {
    const [selectedEventId, setSelectedEventId] = useState("evt-1")
    const [isFlashOn, setIsFlashOn] = useState(false)

    const highCapacityEvents: TicketScannerEvent[] = [
      {
        id: "evt-1",
        title: "Concert Majeur au Stade",
        date: "16/01/2026 - 20:00",
        scannedCount: 8547,
        totalTickets: 15000,
      },
    ]

    return (
      <TicketScanner
        events={highCapacityEvents}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
        onScan={() => {}}
        onManualEntry={() => {}}
        isFlashOn={isFlashOn}
        onFlashToggle={() => setIsFlashOn(!isFlashOn)}
        showPlaceholder
      />
    )
  },
}
