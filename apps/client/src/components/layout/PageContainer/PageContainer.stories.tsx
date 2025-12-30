import type { Meta, StoryObj } from "@storybook/react"

import { BottomNav } from "../BottomNav"
import { Header } from "../Header"
import { PageContainer } from "./PageContainer"

const meta: Meta<typeof PageContainer> = {
  title: "Layout/PageContainer",
  component: PageContainer,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    hasBottomNav: {
      control: "boolean",
      description: "Whether to add bottom padding for BottomNav clearance",
    },
    maxWidth: {
      control: "select",
      options: ["sm", "md", "lg", "xl", "2xl", "full"],
      description: "Max width constraint",
    },
    noPadding: {
      control: "boolean",
      description: "Remove horizontal padding",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Sample content for stories
const SampleContent = () => (
  <div className="space-y-4">
    <div className="bg-card rounded-lg p-4">
      <h2 className="text-foreground text-lg font-semibold">
        Sample Content Block
      </h2>
      <p className="text-muted-foreground mt-2">
        This is a sample content block to demonstrate the PageContainer layout.
        The container provides proper padding and max-width constraints.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-lg p-4">
          <h3 className="text-foreground font-medium">Card {i}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Sample card content
          </p>
        </div>
      ))}
    </div>
  </div>
)

// Default with bottom nav clearance
export const Default: Story = {
  args: {
    hasBottomNav: true,
    maxWidth: "xl",
    children: <SampleContent />,
  },
}

// Without bottom nav
export const NoBottomNav: Story = {
  args: {
    hasBottomNav: false,
    maxWidth: "xl",
    children: <SampleContent />,
  },
}

// Full width
export const FullWidth: Story = {
  args: {
    hasBottomNav: true,
    maxWidth: "full",
    children: <SampleContent />,
  },
}

// No padding (for full-bleed content)
export const NoPadding: Story = {
  args: {
    hasBottomNav: true,
    maxWidth: "xl",
    noPadding: true,
    children: (
      <div className="bg-card p-4">
        <h2 className="text-foreground text-lg font-semibold">
          Full Bleed Content
        </h2>
        <p className="text-muted-foreground mt-2">
          This content stretches edge to edge without horizontal padding.
        </p>
      </div>
    ),
  },
}

// Complete page layout with Header and BottomNav
export const CompleteLayout: Story = {
  render: () => (
    <div className="bg-background relative min-h-screen">
      <Header showLogo showLanguageSwitcher />
      <PageContainer hasBottomNav>
        <SampleContent />
        <div className="bg-card mt-8 rounded-lg p-4">
          <h2 className="text-foreground text-lg font-semibold">
            More Content
          </h2>
          <p className="text-muted-foreground mt-2">
            This demonstrates the complete page layout with Header, content in
            PageContainer, and BottomNav. Notice the proper spacing and padding.
          </p>
        </div>
      </PageContainer>
      <BottomNav activeTab="home" onNavigate={() => {}} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Complete page layout with Header, PageContainer, and BottomNav components working together.",
      },
    },
  },
}

// RTL mode
export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="bg-background relative min-h-screen">
      <Header showLogo showLanguageSwitcher />
      <PageContainer hasBottomNav>
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-4">
            <h2 className="text-foreground text-lg font-semibold">
              محتوى باللغة العربية
            </h2>
            <p className="text-muted-foreground mt-2">
              هذا مثال على محتوى الصفحة في وضع اليمين إلى اليسار.
            </p>
          </div>
        </div>
      </PageContainer>
      <BottomNav activeTab="home" onNavigate={() => {}} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Complete layout in RTL mode for Arabic content.",
      },
    },
  },
}
