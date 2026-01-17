import type { Meta, StoryObj } from "@storybook/react"

import { OrderSummary } from "./OrderSummary"

const meta: Meta<typeof OrderSummary> = {
  title: "Features/Tickets/OrderSummary",
  component: OrderSummary,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Order summary component displaying event info, line items, subtotal, service fee, and total. Currency formatted with comma separator (Tunisian convention).",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof OrderSummary>

/**
 * Single ticket type
 */
export const SingleTicket: Story = {
  args: {
    eventTitle: "Inception",
    showtime: "20:30 - Cinéma Le Palace",
    items: [{ ticketType: "Plein tarif", quantity: 1, unitPrice: 15 }],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Multiple tickets of same type
 */
export const MultipleTickets: Story = {
  args: {
    eventTitle: "Inception",
    showtime: "20:30 - Cinéma Le Palace",
    items: [{ ticketType: "Plein tarif", quantity: 3, unitPrice: 15 }],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Multiple ticket types
 */
export const MixedTicketTypes: Story = {
  args: {
    eventTitle: "Inception",
    showtime: "20:30 - Cinéma Le Palace",
    items: [
      { ticketType: "Plein tarif", quantity: 2, unitPrice: 15 },
      { ticketType: "Tarif réduit", quantity: 1, unitPrice: 10 },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * With service fee
 */
export const WithServiceFee: Story = {
  args: {
    eventTitle: "Inception",
    showtime: "20:30 - Cinéma Le Palace",
    items: [
      { ticketType: "Plein tarif", quantity: 2, unitPrice: 15 },
      { ticketType: "Tarif réduit", quantity: 1, unitPrice: 10 },
    ],
    serviceFee: 2,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Premium event with VIP tickets
 */
export const PremiumEvent: Story = {
  args: {
    eventTitle: "Concert Anouar Brahem",
    showtime: "21:00 - Cité de la Culture",
    items: [
      { ticketType: "VIP", quantity: 2, unitPrice: 50 },
      { ticketType: "Catégorie 1", quantity: 3, unitPrice: 35 },
    ],
    serviceFee: 5,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Theater event
 */
export const TheaterEvent: Story = {
  args: {
    eventTitle: "Le Malade Imaginaire",
    showtime: "19:00 - Théâtre Municipal",
    items: [
      { ticketType: "Orchestre", quantity: 2, unitPrice: 25 },
      { ticketType: "Balcon", quantity: 2, unitPrice: 20 },
    ],
    serviceFee: 3,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Student tickets only
 */
export const StudentTickets: Story = {
  args: {
    eventTitle: "Festival du Court-métrage",
    showtime: "14:00 - Cinémathèque",
    items: [{ ticketType: "Tarif étudiant", quantity: 4, unitPrice: 8 }],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Long event title
 */
export const LongTitle: Story = {
  args: {
    eventTitle:
      "Festival International de Jazz de Tunis - Concert de clôture avec invités spéciaux",
    showtime: "21:00 - Amphithéâtre de Carthage",
    items: [
      { ticketType: "Tribune centrale", quantity: 2, unitPrice: 45 },
      { ticketType: "Tribune latérale", quantity: 1, unitPrice: 30 },
    ],
    serviceFee: 5,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * All ticket types with many items
 */
export const ManyItems: Story = {
  args: {
    eventTitle: "Soirée Spéciale",
    showtime: "20:00 - Salle Polyvalente",
    items: [
      { ticketType: "VIP", quantity: 1, unitPrice: 50 },
      { ticketType: "Plein tarif", quantity: 2, unitPrice: 25 },
      { ticketType: "Tarif réduit", quantity: 2, unitPrice: 18 },
      { ticketType: "Tarif étudiant", quantity: 3, unitPrice: 12 },
    ],
    serviceFee: 4,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * Zero quantity items filtered out
 */
export const WithZeroQuantityItems: Story = {
  args: {
    eventTitle: "Inception",
    showtime: "20:30 - Cinéma Le Palace",
    items: [
      { ticketType: "Plein tarif", quantity: 2, unitPrice: 15 },
      { ticketType: "Tarif réduit", quantity: 0, unitPrice: 10 }, // Filtered out
      { ticketType: "Tarif étudiant", quantity: 1, unitPrice: 8 },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}

/**
 * RTL mode with Arabic content
 */
export const RTL: Story = {
  args: {
    eventTitle: "حفل موسيقي",
    showtime: "21:00 - قصر الثقافة",
    items: [
      { ticketType: "سعر كامل", quantity: 2, unitPrice: 25 },
      { ticketType: "سعر مخفض", quantity: 1, unitPrice: 15 },
    ],
    serviceFee: 3,
    labels: {
      subtotal: "المجموع الفرعي",
      serviceFee: "رسوم الخدمة",
      total: "المجموع",
    },
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar" className="max-w-sm">
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
    eventTitle: "Inception",
    showtime: "8:30 PM - Cinema Le Palace",
    items: [
      { ticketType: "Full Price", quantity: 2, unitPrice: 15 },
      { ticketType: "Reduced", quantity: 1, unitPrice: 10 },
    ],
    serviceFee: 2,
    labels: {
      subtotal: "Subtotal",
      serviceFee: "Service Fee",
      total: "Total",
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
}
