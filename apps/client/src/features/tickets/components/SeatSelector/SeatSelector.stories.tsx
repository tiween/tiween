import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { Seat, SeatLayout } from "./SeatSelector"

import { SeatSelector } from "./SeatSelector"

const meta: Meta<typeof SeatSelector> = {
  title: "Features/Tickets/SeatSelector",
  component: SeatSelector,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Interactive seating chart for reserved seating venues. Supports keyboard navigation, multiple seat states, and accessibility features.",
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof SeatSelector>

/**
 * Generate a simple venue layout
 */
function generateSimpleLayout(
  rows: string[],
  seatsPerRow: number,
  takenSeats: [string, number][] = [],
  wheelchairSeats: [string, number][] = []
): SeatLayout {
  const seats: Seat[] = []

  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      let status: Seat["status"] = "available"

      if (takenSeats.some(([r, n]) => r === row && n === num)) {
        status = "taken"
      } else if (wheelchairSeats.some(([r, n]) => r === row && n === num)) {
        status = "wheelchair"
      }

      seats.push({ row, number: num, status })
    }
  }

  return { rows, seatsPerRow, seats }
}

// Small cinema layout (4 rows × 6 seats)
const smallVenueLayout = generateSimpleLayout(["A", "B", "C", "D"], 6, [
  ["B", 3],
  ["B", 4],
  ["C", 5],
])

// Medium cinema layout (6 rows × 8 seats)
const mediumVenueLayout = generateSimpleLayout(
  ["A", "B", "C", "D", "E", "F"],
  8,
  [
    ["A", 3],
    ["A", 4],
    ["B", 2],
    ["B", 3],
    ["C", 5],
    ["C", 6],
    ["D", 1],
    ["E", 7],
    ["E", 8],
  ],
  [
    ["F", 1],
    ["F", 8],
  ]
)

// Large theater layout (8 rows × 12 seats)
const largeVenueLayout = generateSimpleLayout(
  ["A", "B", "C", "D", "E", "F", "G", "H"],
  12,
  [
    ["A", 5],
    ["A", 6],
    ["A", 7],
    ["A", 8],
    ["B", 4],
    ["B", 5],
    ["B", 6],
    ["B", 7],
    ["B", 8],
    ["B", 9],
    ["C", 3],
    ["C", 4],
    ["C", 9],
    ["C", 10],
    ["D", 11],
    ["D", 12],
    ["E", 1],
    ["E", 2],
    ["F", 6],
    ["F", 7],
  ],
  [
    ["H", 1],
    ["H", 2],
    ["H", 11],
    ["H", 12],
  ]
)

// Interactive wrapper component
function InteractiveSeatSelector({
  layout,
  maxSeats = 4,
  initialSelected = [],
}: {
  layout: SeatLayout
  maxSeats?: number
  initialSelected?: Seat[]
}) {
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>(initialSelected)

  return (
    <div className="flex flex-col gap-4">
      <SeatSelector
        layout={layout}
        selectedSeats={selectedSeats}
        maxSeats={maxSeats}
        onSelect={setSelectedSeats}
      />
      <div className="text-muted-foreground text-sm">
        Selected: {selectedSeats.length}/{maxSeats} seats
        {selectedSeats.length > 0 && (
          <span className="ms-2">
            ({selectedSeats.map((s) => `${s.row}${s.number}`).join(", ")})
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Default small venue layout
 */
export const Default: Story = {
  render: () => <InteractiveSeatSelector layout={smallVenueLayout} />,
}

/**
 * Small venue (4 rows × 6 seats)
 */
export const SmallVenue: Story = {
  render: () => (
    <InteractiveSeatSelector layout={smallVenueLayout} maxSeats={2} />
  ),
}

/**
 * Medium venue (6 rows × 8 seats)
 */
export const MediumVenue: Story = {
  render: () => (
    <InteractiveSeatSelector layout={mediumVenueLayout} maxSeats={4} />
  ),
}

/**
 * Large theater (8 rows × 12 seats)
 */
export const LargeVenue: Story = {
  render: () => (
    <InteractiveSeatSelector layout={largeVenueLayout} maxSeats={6} />
  ),
}

/**
 * With pre-selected seats
 */
export const WithSelected: Story = {
  render: () => (
    <InteractiveSeatSelector
      layout={smallVenueLayout}
      maxSeats={4}
      initialSelected={[
        { row: "A", number: 2, status: "available" },
        { row: "A", number: 3, status: "available" },
      ]}
    />
  ),
}

/**
 * With wheelchair accessible seats highlighted
 */
export const WithWheelchair: Story = {
  render: () => {
    const wheelchairLayout = generateSimpleLayout(
      ["A", "B", "C", "D", "E"],
      8,
      [
        ["B", 3],
        ["B", 4],
        ["C", 5],
      ],
      [
        ["E", 1],
        ["E", 2],
        ["E", 7],
        ["E", 8],
      ]
    )

    return <InteractiveSeatSelector layout={wheelchairLayout} maxSeats={4} />
  },
}

/**
 * Maximum 2 seats (couples booking)
 */
export const MaxTwoSeats: Story = {
  render: () => (
    <InteractiveSeatSelector layout={smallVenueLayout} maxSeats={2} />
  ),
}

/**
 * Nearly sold out venue
 */
export const NearlySoldOut: Story = {
  render: () => {
    const soldOutLayout = generateSimpleLayout(
      ["A", "B", "C", "D"],
      8,
      // Most seats are taken
      [
        ["A", 1],
        ["A", 2],
        ["A", 3],
        ["A", 4],
        ["A", 5],
        ["A", 6],
        ["A", 7],
        ["A", 8],
        ["B", 1],
        ["B", 2],
        ["B", 3],
        ["B", 4],
        ["B", 5],
        ["B", 6],
        ["B", 7],
        ["B", 8],
        ["C", 1],
        ["C", 2],
        ["C", 5],
        ["C", 6],
        ["C", 7],
        ["C", 8],
        ["D", 1],
        ["D", 2],
        ["D", 3],
        ["D", 4],
        ["D", 5],
        ["D", 6],
      ]
    )

    return <InteractiveSeatSelector layout={soldOutLayout} maxSeats={4} />
  },
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  render: () => {
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])

    return (
      <div dir="rtl" lang="ar" className="font-arabic">
        <SeatSelector
          layout={smallVenueLayout}
          selectedSeats={selectedSeats}
          maxSeats={4}
          onSelect={setSelectedSeats}
          labels={{
            screen: "الشاشة",
            available: "متاح",
            selected: "محدد",
            taken: "محجوز",
            wheelchair: "مقعد متحرك",
            seatLabel: "الصف {row} المقعد {number}",
          }}
        />
        <div className="text-muted-foreground mt-4 text-sm">
          المقاعد المحددة: {selectedSeats.length}/4
        </div>
      </div>
    )
  },
}

/**
 * English labels
 */
export const EnglishLabels: Story = {
  render: () => {
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])

    return (
      <SeatSelector
        layout={mediumVenueLayout}
        selectedSeats={selectedSeats}
        maxSeats={4}
        onSelect={setSelectedSeats}
        labels={{
          screen: "Screen",
          available: "Available",
          selected: "Selected",
          taken: "Taken",
          wheelchair: "Wheelchair",
          seatLabel: "Row {row} Seat {number}",
        }}
      />
    )
  },
}

/**
 * Theater with stage label
 */
export const TheaterWithStage: Story = {
  render: () => {
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([])
    const theaterLayout: SeatLayout = {
      ...mediumVenueLayout,
      screenLabel: "Scène",
    }

    return (
      <SeatSelector
        layout={theaterLayout}
        selectedSeats={selectedSeats}
        maxSeats={4}
        onSelect={setSelectedSeats}
      />
    )
  },
}

/**
 * Controlled component demo
 */
export const Controlled: Story = {
  args: {
    layout: smallVenueLayout,
    selectedSeats: [
      { row: "B", number: 2, status: "available" },
      { row: "B", number: 5, status: "available" },
    ],
    maxSeats: 4,
    onSelect: (seats) => console.log("Selected seats:", seats),
  },
}

/**
 * All seat types demo
 */
export const AllSeatTypes: Story = {
  render: () => {
    const demoLayout: SeatLayout = {
      rows: ["A", "B"],
      seatsPerRow: 4,
      seats: [
        { row: "A", number: 1, status: "available" },
        { row: "A", number: 2, status: "taken" },
        { row: "A", number: 3, status: "wheelchair" },
        { row: "A", number: 4, status: "available" },
        { row: "B", number: 1, status: "available" },
        { row: "B", number: 2, status: "available" },
        { row: "B", number: 3, status: "taken" },
        { row: "B", number: 4, status: "wheelchair" },
      ],
    }

    return (
      <InteractiveSeatSelector
        layout={demoLayout}
        maxSeats={4}
        initialSelected={[{ row: "B", number: 1, status: "available" }]}
      />
    )
  },
}
