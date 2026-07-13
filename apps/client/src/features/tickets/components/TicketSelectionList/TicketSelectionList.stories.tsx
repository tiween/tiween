import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import type { TicketTier, TicketTierType } from "@/features/tickets/types"

import { MAX_TICKETS_PER_ORDER } from "@/features/tickets/stores/ticketSelectionStore"

import {
  TicketSelectionList,
  type TicketSelectionListLabels,
} from "./TicketSelectionList"

const labels: TicketSelectionListLabels = {
  types: { standard: "Plein tarif", reduced: "Tarif réduit", vip: "VIP" },
  remaining: (count: number) => `${count} restants`,
  soldOut: "Complet",
  restrictionPrefix: "Restriction :",
  quantity: "Quantité",
  decrease: "Diminuer la quantité",
  increase: "Augmenter la quantité",
}

const tiers: TicketTier[] = [
  {
    type: "standard",
    price: 15,
    remaining: 12,
    soldOut: false,
    restrictionNote: null,
  },
  {
    type: "reduced",
    price: 10,
    remaining: 45,
    soldOut: false,
    restrictionNote: "sur justificatif",
  },
  {
    type: "vip",
    price: 40,
    remaining: 0,
    soldOut: true,
    restrictionNote: null,
  },
]

const meta: Meta<typeof TicketSelectionList> = {
  title: "Features/Tickets/TicketSelectionList",
  component: TicketSelectionList,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Interactive list of a showtime's ticket types (Story 6.2): one QuantitySelector per available tier bounded by the per-type (10), per-order (10), and per-tier `remaining` caps; sold-out tiers render a disabled Complet row with no selector.",
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
type Story = StoryObj<typeof TicketSelectionList>

/** Interactive wrapper that owns the selection state. */
function InteractiveList({
  initialQuantities = {},
  dir,
  storyLabels = labels,
}: {
  initialQuantities?: Partial<Record<TicketTierType, number>>
  dir?: "rtl"
  storyLabels?: TicketSelectionListLabels
}) {
  const [quantities, setQuantities] =
    useState<Partial<Record<TicketTierType, number>>>(initialQuantities)

  const total = Object.values(quantities).reduce((sum, q) => sum + (q ?? 0), 0)

  return (
    <div className="max-w-md" dir={dir}>
      <TicketSelectionList
        tiers={tiers}
        currency="TND"
        quantities={quantities}
        orderRemainingCapacity={MAX_TICKETS_PER_ORDER - total}
        labels={storyLabels}
        onQuantityChange={(type, quantity) =>
          setQuantities((prev) => ({ ...prev, [type]: quantity }))
        }
      />
    </div>
  )
}

/** Default: available standard/reduced tiers and a sold-out VIP. */
export const Default: Story = {
  render: () => <InteractiveList />,
}

/** Pre-filled selection near the order cap. */
export const NearOrderCap: Story = {
  render: () => <InteractiveList initialQuantities={{ standard: 8 }} />,
}

/** RTL (Arabic) — prices/counts keep Western numerals. */
export const RTLArabic: Story = {
  render: () => (
    <InteractiveList
      dir="rtl"
      storyLabels={{
        types: { standard: "التعرفة الكاملة", reduced: "تعرفة مخفّضة", vip: "VIP" },
        remaining: (count: number) => `${count} متبقّي`,
        soldOut: "مكتمل",
        restrictionPrefix: "شرط :",
        quantity: "الكمية",
        decrease: "تقليل الكمية",
        increase: "زيادة الكمية",
      }}
    />
  ),
}
