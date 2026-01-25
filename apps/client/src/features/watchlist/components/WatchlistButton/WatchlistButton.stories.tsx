import { useState } from "react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { WatchlistButtonLabels } from "./WatchlistButton"

import { WatchlistButton } from "./WatchlistButton"

// Arabic labels for RTL stories
const arabicLabels: WatchlistButtonLabels = {
  add: "أضف إلى قائمة المتابعة",
  remove: "إزالة من قائمة المتابعة",
}

const meta: Meta<typeof WatchlistButton> = {
  title: "Features/Watchlist/WatchlistButton",
  component: WatchlistButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "WatchlistButton is a toggle button for adding/removing items from a watchlist. Features heart icon with filled state, loading spinner, pulse animation on add, and full accessibility support.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    isWatchlisted: {
      control: "boolean",
      description: "Whether the item is currently in the watchlist",
    },
    isLoading: {
      control: "boolean",
      description: "Shows spinner when true (e.g., during API call)",
    },
    disabled: {
      control: "boolean",
      description: "Disables the button with reduced opacity",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant (sm: 36px, md: 44px, lg: 48px)",
    },
    variant: {
      control: "select",
      options: ["overlay", "ghost"],
      description:
        "Visual variant - overlay has dark background, ghost is transparent",
    },
    onToggle: {
      action: "toggled",
      description: "Callback fired when the button is clicked",
    },
  },
  decorators: [
    (Story) => (
      <div className="bg-card flex items-center justify-center rounded-lg p-8">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default state (not watchlisted)
export const Default: Story = {
  args: {
    isWatchlisted: false,
    size: "md",
    variant: "overlay",
  },
}

// Watchlisted state (filled heart)
export const Watchlisted: Story = {
  args: {
    isWatchlisted: true,
    size: "md",
    variant: "overlay",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows filled heart icon (Tiween Yellow) when item is in watchlist.",
      },
    },
  },
}

// Loading state
export const Loading: Story = {
  args: {
    isWatchlisted: false,
    isLoading: true,
    size: "md",
    variant: "overlay",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows spinning loader during async operations (e.g., API calls).",
      },
    },
  },
}

// Disabled state
export const Disabled: Story = {
  args: {
    isWatchlisted: false,
    disabled: true,
    size: "md",
    variant: "overlay",
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled state with reduced opacity and cursor-not-allowed.",
      },
    },
  },
}

// Ghost variant (for light backgrounds)
export const GhostVariant: Story = {
  args: {
    isWatchlisted: false,
    size: "md",
    variant: "ghost",
  },
  decorators: [
    (Story) => (
      <div className="bg-background flex items-center justify-center rounded-lg border p-8">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "Ghost variant with transparent background, suitable for light UI contexts.",
      },
    },
  },
}

// Interactive story with animation
export const WithAnimation: Story = {
  render: function InteractiveButton() {
    const [isWatchlisted, setIsWatchlisted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleToggle = async () => {
      setIsLoading(true)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      setIsWatchlisted(!isWatchlisted)
      setIsLoading(false)
    }

    return (
      <div className="flex flex-col items-center gap-4">
        <WatchlistButton
          isWatchlisted={isWatchlisted}
          isLoading={isLoading}
          onToggle={handleToggle}
          size="md"
          variant="overlay"
        />
        <p className="text-muted-foreground text-sm">
          Status:{" "}
          <strong className={isWatchlisted ? "text-primary" : ""}>
            {isLoading
              ? "Loading..."
              : isWatchlisted
                ? "In Watchlist"
                : "Not in Watchlist"}
          </strong>
        </p>
        <p className="text-muted-foreground text-xs">
          Click to toggle. Notice the pulse animation when adding.
        </p>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demo with simulated API delay. Shows loading state and pulse animation on add.",
      },
    },
  },
}

// All sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          onToggle={() => {}}
          size="sm"
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">sm (36px)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          onToggle={() => {}}
          size="md"
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">md (44px)</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          onToggle={() => {}}
          size="lg"
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">lg (48px)</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "All three size variants. Medium (44px) is the recommended minimum touch target.",
      },
    },
  },
}

// All states showcase
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          onToggle={() => {}}
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">Not Watchlisted</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={true}
          onToggle={() => {}}
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">Watchlisted</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          isLoading={true}
          onToggle={() => {}}
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">Loading</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <WatchlistButton
          isWatchlisted={false}
          disabled={true}
          onToggle={() => {}}
          variant="overlay"
        />
        <span className="text-muted-foreground text-xs">Disabled</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All button states displayed for comparison.",
      },
    },
  },
}

// RTL mode with Arabic labels
export const RTLMode: Story = {
  args: {
    isWatchlisted: false,
    size: "md",
    variant: "overlay",
    labels: arabicLabels,
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        className="bg-card flex items-center justify-center rounded-lg p-8"
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Button in RTL mode with Arabic accessibility labels.",
      },
    },
  },
}

// On image overlay (realistic usage)
export const OnImageOverlay: Story = {
  render: function ButtonOnImage() {
    const [isWatchlisted, setIsWatchlisted] = useState(false)

    return (
      <div className="relative h-48 w-64 overflow-hidden rounded-lg">
        {/* Simulated poster image */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600" />
        {/* Button positioned like in EventCard */}
        <div className="absolute end-2 top-2">
          <WatchlistButton
            isWatchlisted={isWatchlisted}
            onToggle={() => setIsWatchlisted(!isWatchlisted)}
            size="md"
            variant="overlay"
          />
        </div>
        {/* Card content placeholder */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="font-medium text-white">Event Title</p>
          <p className="text-sm text-white/70">Venue Name</p>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Realistic usage showing the button overlaid on an event card image.",
      },
    },
  },
}
