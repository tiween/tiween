import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { GroupedTicketListLabels } from "./GroupedTicketList"
import type { TicketView } from "@/features/tickets/types"

import { GroupedTicketList } from "./GroupedTicketList"

const labels: GroupedTicketListLabels = {
  tickets: (count) => `${count} billet${count > 1 ? "s" : ""}`,
  addToWallet: "Ajouter au wallet",
  share: "Partager",
  scanned: "Scanné",
  scannedAt: "Scanné à",
  expired: "Événement passé",
  offlineAvailable: "Disponible hors ligne",
  qrAlt: "Code QR du billet",
  qrPending: "Votre QR code est en cours de génération.",
  emptyTitle: "Aucun billet pour le moment",
  emptyDescription: "Vos billets apparaîtront ici après un achat.",
  upcomingTitle: "À venir",
  historyTitle: "Historique",
  viewTicket: (ticketNumber) => `Voir le billet ${ticketNumber}`,
  dialogTitle: "Votre billet",
}

function ticket(overrides: Partial<TicketView>): TicketView {
  return {
    ticketNumber: "TW-1001-1",
    type: "standard",
    status: "valid",
    price: 15,
    qrCode: "TWQ1.demo-payload.demo-signature",
    scannedAt: null,
    orderNumber: "TW-1001",
    eventTitle: "Inception",
    startDateTime: "2099-08-20T19:30:00.000Z",
    venueName: "Cinéma Le Palace",
    ...overrides,
  }
}

const meta: Meta<typeof GroupedTicketList> = {
  title: "Features/Tickets/GroupedTicketList",
  component: GroupedTicketList,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          'Grouped "Mes Billets" view (Story 6.6): tickets grouped by event + showtime with a header per group and compact QR previews; tapping a preview opens the full TicketQR in a dialog. Past showtimes (Africa/Tunis date) sit under a separate "Historique" section.',
      },
    },
  },
  args: {
    locale: "fr",
    labels,
  },
}

export default meta
type Story = StoryObj<typeof GroupedTicketList>

export const MixedUpcomingAndPast: Story = {
  args: {
    tickets: [
      ticket({}),
      ticket({ ticketNumber: "TW-1001-2", type: "vip" }),
      ticket({
        ticketNumber: "TW-1002-1",
        orderNumber: "TW-1002",
        eventTitle: "Dhaou El Kamar",
        startDateTime: "2099-09-05T20:00:00.000Z",
        venueName: "Théâtre Municipal de Tunis",
      }),
      ticket({
        ticketNumber: "TW-0900-1",
        orderNumber: "TW-0900",
        eventTitle: "Festival de Carthage",
        startDateTime: "2020-07-18T20:30:00.000Z",
        venueName: "Amphithéâtre de Carthage",
        status: "scanned",
        scannedAt: "2020-07-18T20:45:00.000Z",
      }),
    ],
  },
}

export const SameEventTwoDates: Story = {
  args: {
    tickets: [
      ticket({}),
      ticket({
        ticketNumber: "TW-1003-1",
        orderNumber: "TW-1003",
        startDateTime: "2099-08-21T19:30:00.000Z",
      }),
    ],
  },
}

export const PendingQR: Story = {
  args: {
    tickets: [ticket({ qrCode: null })],
  },
}

export const OnlyPast: Story = {
  args: {
    tickets: [
      ticket({
        ticketNumber: "TW-0900-1",
        orderNumber: "TW-0900",
        eventTitle: "Festival de Carthage",
        startDateTime: "2020-07-18T20:30:00.000Z",
        venueName: "Amphithéâtre de Carthage",
      }),
    ],
  },
}

export const Empty: Story = {
  args: {
    tickets: [],
  },
}
