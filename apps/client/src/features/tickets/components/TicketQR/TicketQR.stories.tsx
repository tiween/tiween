import type { Meta, StoryObj } from "@storybook/react"
import type { TicketQRTicket } from "./TicketQR"

import { TicketQR } from "./TicketQR"

const meta: Meta<typeof TicketQR> = {
  title: "Features/Tickets/TicketQR",
  component: TicketQR,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "QR code display component for event tickets. Shows ticket ID, event details, and supports multiple states (valid, scanned, expired) and size variants.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["small", "large"],
      description: "Size variant for different contexts",
    },
    highBrightness: {
      control: "boolean",
      description: "Enable high brightness for better scanning in dark venues",
    },
    isOffline: {
      control: "boolean",
      description: "Show offline availability indicator",
    },
    showActions: {
      control: "boolean",
      description: "Show Add to Wallet and Share buttons",
    },
    onAddToWallet: {
      action: "add to wallet clicked",
    },
    onShare: {
      action: "share clicked",
    },
  },
}

export default meta
type Story = StoryObj<typeof TicketQR>

// Sample ticket data
const validTicket: TicketQRTicket = {
  id: "TIW-2024-1234",
  qrData: "https://tiween.tn/tickets/verify/TIW-2024-1234",
  eventTitle: "Inception",
  date: "20/01/2024",
  time: "20:30",
  venueName: "Cinéma Le Palace",
  quantity: 2,
  status: "valid",
}

const scannedTicket: TicketQRTicket = {
  ...validTicket,
  id: "TIW-2024-5678",
  status: "scanned",
  scannedAt: new Date("2024-01-20T20:15:00"),
}

const expiredTicket: TicketQRTicket = {
  ...validTicket,
  id: "TIW-2024-9012",
  date: "15/01/2024",
  status: "expired",
}

const concertTicket: TicketQRTicket = {
  id: "TIW-2024-JAZZ",
  qrData: "https://tiween.tn/tickets/verify/TIW-2024-JAZZ",
  eventTitle: "Festival Jazz de Tunis - Anouar Brahem",
  date: "25/01/2024",
  time: "21:00",
  venueName: "Cité de la Culture",
  quantity: 4,
  status: "valid",
}

const arabicTicket: TicketQRTicket = {
  id: "TIW-2024-عربي",
  qrData: "https://tiween.tn/tickets/verify/TIW-2024-AR",
  eventTitle: "حفل موسيقي",
  date: "20/01/2024",
  time: "21:00",
  venueName: "قصر الثقافة",
  quantity: 2,
  status: "valid",
}

/**
 * Default valid ticket - large size
 */
export const Default: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    showActions: true,
  },
}

/**
 * Valid ticket with all actions
 */
export const ValidWithActions: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    showActions: true,
    onAddToWallet: () => console.log("Add to wallet"),
    onShare: () => console.log("Share"),
  },
}

/**
 * Scanned ticket - shows checkmark overlay
 */
export const Scanned: Story = {
  args: {
    ticket: scannedTicket,
    size: "large",
  },
}

/**
 * Expired ticket - dimmed and greyscale
 */
export const Expired: Story = {
  args: {
    ticket: expiredTicket,
    size: "large",
  },
}

/**
 * Offline mode - shows offline availability badge
 */
export const Offline: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    isOffline: true,
    showActions: true,
  },
}

/**
 * High brightness mode for better scanning
 */
export const HighBrightness: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    highBrightness: true,
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
}

/**
 * Small size variant for list views
 */
export const Small: Story = {
  args: {
    ticket: validTicket,
    size: "small",
  },
}

/**
 * Small scanned
 */
export const SmallScanned: Story = {
  args: {
    ticket: scannedTicket,
    size: "small",
  },
}

/**
 * Single ticket
 */
export const SingleTicket: Story = {
  args: {
    ticket: { ...validTicket, quantity: 1 },
    size: "large",
    showActions: true,
  },
}

/**
 * Concert with multiple tickets
 */
export const ConcertTicket: Story = {
  args: {
    ticket: concertTicket,
    size: "large",
    showActions: true,
  },
}

/**
 * Without action buttons
 */
export const NoActions: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    showActions: false,
  },
}

/**
 * RTL mode with Arabic content
 */
export const RTL: Story = {
  args: {
    ticket: arabicTicket,
    size: "large",
    showActions: true,
    labels: {
      tickets: (count) => `${count} تذكرة`,
      addToWallet: "أضف للمحفظة",
      share: "مشاركة",
      scanned: "تم المسح",
      scannedAt: "تم المسح في",
      expired: "انتهى الحدث",
      offlineAvailable: "متاح بدون اتصال",
    },
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  args: {
    ticket: validTicket,
    size: "large",
    showActions: true,
    labels: {
      tickets: (count) => `${count} ticket${count > 1 ? "s" : ""}`,
      addToWallet: "Add to Wallet",
      share: "Share",
      scanned: "Scanned",
      scannedAt: "Scanned at",
      expired: "Event passed",
      offlineAvailable: "Available offline",
    },
  },
}

/**
 * List view - multiple small tickets
 */
export const TicketList: Story = {
  render: () => (
    <div className="flex flex-wrap justify-center gap-4">
      <TicketQR ticket={validTicket} size="small" />
      <TicketQR ticket={scannedTicket} size="small" />
      <TicketQR ticket={expiredTicket} size="small" />
    </div>
  ),
}

/**
 * All states comparison
 */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <div>
        <p className="text-muted-foreground mb-2 text-center text-sm">Valid</p>
        <TicketQR ticket={validTicket} size="large" showActions={false} />
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-center text-sm">
          Scanned
        </p>
        <TicketQR ticket={scannedTicket} size="large" showActions={false} />
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-center text-sm">
          Expired
        </p>
        <TicketQR ticket={expiredTicket} size="large" showActions={false} />
      </div>
    </div>
  ),
}
