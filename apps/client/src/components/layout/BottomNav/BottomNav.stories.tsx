import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import type { BottomNavLabels, TabType } from "./BottomNav"

import { BottomNav } from "./BottomNav"

// Arabic labels for RTL stories
const arabicLabels: BottomNavLabels = {
  home: "الرئيسية",
  search: "البحث",
  tickets: "التذاكر",
  account: "الحساب",
  navigation: "التنقل الرئيسي",
  unscannedTickets: (count) => `${count} تذاكر غير ممسوحة`,
}

const meta: Meta<typeof BottomNav> = {
  title: "Layout/BottomNav",
  component: BottomNav,
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile",
    },
    docs: {
      description: {
        component:
          "Mobile bottom navigation bar. Hidden on desktop (lg+) viewports. Use mobile viewport to preview.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    activeTab: {
      control: "select",
      options: ["home", "search", "tickets", "account"],
      description: "Currently active tab",
    },
    ticketCount: {
      control: { type: "number", min: 0, max: 100 },
      description: "Number of unscanned tickets (shows badge on Tickets tab)",
    },
    onNavigate: {
      action: "navigate",
      description: "Called when a tab is tapped",
    },
  },
  decorators: [
    (Story) => (
      <div className="relative min-h-[200px] bg-background">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default story - Home tab active
export const Default: Story = {
  args: {
    activeTab: "home",
    ticketCount: 0,
  },
}

// Home tab active
export const HomeActive: Story = {
  args: {
    activeTab: "home",
    ticketCount: 0,
  },
}

// Search tab active
export const SearchActive: Story = {
  args: {
    activeTab: "search",
    ticketCount: 0,
  },
}

// Tickets tab active
export const TicketsActive: Story = {
  args: {
    activeTab: "tickets",
    ticketCount: 0,
  },
}

// Account tab active
export const AccountActive: Story = {
  args: {
    activeTab: "account",
    ticketCount: 0,
  },
}

// With ticket badge (small number)
export const WithBadgeSmall: Story = {
  args: {
    activeTab: "home",
    ticketCount: 3,
  },
}

// With ticket badge (large number)
export const WithBadgeLarge: Story = {
  args: {
    activeTab: "home",
    ticketCount: 42,
  },
}

// With ticket badge (overflow - 99+)
export const WithBadgeOverflow: Story = {
  args: {
    activeTab: "home",
    ticketCount: 150,
  },
}

// Interactive example with state
export const Interactive: Story = {
  render: function InteractiveNav() {
    const [activeTab, setActiveTab] = useState<TabType>("home")

    return (
      <div className="relative min-h-[400px] bg-background p-4">
        <div className="mb-4 text-foreground">
          <p className="text-sm text-muted-foreground">
            Current tab: <strong className="text-primary">{activeTab}</strong>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the navigation tabs below to switch between sections.
          </p>
        </div>
        <BottomNav
          activeTab={activeTab}
          ticketCount={3}
          onNavigate={setActiveTab}
        />
      </div>
    )
  },
}

// RTL mode example with Arabic labels
export const RTLMode: Story = {
  args: {
    activeTab: "home",
    ticketCount: 5,
    labels: arabicLabels,
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="relative min-h-[200px] bg-background font-arabic">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "BottomNav in RTL mode with Arabic labels. The badge position is flipped to the left side.",
      },
    },
  },
}

// All states showcase
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-8 p-4">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Home Active
        </h3>
        <div className="relative h-24 rounded-lg border border-border bg-card">
          <BottomNav
            activeTab="home"
            ticketCount={0}
            onNavigate={() => {}}
            className="absolute"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Search Active
        </h3>
        <div className="relative h-24 rounded-lg border border-border bg-card">
          <BottomNav
            activeTab="search"
            ticketCount={0}
            onNavigate={() => {}}
            className="absolute"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Tickets Active with Badge
        </h3>
        <div className="relative h-24 rounded-lg border border-border bg-card">
          <BottomNav
            activeTab="tickets"
            ticketCount={7}
            onNavigate={() => {}}
            className="absolute"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Account Active
        </h3>
        <div className="relative h-24 rounded-lg border border-border bg-card">
          <BottomNav
            activeTab="account"
            ticketCount={0}
            onNavigate={() => {}}
            className="absolute"
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
    viewport: {
      defaultViewport: "mobile",
    },
  },
}
