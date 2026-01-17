import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"
import type { ShowtimeStatus } from "./ShowtimeButton"

import { ShowtimeButton } from "./ShowtimeButton"

const meta: Meta<typeof ShowtimeButton> = {
  title: "Features/Tickets/ShowtimeButton",
  component: ShowtimeButton,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Selectable button for choosing event showtimes. Displays time, venue, format badges, and supports multiple states including sold-out and selected.",
      },
    },
  },
  argTypes: {
    status: {
      control: "select",
      options: ["available", "selected", "sold-out", "unavailable"],
      description: "Current status of this showtime",
    },
    onSelect: {
      action: "selected",
      description: "Called when the showtime is selected",
    },
  },
}

export default meta
type Story = StoryObj<typeof ShowtimeButton>

// Interactive wrapper for selection demo
function InteractiveShowtimeGroup() {
  const [selected, setSelected] = useState<string | null>(null)

  const showtimes = [
    {
      id: "1",
      time: "14:30",
      venue: "Cinéma Le Palace",
      formats: ["VF"] as const,
    },
    {
      id: "2",
      time: "17:00",
      venue: "Cinéma Le Palace",
      formats: ["VOST"] as const,
    },
    {
      id: "3",
      time: "20:30",
      venue: "Cinéma Le Palace",
      formats: ["VOST", "3D"] as const,
    },
    {
      id: "4",
      time: "22:30",
      venue: "Cinéma Pathé",
      formats: ["IMAX"] as const,
    },
  ]

  return (
    <div
      className="grid max-w-md gap-2"
      role="radiogroup"
      aria-label="Select a showtime"
    >
      {showtimes.map((showtime) => (
        <ShowtimeButton
          key={showtime.id}
          time={showtime.time}
          venueName={showtime.venue}
          formats={showtime.formats}
          price={15}
          status={selected === showtime.id ? "selected" : "available"}
          onSelect={() => setSelected(showtime.id)}
        />
      ))}
    </div>
  )
}

/**
 * Default available state
 */
export const Default: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    status: "available",
  },
}

/**
 * With format badges
 */
export const WithFormats: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VOST", "3D"],
    status: "available",
  },
}

/**
 * With price displayed
 */
export const WithPrice: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VOST"],
    price: 15,
    currency: "TND",
    status: "available",
  },
}

/**
 * Selected state - yellow border and checkmark
 */
export const Selected: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VOST", "3D"],
    price: 18,
    status: "selected",
  },
}

/**
 * Sold out state - strikethrough, dimmed, "Complet" badge
 */
export const SoldOut: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VOST"],
    status: "sold-out",
  },
}

/**
 * Unavailable state - dimmed, not clickable
 */
export const Unavailable: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VF"],
    status: "unavailable",
  },
}

/**
 * VF (French dubbed) format
 */
export const FrenchDubbed: Story = {
  args: {
    time: "17:00",
    venueName: "Cinéma Pathé",
    formats: ["VF"],
    price: 12,
    status: "available",
  },
}

/**
 * Premium IMAX format
 */
export const IMAX: Story = {
  args: {
    time: "21:00",
    venueName: "Cinéma IMAX Tunisia Mall",
    formats: ["IMAX"],
    price: 25,
    status: "available",
  },
}

/**
 * 4DX experience format
 */
export const FourDX: Story = {
  args: {
    time: "19:30",
    venueName: "Cinéma City Stars",
    formats: ["4DX"],
    price: 30,
    status: "available",
  },
}

/**
 * Multiple formats combined
 */
export const MultipleFormats: Story = {
  args: {
    time: "20:30",
    venueName: "Cinéma Le Palace",
    formats: ["VOST", "3D", "IMAX"],
    price: 28,
    status: "available",
  },
}

/**
 * Long venue name (tests truncation)
 */
export const LongVenueName: Story = {
  args: {
    time: "20:30",
    venueName: "Complexe Culturel et Cinématographique de la Médina de Tunis",
    formats: ["VOST"],
    price: 15,
    status: "available",
  },
}

/**
 * Interactive group - click to select one showtime
 */
export const InteractiveGroup: Story = {
  render: () => <InteractiveShowtimeGroup />,
}

/**
 * All states displayed together
 */
export const AllStates: Story = {
  render: () => (
    <div className="grid max-w-md gap-2">
      <ShowtimeButton
        time="14:30"
        venueName="Cinéma Le Palace"
        formats={["VF"]}
        price={12}
        status="available"
      />
      <ShowtimeButton
        time="17:00"
        venueName="Cinéma Le Palace"
        formats={["VOST"]}
        price={15}
        status="selected"
      />
      <ShowtimeButton
        time="20:30"
        venueName="Cinéma Le Palace"
        formats={["VOST", "3D"]}
        status="sold-out"
      />
      <ShowtimeButton
        time="22:30"
        venueName="Cinéma Le Palace"
        formats={["VO"]}
        status="unavailable"
      />
    </div>
  ),
}

/**
 * RTL mode with Arabic labels
 */
export const RTL: Story = {
  args: {
    time: "20:30",
    venueName: "سينما الباليس",
    formats: ["VOST", "3D"],
    price: 15,
    status: "available",
    labels: {
      soldOut: "مكتمل",
      selectShowtime: "اختر هذه الحصة",
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
 * RTL sold out
 */
export const RTLSoldOut: Story = {
  args: {
    time: "20:30",
    venueName: "سينما الباليس",
    formats: ["VOST"],
    status: "sold-out",
    labels: {
      soldOut: "مكتمل",
      selectShowtime: "اختر هذه الحصة",
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
    time: "20:30",
    venueName: "Cinema Le Palace",
    formats: ["VOST", "3D"],
    price: 15,
    status: "sold-out",
    labels: {
      soldOut: "Sold Out",
      selectShowtime: "Select this showtime",
    },
  },
}
