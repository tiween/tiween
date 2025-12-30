import type { Meta, StoryObj } from "@storybook/react"

import { Header } from "./Header"

const meta: Meta<typeof Header> = {
  title: "Layout/Header",
  component: Header,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ["autodocs"],
  argTypes: {
    title: {
      control: "text",
      description: "Optional title displayed in center",
    },
    showBackButton: {
      control: "boolean",
      description: "Show back button",
    },
    showLanguageSwitcher: {
      control: "boolean",
      description: "Show language switcher",
    },
    showLogo: {
      control: "boolean",
      description: "Show logo",
    },
    onBack: {
      action: "back",
      description: "Called when back button is clicked",
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-[200px] bg-background">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default header with logo and language switcher
export const Default: Story = {
  args: {
    showLogo: true,
    showLanguageSwitcher: true,
  },
}

// Header with title
export const WithTitle: Story = {
  args: {
    title: "Recherche",
    showLogo: true,
    showLanguageSwitcher: true,
  },
}

// Header with back button
export const WithBackButton: Story = {
  args: {
    showBackButton: true,
    title: "Détails de l'événement",
    showLanguageSwitcher: true,
  },
}

// Header without language switcher
export const NoLanguageSwitcher: Story = {
  args: {
    showLogo: true,
    showLanguageSwitcher: false,
  },
}

// Minimal header - back button only
export const Minimal: Story = {
  args: {
    showBackButton: true,
    showLanguageSwitcher: false,
    showLogo: false,
  },
}

// RTL mode
export const RTLMode: Story = {
  args: {
    showBackButton: true,
    title: "التفاصيل",
    showLanguageSwitcher: true,
  },
  decorators: [
    (Story) => (
      <div dir="rtl" className="min-h-[200px] bg-background">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Header in RTL mode. The back arrow direction is flipped automatically.",
      },
    },
  },
}

// All variants showcase
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Default (Logo + Language Switcher)
        </h3>
        <div className="rounded-lg border border-border">
          <Header showLogo showLanguageSwitcher />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          With Title
        </h3>
        <div className="rounded-lg border border-border">
          <Header showLogo showLanguageSwitcher title="Mes billets" />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          With Back Button
        </h3>
        <div className="rounded-lg border border-border">
          <Header
            showBackButton
            showLanguageSwitcher
            title="Film Details"
            onBack={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Minimal (Back only)
        </h3>
        <div className="rounded-lg border border-border">
          <Header
            showBackButton
            showLanguageSwitcher={false}
            showLogo={false}
            onBack={() => {}}
          />
        </div>
      </div>
    </div>
  ),
  parameters: {
    layout: "padded",
  },
}
