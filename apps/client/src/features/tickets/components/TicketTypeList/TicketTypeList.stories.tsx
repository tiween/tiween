import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import type { TicketTier } from "@/features/tickets/types"

import { TicketTypeList, type TicketTypeListLabels } from "./TicketTypeList"

const labels: TicketTypeListLabels = {
  types: {
    standard: "Plein tarif",
    reduced: "Tarif réduit",
    vip: "VIP",
  },
  remaining: (count: number) => `${count} restants`,
  soldOut: "Complet",
  restrictionPrefix: "Restriction :",
}

const tiers: TicketTier[] = [
  {
    type: "standard",
    price: 15,
    ticketsAvailable: 100,
    ticketsSold: 88,
    remaining: 12,
    soldOut: false,
    restrictionNote: null,
  },
  {
    type: "reduced",
    price: 10,
    ticketsAvailable: 50,
    ticketsSold: 5,
    remaining: 45,
    soldOut: false,
    restrictionNote: "sur justificatif",
  },
  {
    type: "vip",
    price: 40,
    ticketsAvailable: 10,
    ticketsSold: 10,
    remaining: 0,
    soldOut: true,
    restrictionNote: null,
  },
]

const meta: Meta<typeof TicketTypeList> = {
  title: "Features/Tickets/TicketTypeList",
  component: TicketTypeList,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Read-only list of a showtime's ticket types (Story 6.1): translated label, DT-formatted price, remaining availability, restriction note, and sold-out state. Presentation only — non-sold-out rows carry no selection handler (Story 6.2).",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TicketTypeList>

/** All three tiers: available standard, restricted reduced, sold-out VIP. */
export const Default: Story = {
  args: { tiers, currency: "TND", labels },
}

/** Every tier available (no sold-out state). */
export const AllAvailable: Story = {
  args: {
    tiers: tiers.map((t) => ({
      ...t,
      soldOut: false,
      remaining: t.remaining || 20,
    })),
    currency: "TND",
    labels,
  },
}

/** RTL (Arabic) — prices/counts keep Western numerals. */
export const RTLArabic: Story = {
  args: {
    tiers,
    currency: "TND",
    labels: {
      types: { standard: "التعرفة الكاملة", reduced: "تعرفة مخفّضة", vip: "VIP" },
      remaining: (count: number) => `${count} متبقّي`,
      soldOut: "مكتمل",
      restrictionPrefix: "شرط :",
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md" dir="rtl">
        <Story />
      </div>
    ),
  ],
}
