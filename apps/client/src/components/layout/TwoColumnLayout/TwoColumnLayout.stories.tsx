import { Calendar, MapPin, Star } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

import { Sidebar } from "../Sidebar"
import { TwoColumnLayout } from "./TwoColumnLayout"

const meta: Meta<typeof TwoColumnLayout> = {
  title: "Layout/TwoColumnLayout",
  component: TwoColumnLayout,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Responsive two-column layout with main content and sidebar. Stacks vertically on mobile, side-by-side on desktop (lg+). Supports RTL via logical positioning.",
      },
    },
    viewport: {
      defaultViewport: "desktop",
    },
  },
  tags: ["autodocs"],
  argTypes: {
    sidebarPosition: {
      control: "select",
      options: ["start", "end"],
      description: "Sidebar position (end = right in LTR, left in RTL)",
    },
    sidebarWidth: {
      control: "select",
      options: [3, 4, 5],
      description: "Sidebar width (of 12 columns)",
    },
    gap: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
      description: "Gap between columns",
    },
    stickySidebar: {
      control: "boolean",
      description: "Makes sidebar sticky on scroll",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const MainContent = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Contenu principal</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Ceci est la zone de contenu principal. Elle occupe la majorité de
          l'espace disponible et s'adapte à la largeur restante après le
          sidebar.
        </p>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  </div>
)

const SidebarContent = () => (
  <Sidebar title="Filtres" bordered>
    <div className="space-y-4">
      <div className="space-y-2">
        {["Option A", "Option B", "Option C"].map((opt) => (
          <div key={opt} className="flex items-center gap-2">
            <Checkbox id={opt.toLowerCase().replace(" ", "-")} />
            <Label htmlFor={opt.toLowerCase().replace(" ", "-")}>{opt}</Label>
          </div>
        ))}
      </div>
      <Button className="w-full">Appliquer</Button>
    </div>
  </Sidebar>
)

export const Default: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarPosition: "end",
    sidebarWidth: 4,
    gap: "lg",
  },
}

export const SidebarStart: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarPosition: "start",
    sidebarWidth: 4,
    gap: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Sidebar positioned at the start (left in LTR, right in RTL).",
      },
    },
  },
}

export const NarrowSidebar: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarPosition: "end",
    sidebarWidth: 3,
    gap: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Narrow sidebar (3/12 columns).",
      },
    },
  },
}

export const WideSidebar: Story = {
  args: {
    children: <MainContent />,
    sidebar: <SidebarContent />,
    sidebarPosition: "end",
    sidebarWidth: 5,
    gap: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Wide sidebar (5/12 columns).",
      },
    },
  },
}

export const EventDetailPage: Story = {
  render: () => (
    <TwoColumnLayout
      sidebarPosition="end"
      sidebarWidth={4}
      stickySidebar
      sidebar={
        <Sidebar bordered filled>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Concert Jazz Night</h2>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4" />
                Jazz Club Tunis
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                <Calendar className="h-4 w-4" />
                15 Février 2025, 20h00
              </div>
            </div>
            <div className="border-border border-t pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground text-sm">
                  À partir de
                </span>
                <span className="text-primary text-2xl font-bold">25 TND</span>
              </div>
            </div>
            <Button className="w-full" size="lg">
              Réserver
            </Button>
          </div>
        </Sidebar>
      }
    >
      <div className="space-y-6">
        {/* Hero image placeholder */}
        <div className="bg-muted relative aspect-video overflow-hidden rounded-xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-muted-foreground">Image de l'événement</span>
          </div>
        </div>

        {/* Event details */}
        <div>
          <div className="flex items-center gap-2">
            <Badge>Musique</Badge>
            <Badge variant="outline">Jazz</Badge>
          </div>
          <h1 className="text-foreground mt-3 text-3xl font-bold">
            Concert Jazz Night
          </h1>
          <div className="text-muted-foreground mt-2 flex items-center gap-1">
            <Star className="text-primary h-4 w-4 fill-current" />
            <span>4.8</span>
            <span className="mx-1">•</span>
            <span>124 avis</span>
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>À propos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Une soirée exceptionnelle de jazz avec les meilleurs musiciens de
              la scène tunisienne. Préparez-vous pour une expérience musicale
              inoubliable dans l'ambiance chaleureuse du Jazz Club Tunis.
            </p>
          </CardContent>
        </Card>
      </div>
    </TwoColumnLayout>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Two-column layout used for event detail page with sticky booking sidebar.",
      },
    },
  },
}

export const SearchResultsPage: Story = {
  render: () => (
    <TwoColumnLayout
      sidebarPosition="start"
      sidebarWidth={3}
      sidebar={
        <Sidebar title="Filtrer" bordered>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Catégories</h3>
              <div className="space-y-2">
                {["Musique", "Cinéma", "Théâtre", "Festival"].map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox id={cat.toLowerCase()} />
                    <Label htmlFor={cat.toLowerCase()} className="font-normal">
                      {cat}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Prix</h3>
              <div className="space-y-2">
                {["Gratuit", "< 20 TND", "20-50 TND", "> 50 TND"].map(
                  (price) => (
                    <div key={price} className="flex items-center gap-2">
                      <Checkbox
                        id={price.toLowerCase().replace(/[^a-z0-9]/g, "-")}
                      />
                      <Label
                        htmlFor={price.toLowerCase().replace(/[^a-z0-9]/g, "-")}
                        className="font-normal"
                      >
                        {price}
                      </Label>
                    </div>
                  )
                )}
              </div>
            </div>
            <Button className="w-full">Appliquer</Button>
          </div>
        </Sidebar>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-2xl font-bold">
            Résultats de recherche
          </h1>
          <span className="text-muted-foreground text-sm">42 événements</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[3/4] w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TwoColumnLayout>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Two-column layout for search results with filter sidebar on the left.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <TwoColumnLayout
        sidebarPosition="end"
        sidebarWidth={4}
        sidebar={
          <Sidebar title="الفلاتر" bordered>
            <div className="space-y-4">
              <div className="space-y-2">
                {["موسيقى", "سينما", "مسرح"].map((cat) => (
                  <div key={cat} className="flex items-center gap-2">
                    <Checkbox id={cat} />
                    <Label htmlFor={cat}>{cat}</Label>
                  </div>
                ))}
              </div>
              <Button className="w-full">تطبيق</Button>
            </div>
          </Sidebar>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>المحتوى الرئيسي</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              هذا هو المحتوى الرئيسي للصفحة. يتكيف التخطيط تلقائيًا مع اتجاه
              RTL.
            </p>
          </CardContent>
        </Card>
      </TwoColumnLayout>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Two-column layout in RTL mode with Arabic content. Note how the sidebar position adapts.",
      },
    },
  },
}

export const GapVariants: Story = {
  render: () => (
    <div className="space-y-8">
      {(["sm", "md", "lg", "xl"] as const).map((gap) => (
        <div key={gap}>
          <p className="text-muted-foreground mb-2 text-sm">Gap: {gap}</p>
          <TwoColumnLayout
            gap={gap}
            sidebarWidth={4}
            sidebar={
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">Sidebar</p>
              </div>
            }
          >
            <div className="bg-muted rounded-lg p-4">
              <p className="text-muted-foreground text-sm">Main Content</p>
            </div>
          </TwoColumnLayout>
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different gap sizes between columns.",
      },
    },
  },
}
