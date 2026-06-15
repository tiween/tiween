import type { Meta, StoryObj } from "@storybook/react"

import { DesktopNav } from "./DesktopNav"

const meta: Meta<typeof DesktopNav> = {
  title: "Layout/DesktopNav",
  component: DesktopNav,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Horizontal top navigation bar for desktop screens (lg+). Hidden on mobile where BottomNav is used instead. Includes logo, main navigation links, and language switcher.",
      },
    },
    viewport: {
      defaultViewport: "desktop",
    },
  },
  tags: ["autodocs"],
  argTypes: {
    ticketCount: {
      control: { type: "number", min: 0, max: 100 },
      description: "Number of unscanned tickets to show as badge",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Default desktop navigation with all links.",
      },
    },
  },
}

export const WithTicketBadge: Story = {
  args: {
    ticketCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story: "Navigation with ticket count badge showing unscanned tickets.",
      },
    },
  },
}

export const HighTicketCount: Story = {
  args: {
    ticketCount: 150,
  },
  parameters: {
    docs: {
      description: {
        story: "Navigation with high ticket count (shows 99+).",
      },
    },
  },
}

export const CustomLabels: Story = {
  args: {
    labels: {
      home: "Home",
      search: "Discover",
      tickets: "My Tickets",
      account: "Profile",
      navigation: "Main navigation",
    },
    ticketCount: 2,
  },
  parameters: {
    docs: {
      description: {
        story: "Navigation with English labels.",
      },
    },
  },
}

export const ArabicLabels: Story = {
  args: {
    labels: {
      home: "الرئيسية",
      search: "بحث",
      tickets: "تذاكري",
      account: "حسابي",
      navigation: "التنقل الرئيسي",
    },
    ticketCount: 5,
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="font-arabic">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Navigation in RTL mode with Arabic labels.",
      },
    },
  },
}

export const InPageContext: Story = {
  render: () => (
    <div className="bg-background min-h-screen">
      <DesktopNav ticketCount={2} />
      <main className="p-8">
        <div className="mx-auto max-w-screen-xl">
          <h1 className="text-foreground text-3xl font-bold">Page Content</h1>
          <p className="text-muted-foreground mt-4">
            The navigation bar is sticky and stays at the top when scrolling.
          </p>
          <div className="bg-muted/50 mt-8 h-[200vh] rounded-lg p-8">
            <p className="text-muted-foreground">
              Scroll to see sticky behavior
            </p>
          </div>
        </div>
      </main>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Navigation in context with page content showing sticky behavior.",
      },
    },
  },
}
