import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { QuantitySelector } from "./QuantitySelector"

const meta: Meta<typeof QuantitySelector> = {
  title: "Features/Tickets/QuantitySelector",
  component: QuantitySelector,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Ticket quantity selector with +/- buttons, ticket type label, and unit price. Supports min/max limits and RTL mode.",
      },
    },
  },
  argTypes: {
    quantity: {
      control: { type: "number", min: 0, max: 20 },
      description: "Current quantity value",
    },
    min: {
      control: { type: "number", min: 0, max: 10 },
      description: "Minimum allowed quantity",
    },
    max: {
      control: { type: "number", min: 1, max: 20 },
      description: "Maximum allowed quantity",
    },
    onChange: {
      action: "quantity changed",
      description: "Called when quantity changes",
    },
  },
}

export default meta
type Story = StoryObj<typeof QuantitySelector>

// Interactive wrapper
function InteractiveQuantitySelector({
  initialQuantity = 1,
  ticketType = "Plein tarif",
  unitPrice = 15,
  min = 1,
  max = 10,
}: {
  initialQuantity?: number
  ticketType?: string
  unitPrice?: number
  min?: number
  max?: number
}) {
  const [quantity, setQuantity] = useState(initialQuantity)

  return (
    <div className="max-w-sm">
      <QuantitySelector
        quantity={quantity}
        ticketType={ticketType}
        unitPrice={unitPrice}
        min={min}
        max={max}
        onChange={setQuantity}
      />
    </div>
  )
}

/**
 * Default state
 */
export const Default: Story = {
  args: {
    quantity: 1,
    ticketType: "Plein tarif",
    unitPrice: 15,
    min: 1,
    max: 10,
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
 * Interactive - adjust quantity
 */
export const Interactive: Story = {
  render: () => <InteractiveQuantitySelector />,
}

/**
 * At minimum value (minus disabled)
 */
export const AtMin: Story = {
  args: {
    quantity: 1,
    ticketType: "Plein tarif",
    unitPrice: 15,
    min: 1,
    max: 10,
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
 * At maximum value (plus disabled)
 */
export const AtMax: Story = {
  args: {
    quantity: 10,
    ticketType: "Plein tarif",
    unitPrice: 15,
    min: 1,
    max: 10,
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
 * Reduced price ticket
 */
export const ReducedPrice: Story = {
  args: {
    quantity: 2,
    ticketType: "Tarif réduit",
    unitPrice: 10,
    min: 0,
    max: 10,
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
 * Student ticket
 */
export const StudentTicket: Story = {
  args: {
    quantity: 1,
    ticketType: "Tarif étudiant",
    unitPrice: 8,
    min: 0,
    max: 5,
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
 * VIP/Premium ticket
 */
export const VIPTicket: Story = {
  args: {
    quantity: 1,
    ticketType: "VIP",
    unitPrice: 35,
    min: 1,
    max: 4,
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
 * Zero minimum (can remove all)
 */
export const ZeroMinimum: Story = {
  render: () => (
    <InteractiveQuantitySelector
      initialQuantity={1}
      ticketType="Tarif réduit"
      unitPrice={10}
      min={0}
      max={10}
    />
  ),
}

/**
 * Multiple ticket types
 */
export const MultipleTypes: Story = {
  render: () => {
    const [fullPrice, setFullPrice] = useState(2)
    const [reduced, setReduced] = useState(1)
    const [student, setStudent] = useState(0)

    return (
      <div className="flex max-w-sm flex-col gap-3">
        <QuantitySelector
          quantity={fullPrice}
          ticketType="Plein tarif"
          unitPrice={15}
          min={0}
          max={10}
          onChange={setFullPrice}
        />
        <QuantitySelector
          quantity={reduced}
          ticketType="Tarif réduit"
          unitPrice={10}
          min={0}
          max={10}
          onChange={setReduced}
        />
        <QuantitySelector
          quantity={student}
          ticketType="Tarif étudiant"
          unitPrice={8}
          min={0}
          max={5}
          onChange={setStudent}
        />
      </div>
    )
  },
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  args: {
    quantity: 2,
    ticketType: "سعر كامل",
    unitPrice: 15,
    min: 1,
    max: 10,
    labels: {
      decrease: "تقليل الكمية",
      increase: "زيادة الكمية",
      quantity: "الكمية",
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
    quantity: 1,
    ticketType: "Full Price",
    unitPrice: 15,
    min: 1,
    max: 10,
    labels: {
      decrease: "Decrease quantity",
      increase: "Increase quantity",
      quantity: "Quantity",
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
