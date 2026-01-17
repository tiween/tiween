import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { DateSelector } from "./DateSelector"

const meta: Meta<typeof DateSelector> = {
  title: "Features/Events/DateSelector",
  component: DateSelector,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Horizontal scrolling date filter chips with calendar popover for custom date selection. Displays today, tomorrow, and the next 5 days, plus a custom date picker.",
      },
    },
  },
  argTypes: {
    selectedDate: {
      control: "date",
      description: "Currently selected date",
    },
    onDateChange: {
      action: "date changed",
      description: "Called when a date is selected",
    },
    locale: {
      control: "select",
      options: ["fr-TN", "ar-TN", "en-US"],
      description: "Locale for date formatting",
    },
  },
}

export default meta
type Story = StoryObj<typeof DateSelector>

// Wrapper component for interactive stories
function InteractiveDateSelector({
  initialDate = new Date(),
  locale = "fr-TN",
}: {
  initialDate?: Date
  locale?: string
}) {
  const [date, setDate] = useState(initialDate)
  return (
    <DateSelector selectedDate={date} onDateChange={setDate} locale={locale} />
  )
}

/**
 * Default state with today selected
 */
export const Default: Story = {
  args: {
    selectedDate: new Date(),
    locale: "fr-TN",
  },
}

/**
 * Interactive story - click chips to see selection change
 */
export const Interactive: Story = {
  render: () => <InteractiveDateSelector />,
}

/**
 * Today selected (default)
 */
export const Today: Story = {
  args: {
    selectedDate: new Date(),
    locale: "fr-TN",
  },
}

/**
 * Tomorrow selected
 */
export const Tomorrow: Story = {
  render: () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return <InteractiveDateSelector initialDate={tomorrow} />
  },
}

/**
 * A specific date selected (e.g., 3 days from now)
 */
export const SpecificDate: Story = {
  render: () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    return <InteractiveDateSelector initialDate={futureDate} />
  },
}

/**
 * Custom date selected (outside the 7-day range)
 * Shows the calendar icon with the formatted date
 */
export const CustomDate: Story = {
  render: () => {
    const customDate = new Date()
    customDate.setDate(customDate.getDate() + 14) // 2 weeks from now
    return <InteractiveDateSelector initialDate={customDate} />
  },
}

/**
 * Narrow container - demonstrates horizontal scroll with fade indicators
 */
export const WithScroll: Story = {
  args: {
    selectedDate: new Date(),
    locale: "fr-TN",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "300px" }}>
        <Story />
      </div>
    ),
  ],
}

/**
 * English locale formatting
 */
export const EnglishLocale: Story = {
  args: {
    selectedDate: new Date(),
    locale: "en-US",
    labels: {
      today: "Today",
      tomorrow: "Tomorrow",
      custom: "Pick date",
      selectDate: "Select a date",
    },
  },
}

/**
 * RTL mode with Arabic labels and locale
 */
export const RTL: Story = {
  args: {
    selectedDate: new Date(),
    locale: "ar-TN",
    labels: {
      today: "اليوم",
      tomorrow: "غدا",
      custom: "اختر",
      selectDate: "اختر تاريخ",
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
 * Interactive with English locale
 */
export const InteractiveEnglish: Story = {
  render: () => <InteractiveDateSelector locale="en-US" />,
}

/**
 * Custom className for styling
 */
export const WithCustomClass: Story = {
  args: {
    selectedDate: new Date(),
    locale: "fr-TN",
    className: "bg-muted p-2 rounded-lg",
  },
}
