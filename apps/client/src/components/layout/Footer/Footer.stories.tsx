import type { Meta, StoryObj } from "@storybook/react"

import { Footer } from "./Footer"

const meta: Meta<typeof Footer> = {
  title: "Layout/Footer",
  component: Footer,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Desktop footer with company links, legal information, and social media icons. Hidden on mobile (shown only on lg+ screens).",
      },
    },
    viewport: {
      defaultViewport: "desktop",
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "Default footer with French labels.",
      },
    },
  },
}

export const EnglishLabels: Story = {
  args: {
    labels: {
      company: "Company",
      legal: "Legal",
      social: "Follow Us",
      aboutUs: "About Us",
      careers: "Careers",
      press: "Press",
      contact: "Contact",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      cookies: "Cookies",
      copyright: "© 2024 Tiween. All rights reserved.",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Footer with English labels.",
      },
    },
  },
}

export const ArabicLabels: Story = {
  args: {
    labels: {
      company: "الشركة",
      legal: "قانوني",
      social: "تابعنا",
      aboutUs: "من نحن",
      careers: "وظائف",
      press: "الصحافة",
      contact: "اتصل بنا",
      terms: "شروط الاستخدام",
      privacy: "سياسة الخصوصية",
      cookies: "ملفات تعريف الارتباط",
      copyright: "© 2024 تيوين. جميع الحقوق محفوظة.",
    },
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
        story: "Footer in RTL mode with Arabic labels.",
      },
    },
  },
}

export const InPageContext: Story = {
  render: () => (
    <div className="bg-background flex min-h-screen flex-col">
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-screen-xl">
          <h1 className="text-foreground text-3xl font-bold">Page Content</h1>
          <p className="text-muted-foreground mt-4">
            The footer appears at the bottom of the page on desktop screens.
          </p>
          <div className="bg-muted/50 mt-8 h-96 rounded-lg p-8">
            <p className="text-muted-foreground">Main content area</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Footer shown in context at the bottom of a page layout.",
      },
    },
  },
}
