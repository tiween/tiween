import { useEffect, useState } from "react"

import type { Meta, StoryObj } from "@storybook/react"

import { AttendanceCounter } from "./AttendanceCounter"

const meta: Meta<typeof AttendanceCounter> = {
  title: "Features/Scanner/AttendanceCounter",
  component: AttendanceCounter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Real-time attendance tracking display for venue staff. High contrast design optimized for dark venues with multiple size and display variants.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
    variant: {
      control: "select",
      options: ["default", "compact", "detailed"],
    },
    warningThreshold: {
      control: { type: "range", min: 50, max: 100, step: 5 },
    },
  },
}

export default meta
type Story = StoryObj<typeof AttendanceCounter>

/**
 * Default attendance counter
 */
export const Default: Story = {
  args: {
    scannedCount: 127,
    totalTickets: 450,
  },
}

/**
 * Active scanning state with pulse animation
 */
export const ActiveScanning: Story = {
  args: {
    scannedCount: 127,
    totalTickets: 450,
    isActive: true,
  },
}

/**
 * Detailed variant with scan rate
 */
export const Detailed: Story = {
  args: {
    scannedCount: 127,
    totalTickets: 450,
    scanRate: 12,
    variant: "detailed",
    isActive: true,
  },
}

/**
 * Compact variant for inline display
 */
export const Compact: Story = {
  args: {
    scannedCount: 127,
    totalTickets: 450,
    variant: "compact",
  },
}

/**
 * Small size variant
 */
export const SizeSmall: Story = {
  args: {
    scannedCount: 45,
    totalTickets: 100,
    size: "sm",
  },
}

/**
 * Large size variant
 */
export const SizeLarge: Story = {
  args: {
    scannedCount: 8547,
    totalTickets: 15000,
    size: "lg",
    variant: "detailed",
    scanRate: 45,
  },
}

/**
 * Almost full (90%+ capacity)
 */
export const AlmostFull: Story = {
  args: {
    scannedCount: 425,
    totalTickets: 450,
    variant: "detailed",
  },
}

/**
 * Full capacity reached
 */
export const Full: Story = {
  args: {
    scannedCount: 450,
    totalTickets: 450,
    variant: "detailed",
  },
}

/**
 * Over capacity (edge case)
 */
export const OverCapacity: Story = {
  args: {
    scannedCount: 455,
    totalTickets: 450,
    variant: "detailed",
  },
}

/**
 * Empty event (no scans yet)
 */
export const Empty: Story = {
  args: {
    scannedCount: 0,
    totalTickets: 200,
  },
}

/**
 * Low threshold warning (75%)
 */
export const LowThreshold: Story = {
  args: {
    scannedCount: 350,
    totalTickets: 450,
    warningThreshold: 75,
    variant: "detailed",
  },
}

/**
 * High capacity venue
 */
export const HighCapacity: Story = {
  args: {
    scannedCount: 8547,
    totalTickets: 15000,
    scanRate: 45,
    size: "lg",
    variant: "detailed",
  },
}

/**
 * Small venue
 */
export const SmallVenue: Story = {
  args: {
    scannedCount: 23,
    totalTickets: 30,
    size: "sm",
    variant: "compact",
  },
}

/**
 * Live updating simulation
 */
export const LiveUpdating: Story = {
  render: () => {
    const [scannedCount, setScannedCount] = useState(100)
    const [scanRate, setScanRate] = useState(8)
    const totalTickets = 450

    useEffect(() => {
      const interval = setInterval(() => {
        setScannedCount((prev) => {
          if (prev >= totalTickets) return prev
          // Random increment 1-3
          const increment = Math.floor(Math.random() * 3) + 1
          return Math.min(prev + increment, totalTickets)
        })
        // Fluctuate scan rate
        setScanRate(Math.floor(Math.random() * 10) + 5)
      }, 1000)

      return () => clearInterval(interval)
    }, [])

    return (
      <AttendanceCounter
        scannedCount={scannedCount}
        totalTickets={totalTickets}
        scanRate={scanRate}
        variant="detailed"
        size="lg"
        isActive={scannedCount < totalTickets}
      />
    )
  },
}

/**
 * Arabic labels
 */
export const ArabicLabels: Story = {
  args: {
    scannedCount: 127,
    totalTickets: 450,
    scanRate: 12,
    variant: "detailed",
    labels: {
      scanned: "تم مسحها",
      of: "من",
      remaining: "المتبقي",
      capacity: "السعة",
      almostFull: "اكتمال وشيك",
      full: "مكتمل",
      scanRate: "معدل المسح",
      perMinute: "/دقيقة",
    },
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar" className="font-arabic">
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
    scannedCount: 127,
    totalTickets: 450,
    scanRate: 12,
    variant: "detailed",
    labels: {
      scanned: "Scanned",
      of: "of",
      remaining: "Remaining",
      capacity: "Capacity",
      almostFull: "Almost Full",
      full: "Full",
      scanRate: "Scan Rate",
      perMinute: "/min",
    },
  },
}

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Small
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          size="sm"
          variant="detailed"
          scanRate={8}
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Medium (default)
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          size="md"
          variant="detailed"
          scanRate={8}
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Large
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          size="lg"
          variant="detailed"
          scanRate={8}
        />
      </div>
    </div>
  ),
}

/**
 * All variants comparison
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Compact
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          variant="compact"
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Default
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          variant="default"
        />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Detailed
        </h3>
        <AttendanceCounter
          scannedCount={127}
          totalTickets={450}
          scanRate={12}
          variant="detailed"
        />
      </div>
    </div>
  ),
}

/**
 * Status progression
 */
export const StatusProgression: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Normal (0-89%)
        </h3>
        <AttendanceCounter scannedCount={200} totalTickets={450} />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Almost Full (90-99%)
        </h3>
        <AttendanceCounter scannedCount={420} totalTickets={450} />
      </div>
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Full (100%)
        </h3>
        <AttendanceCounter scannedCount={450} totalTickets={450} />
      </div>
    </div>
  ),
}

/**
 * Dashboard grid layout
 */
export const DashboardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <AttendanceCounter
        scannedCount={127}
        totalTickets={450}
        variant="default"
      />
      <AttendanceCounter
        scannedCount={420}
        totalTickets={450}
        variant="default"
      />
      <AttendanceCounter
        scannedCount={50}
        totalTickets={50}
        variant="default"
      />
      <AttendanceCounter
        scannedCount={0}
        totalTickets={200}
        variant="default"
      />
      <AttendanceCounter
        scannedCount={1500}
        totalTickets={5000}
        variant="default"
      />
      <AttendanceCounter
        scannedCount={89}
        totalTickets={100}
        variant="default"
      />
    </div>
  ),
}

/**
 * Dark venue simulation
 */
export const DarkVenue: Story = {
  render: () => (
    <div className="rounded-lg bg-black p-8">
      <AttendanceCounter
        scannedCount={127}
        totalTickets={450}
        scanRate={12}
        variant="detailed"
        size="lg"
        isActive
      />
    </div>
  ),
}
