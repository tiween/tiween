import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Card, CardContent, CardHeader } from "./card"
import { Skeleton } from "./skeleton"

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Skeleton component for displaying loading placeholders. Uses pulse animation to indicate content is being loaded.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
}

export const Shapes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-12 w-12 rounded-lg" />
      <Skeleton className="h-12 w-12 rounded-none" />
      <Skeleton className="h-4 w-32" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Different skeleton shapes: circle, rounded square, square, and line.",
      },
    },
  },
}

export const EventCardSkeleton: Story = {
  render: () => (
    <div className="w-64">
      <Card className="overflow-hidden">
        <Skeleton className="aspect-[2/3] w-full rounded-none" />
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton matching the EventCard component structure.",
      },
    },
  },
}

export const FilmCardSkeleton: Story = {
  render: () => (
    <div className="w-40">
      <div className="space-y-2">
        <Skeleton className="aspect-[2/3] w-full rounded-lg" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton for film poster cards.",
      },
    },
  },
}

export const ListItemSkeleton: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton for list items with thumbnail, text, and action.",
      },
    },
  },
}

export const ProfileSkeleton: Story = {
  render: () => (
    <div className="w-80">
      <Card>
        <CardHeader className="items-center">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="mt-4 h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton for a user profile form.",
      },
    },
  },
}

export const TicketSkeleton: Story = {
  render: () => (
    <div className="w-80">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-center">
            <Skeleton className="h-32 w-32 rounded-lg" />
          </div>
          <Skeleton className="mt-4 h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton for a ticket card with QR code placeholder.",
      },
    },
  },
}

export const GridSkeleton: Story = {
  render: () => (
    <div className="grid w-[600px] grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Grid of skeleton cards for browse/discovery pages.",
      },
    },
  },
}

export const SearchResultsSkeleton: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-20 w-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Skeleton for search results page with filters and results list.",
      },
    },
  },
}

export const TextSkeleton: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Skeleton for text content like articles or descriptions.",
      },
    },
  },
}
