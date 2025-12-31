import { MapPin, SlidersHorizontal } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "@/components/ui/button"

import { BottomNav } from "../BottomNav"
import { Header } from "../Header"
import { PageContainer } from "../PageContainer"
import { StickyFilters } from "./StickyFilters"

// Mock CategoryTabs component for stories
function MockCategoryTabs({ activeTab = "all" }: { activeTab?: string }) {
  const categories = [
    { id: "all", label: "Tout" },
    { id: "cinema", label: "Cinéma" },
    { id: "theatre", label: "Théâtre" },
    { id: "short-films", label: "Courts-métrages" },
    { id: "music", label: "Musique" },
    { id: "exhibitions", label: "Expositions" },
  ]

  return (
    <div className="flex gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

// Mock DateSelector component for stories
function MockDateSelector({ activeDate = "today" }: { activeDate?: string }) {
  const dates = [
    { id: "today", label: "Aujourd'hui" },
    { id: "tomorrow", label: "Demain" },
    { id: "fri", label: "Ven. 3" },
    { id: "sat", label: "Sam. 4" },
    { id: "sun", label: "Dim. 5" },
    { id: "mon", label: "Lun. 6" },
    { id: "custom", label: "Choisir..." },
  ]

  return (
    <div className="flex gap-2">
      {dates.map((date) => (
        <button
          key={date.id}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeDate === date.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {date.label}
        </button>
      ))}
    </div>
  )
}

// Mock filter buttons for stories
function MockFilterButtons() {
  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5">
        <MapPin className="h-4 w-4" />
        Tunis
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </>
  )
}

// Arabic mock components
function MockCategoryTabsArabic({ activeTab = "all" }: { activeTab?: string }) {
  const categories = [
    { id: "all", label: "الكل" },
    { id: "cinema", label: "السينما" },
    { id: "theatre", label: "المسرح" },
    { id: "short-films", label: "أفلام قصيرة" },
    { id: "music", label: "موسيقى" },
    { id: "exhibitions", label: "معارض" },
  ]

  return (
    <div className="flex gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

function MockDateSelectorArabic({
  activeDate = "today",
}: {
  activeDate?: string
}) {
  const dates = [
    { id: "today", label: "اليوم" },
    { id: "tomorrow", label: "غداً" },
    { id: "fri", label: "الجمعة 3" },
    { id: "sat", label: "السبت 4" },
    { id: "sun", label: "الأحد 5" },
    { id: "custom", label: "اختر..." },
  ]

  return (
    <div className="flex gap-2">
      {dates.map((date) => (
        <button
          key={date.id}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            activeDate === date.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {date.label}
        </button>
      ))}
    </div>
  )
}

function MockFilterButtonsArabic() {
  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5">
        <MapPin className="h-4 w-4" />
        تونس
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8">
        <SlidersHorizontal className="h-4 w-4" />
      </Button>
    </>
  )
}

const meta: Meta<typeof StickyFilters> = {
  title: "Layout/StickyFilters",
  component: StickyFilters,
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "mobile",
    },
    docs: {
      description: {
        component:
          "Sticky filter bar that sits below the Header. Contains slots for CategoryTabs, DateSelector, and filter buttons.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="bg-background relative min-h-[300px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

// Default story with all slots filled
export const Default: Story = {
  args: {
    categoryTabs: <MockCategoryTabs />,
    dateSelector: <MockDateSelector />,
    filterButtons: <MockFilterButtons />,
  },
}

// With only category tabs
export const CategoryTabsOnly: Story = {
  args: {
    categoryTabs: <MockCategoryTabs activeTab="cinema" />,
  },
}

// With only date selector
export const DateSelectorOnly: Story = {
  args: {
    dateSelector: <MockDateSelector activeDate="tomorrow" />,
  },
}

// With date selector and filter buttons
export const WithFilters: Story = {
  args: {
    dateSelector: <MockDateSelector />,
    filterButtons: <MockFilterButtons />,
  },
}

// Sticky state
export const StickyState: Story = {
  args: {
    categoryTabs: <MockCategoryTabs />,
    dateSelector: <MockDateSelector />,
    filterButtons: <MockFilterButtons />,
    isSticky: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When isSticky is true, a border and shadow appear to indicate the stuck state.",
      },
    },
  },
}

// RTL Mode with Arabic content
export const RTLMode: Story = {
  args: {
    categoryTabs: <MockCategoryTabsArabic />,
    dateSelector: <MockDateSelectorArabic />,
    filterButtons: <MockFilterButtonsArabic />,
    labels: {
      filters: "المرشحات",
    },
  },
  decorators: [
    (Story) => (
      <div
        dir="rtl"
        className="bg-background font-arabic relative min-h-[300px]"
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          "StickyFilters in RTL mode with Arabic content. Scroll direction is reversed.",
      },
    },
  },
}

// Complete layout demonstration
export const CompleteLayout: Story = {
  render: () => (
    <div className="bg-background relative min-h-[800px]">
      <Header showLanguageSwitcher={false} />
      <StickyFilters
        categoryTabs={<MockCategoryTabs />}
        dateSelector={<MockDateSelector />}
        filterButtons={<MockFilterButtons />}
      />
      <PageContainer>
        <div className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">
            Événements à Tunis
          </h2>
          {/* Mock event cards */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card h-32 rounded-lg p-4">
              <div className="bg-muted h-4 w-3/4 rounded" />
              <div className="bg-muted mt-2 h-3 w-1/2 rounded" />
              <div className="bg-muted mt-2 h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      </PageContainer>
      <BottomNav activeTab="home" onNavigate={() => {}} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Complete layout showing Header, StickyFilters, PageContainer with content, and BottomNav. Scroll to see the sticky behavior.",
      },
    },
  },
}

// Scrollable demonstration
export const ScrollDemo: Story = {
  render: () => (
    <div className="bg-background relative h-[600px] overflow-auto">
      <Header showLanguageSwitcher={false} />
      <StickyFilters
        categoryTabs={<MockCategoryTabs />}
        dateSelector={<MockDateSelector />}
        filterButtons={<MockFilterButtons />}
        isSticky
      />
      <div className="px-4 py-4">
        <h2 className="text-foreground mb-4 text-lg font-semibold">
          Scroll down to see sticky behavior
        </h2>
        {/* Tall content to enable scrolling */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-card mb-4 h-24 rounded-lg p-4">
            <div className="bg-muted h-4 w-3/4 rounded" />
            <div className="bg-muted mt-2 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Scroll within this container to see how the StickyFilters stays fixed below the Header.",
      },
    },
  },
}

// Empty state
export const Empty: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story:
          "StickyFilters with no content. This is the minimum render state.",
      },
    },
  },
}
