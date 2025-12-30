import { Locale } from "next-intl"
import { setRequestLocale } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Design System Test Page
 *
 * Displays all Tiween design tokens:
 * - Brand colors (tiween-green, tiween-yellow, surface variants)
 * - Typography (Lalezar, Inter, Noto Sans Arabic)
 * - Spacing scale (4px base)
 * - shadcn/ui components
 */

export default async function DesignSystemPage({
  params,
}: PageProps<"/[locale]/design-system">) {
  const { locale } = (await params) as { locale: Locale }
  setRequestLocale(locale)

  return (
    <main className="bg-background min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <header className="space-y-4">
          <h1 className="font-display text-foreground text-5xl">
            Tiween Design System
          </h1>
          <p className="text-muted-foreground text-lg">
            Design tokens, typography, and component samples for the Tiween
            platform.
          </p>
        </header>

        {/* Color Palette */}
        <section className="space-y-6">
          <h2 className="font-display text-foreground text-3xl">
            Color Palette
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Tiween Green */}
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="bg-tiween-green h-24" />
              <div className="bg-card p-4">
                <p className="text-card-foreground font-semibold">
                  Tiween Green
                </p>
                <p className="text-muted-foreground text-sm">#032523</p>
                <p className="text-muted-foreground text-xs">
                  Primary background
                </p>
              </div>
            </div>

            {/* Tiween Yellow */}
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="bg-tiween-yellow h-24" />
              <div className="bg-card p-4">
                <p className="text-card-foreground font-semibold">
                  Tiween Yellow
                </p>
                <p className="text-muted-foreground text-sm">#F8EB06</p>
                <p className="text-muted-foreground text-xs">Accent / CTA</p>
              </div>
            </div>

            {/* Surface */}
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="bg-surface h-24" />
              <div className="bg-card p-4">
                <p className="text-card-foreground font-semibold">Surface</p>
                <p className="text-muted-foreground text-sm">#0A3533</p>
                <p className="text-muted-foreground text-xs">Elevated cards</p>
              </div>
            </div>

            {/* Surface Light */}
            <div className="border-border overflow-hidden rounded-lg border">
              <div className="bg-surface-light h-24" />
              <div className="bg-card p-4">
                <p className="text-card-foreground font-semibold">
                  Surface Light
                </p>
                <p className="text-muted-foreground text-sm">#0F4542</p>
                <p className="text-muted-foreground text-xs">Hover states</p>
              </div>
            </div>
          </div>

          {/* Semantic Colors */}
          <h3 className="text-foreground text-xl font-semibold">
            Semantic Colors
          </h3>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-2">
              <div className="bg-primary h-12 rounded" />
              <p className="text-sm">Primary</p>
            </div>
            <div className="space-y-2">
              <div className="bg-secondary h-12 rounded" />
              <p className="text-sm">Secondary</p>
            </div>
            <div className="space-y-2">
              <div className="bg-muted h-12 rounded" />
              <p className="text-sm">Muted</p>
            </div>
            <div className="space-y-2">
              <div className="bg-accent h-12 rounded" />
              <p className="text-sm">Accent</p>
            </div>
            <div className="space-y-2">
              <div className="bg-destructive h-12 rounded" />
              <p className="text-sm">Destructive</p>
            </div>
            <div className="space-y-2">
              <div className="border-border bg-card h-12 rounded border-2" />
              <p className="text-sm">Card/Border</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <h2 className="font-display text-foreground text-3xl">Typography</h2>

          {/* Lalezar - Display Font */}
          <div className="bg-card space-y-4 rounded-lg p-6">
            <h3 className="text-foreground text-lg font-semibold">
              Lalezar (Display)
            </h3>
            <div className="space-y-2">
              <p className="font-display text-6xl">The quick brown fox</p>
              <p className="font-display text-4xl">يقفز فوق الكلب الكسول</p>
              <p className="font-display text-3xl">
                Le renard brun rapide saute
              </p>
            </div>
          </div>

          {/* Inter - Body Font */}
          <div className="bg-card space-y-4 rounded-lg p-6">
            <h3 className="text-foreground text-lg font-semibold">
              Inter (Body - Latin)
            </h3>
            <div className="space-y-2">
              <p className="text-xl font-normal">
                Regular: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-xl font-medium">
                Medium: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-xl font-semibold">
                Semibold: The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-xl font-bold">
                Bold: The quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </div>

          {/* Noto Sans Arabic */}
          <div className="bg-card space-y-4 rounded-lg p-6">
            <h3 className="text-foreground text-lg font-semibold">
              Noto Sans Arabic (Body - Arabic)
            </h3>
            <div className="space-y-2 text-right" dir="rtl">
              <p className="font-arabic text-xl font-normal">
                عادي: الثعلب البني السريع يقفز فوق الكلب الكسول.
              </p>
              <p className="font-arabic text-xl font-medium">
                متوسط: الثعلب البني السريع يقفز فوق الكلب الكسول.
              </p>
              <p className="font-arabic text-xl font-semibold">
                شبه سميك: الثعلب البني السريع يقفز فوق الكلب الكسول.
              </p>
              <p className="font-arabic text-xl font-bold">
                سميك: الثعلب البني السريع يقفز فوق الكلب الكسول.
              </p>
            </div>
          </div>
        </section>

        {/* Spacing Scale */}
        <section className="space-y-6">
          <h2 className="font-display text-foreground text-3xl">
            Spacing Scale (4px base)
          </h2>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
              <div key={n} className="flex items-center gap-4">
                <span className="text-muted-foreground w-16 text-sm">
                  {n} = {n * 4}px
                </span>
                <div
                  className="bg-tiween-yellow h-4"
                  style={{ width: `${n * 16}px` }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* shadcn/ui Components */}
        <section className="space-y-6">
          <h2 className="font-display text-foreground text-3xl">
            shadcn/ui Components
          </h2>

          {/* Buttons */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">🎫</Button>
            </div>
          </div>

          {/* Badges */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Badges</h3>
            <div className="flex flex-wrap gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge>VOST</Badge>
              <Badge variant="secondary">VF</Badge>
              <Badge>Concert</Badge>
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Cards</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Event Card</CardTitle>
                  <CardDescription>
                    A sample card using shadcn/ui
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm">Get Tickets</Button>
                </CardContent>
              </Card>

              <Card className="hover:bg-accent transition-colors">
                <CardHeader>
                  <CardTitle className="font-display">Interactive</CardTitle>
                  <CardDescription>Hover to see accent state</CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-surface border-0">
                <CardHeader>
                  <CardTitle className="font-display">Surface Card</CardTitle>
                  <CardDescription>Using surface color</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>

          {/* Tabs */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Tabs</h3>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="cinema">Cinema</TabsTrigger>
                <TabsTrigger value="concerts">Concerts</TabsTrigger>
                <TabsTrigger value="theatre">Theatre</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="bg-card rounded-lg p-4">
                All events content
              </TabsContent>
              <TabsContent value="cinema" className="bg-card rounded-lg p-4">
                Cinema events content
              </TabsContent>
              <TabsContent value="concerts" className="bg-card rounded-lg p-4">
                Concert events content
              </TabsContent>
              <TabsContent value="theatre" className="bg-card rounded-lg p-4">
                Theatre events content
              </TabsContent>
            </Tabs>
          </div>

          {/* Progress */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Progress</h3>
            <div className="space-y-2">
              <Progress value={33} />
              <Progress value={66} />
              <Progress value={100} />
            </div>
          </div>

          {/* Skeleton */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">Skeleton</h3>
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </div>

          {/* Inputs & Focus States */}
          <div className="space-y-4">
            <h3 className="text-foreground text-lg font-semibold">
              Inputs & Focus States (Tab through)
            </h3>
            <div className="flex flex-wrap gap-4">
              <Input
                type="text"
                placeholder="shadcn/ui Input"
                className="w-64"
              />
              <Button>Focusable Button</Button>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section className="space-y-6">
          <h2 className="font-display text-foreground text-3xl">
            Accessibility
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-tiween-green rounded-lg p-6">
              <p className="text-tiween-yellow text-2xl font-bold">
                Yellow on Dark Teal
              </p>
              <p className="text-muted-foreground text-sm">
                Contrast ratio: 12.5:1 (exceeds AAA)
              </p>
            </div>

            <div className="bg-tiween-green rounded-lg p-6">
              <p className="text-2xl font-bold text-white">
                White on Dark Teal
              </p>
              <p className="text-muted-foreground text-sm">
                Contrast ratio: 15.8:1 (exceeds AAA)
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-border text-muted-foreground border-t pt-8 text-center text-sm">
          <p>
            Tiween Design System &bull; Built with Tailwind CSS v4 &bull;
            Current locale: {locale}
          </p>
        </footer>
      </div>
    </main>
  )
}
