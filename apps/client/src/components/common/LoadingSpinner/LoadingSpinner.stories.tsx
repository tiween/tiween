import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { LoadingSpinner } from "./LoadingSpinner"

const meta: Meta<typeof LoadingSpinner> = {
  title: "Common/LoadingSpinner",
  component: LoadingSpinner,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "LoadingSpinner is an animated loading indicator with size variants and optional label text. Use it to indicate loading states throughout the application.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant (sm: 16px, md: 32px, lg: 48px)",
    },
    label: {
      control: "text",
      description: "Optional label text displayed below the spinner",
    },
    centered: {
      control: "boolean",
      description: "Center the spinner in its container",
    },
    fullPage: {
      control: "boolean",
      description: "Full page loading overlay",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-background min-h-[200px] min-w-[300px] rounded-lg p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default spinner
export const Default: Story = {
  args: {
    size: "md",
  },
}

// Small size
export const Small: Story = {
  args: {
    size: "sm",
  },
  parameters: {
    docs: {
      description: {
        story: "Small spinner (16px) for inline or compact loading indicators.",
      },
    },
  },
}

// Large size
export const Large: Story = {
  args: {
    size: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Large spinner (48px) for prominent loading states.",
      },
    },
  },
}

// With label
export const WithLabel: Story = {
  args: {
    size: "md",
    label: "Chargement en cours...",
  },
  parameters: {
    docs: {
      description: {
        story: "Spinner with descriptive label text below.",
      },
    },
  },
}

// Centered in container
export const Centered: Story = {
  args: {
    size: "md",
    centered: true,
  },
  decorators: [
    (Story) => (
      <div className="bg-card h-64 w-80 rounded-lg border">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Spinner centered within its container.",
      },
    },
  },
}

// Full page loading
export const FullPage: Story = {
  args: {
    size: "lg",
    label: "Chargement de la page...",
    fullPage: true,
  },
  decorators: [
    (Story) => (
      <div className="relative h-[400px] w-[600px] overflow-hidden rounded-lg border">
        <div className="p-4">
          <p className="text-muted-foreground">Content behind the overlay</p>
        </div>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Full page loading overlay with blurred background. Use for page transitions or initial load.",
      },
    },
  },
}

// All sizes comparison
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="sm" />
        <span className="text-muted-foreground text-xs">sm (16px)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="md" />
        <span className="text-muted-foreground text-xs">md (32px)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <LoadingSpinner size="lg" />
        <span className="text-muted-foreground text-xs">lg (48px)</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All three size variants displayed for comparison.",
      },
    },
  },
}

// With custom label sizes
export const WithLabels: Story = {
  render: () => (
    <div className="flex items-start gap-8">
      <LoadingSpinner size="sm" label="Loading..." />
      <LoadingSpinner size="md" label="Chargement..." />
      <LoadingSpinner size="lg" label="Veuillez patienter..." />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All sizes with their corresponding label text sizes.",
      },
    },
  },
}

// RTL Mode
export const RTLMode: Story = {
  args: {
    size: "md",
    label: "جاري التحميل...",
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        className="font-arabic bg-background min-h-[200px] min-w-[300px] rounded-lg p-8"
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Spinner in RTL mode with Arabic label.",
      },
    },
  },
}
