import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { MaxWidthContainer } from "./MaxWidthContainer"

const meta: Meta<typeof MaxWidthContainer> = {
  title: "Layout/MaxWidthContainer",
  component: MaxWidthContainer,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Container that constrains content width to 1280px (or 768px for narrow) and centers it. The primary wrapper for page content on desktop.",
      },
    },
    viewport: {
      defaultViewport: "desktop",
    },
  },
  tags: ["autodocs"],
  argTypes: {
    narrow: {
      control: "boolean",
      description: "Uses narrower max-width (768px) for focused content",
    },
    noPadding: {
      control: "boolean",
      description: "Removes horizontal padding",
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="bg-muted/30 min-h-screen py-8">
      <MaxWidthContainer>
        <Card>
          <CardHeader>
            <CardTitle>Default Container (1280px)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This content is constrained to a maximum width of 1280px and
              centered horizontally. It has default horizontal padding (px-4 on
              mobile, px-8 on desktop).
            </p>
            <div className="bg-primary/10 mt-4 rounded-lg p-4">
              <p className="text-sm">Full width content inside the container</p>
            </div>
          </CardContent>
        </Card>
      </MaxWidthContainer>
    </div>
  ),
}

export const Narrow: Story = {
  render: () => (
    <div className="bg-muted/30 min-h-screen py-8">
      <MaxWidthContainer narrow>
        <Card>
          <CardHeader>
            <CardTitle>Narrow Container (768px)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This content uses a narrower max-width of 768px. Ideal for focused
              content like authentication forms, article content, or
              single-column layouts.
            </p>
          </CardContent>
        </Card>
      </MaxWidthContainer>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Narrow container for focused content like forms.",
      },
    },
  },
}

export const NoPadding: Story = {
  render: () => (
    <div className="bg-muted/30 min-h-screen py-8">
      <MaxWidthContainer noPadding>
        <div className="bg-primary/10 p-8">
          <h2 className="text-xl font-bold">No Padding Container</h2>
          <p className="text-muted-foreground mt-2">
            This container has no horizontal padding, useful for edge-to-edge
            content like hero sections or full-bleed images.
          </p>
        </div>
      </MaxWidthContainer>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Container without horizontal padding for edge-to-edge content.",
      },
    },
  },
}

export const LoginPage: Story = {
  render: () => (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <MaxWidthContainer narrow>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <span className="text-primary text-xl">🎫</span>
            </div>
            <CardTitle>Connexion</CardTitle>
            <p className="text-muted-foreground text-sm">
              Connectez-vous pour accéder à vos billets
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nom@exemple.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <Button className="w-full">Se connecter</Button>
            <p className="text-muted-foreground text-center text-sm">
              Pas encore de compte ?{" "}
              <a href="#" className="text-primary hover:underline">
                S&apos;inscrire
              </a>
            </p>
          </CardContent>
        </Card>
      </MaxWidthContainer>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Narrow container used for a centered login form.",
      },
    },
  },
}

export const PageLayout: Story = {
  render: () => (
    <div className="bg-background min-h-screen">
      {/* Header placeholder */}
      <div className="border-border bg-background/95 sticky top-0 z-40 border-b">
        <MaxWidthContainer>
          <div className="flex h-16 items-center justify-between">
            <span className="font-bold">Tiween</span>
            <nav className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Accueil
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Événements
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                Billets
              </a>
            </nav>
          </div>
        </MaxWidthContainer>
      </div>

      {/* Hero section - full bleed */}
      <MaxWidthContainer noPadding>
        <div className="bg-primary/10 py-24 text-center">
          <MaxWidthContainer narrow>
            <h1 className="text-4xl font-bold">Découvrez les événements</h1>
            <p className="text-muted-foreground mt-4">
              Concerts, cinéma, théâtre et plus encore
            </p>
          </MaxWidthContainer>
        </div>
      </MaxWidthContainer>

      {/* Content section */}
      <MaxWidthContainer className="py-12">
        <h2 className="text-2xl font-bold">Événements à venir</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="bg-muted aspect-video" />
              <CardContent className="p-4">
                <h3 className="font-semibold">Événement {i}</h3>
                <p className="text-muted-foreground text-sm">Description</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </MaxWidthContainer>

      {/* Footer */}
      <div className="border-border bg-secondary border-t">
        <MaxWidthContainer className="py-8">
          <p className="text-muted-foreground text-center text-sm">
            © 2024 Tiween. Tous droits réservés.
          </p>
        </MaxWidthContainer>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Full page layout demonstrating various MaxWidthContainer usages.",
      },
    },
  },
}

export const ComparisonChart: Story = {
  render: () => (
    <div className="bg-muted/30 space-y-8 py-8">
      <MaxWidthContainer>
        <div className="bg-primary/5 border-primary/20 rounded-lg border-2 border-dashed p-4">
          <p className="text-center font-mono text-sm">
            Default: max-w-screen-xl (1280px)
          </p>
        </div>
      </MaxWidthContainer>
      <MaxWidthContainer narrow>
        <div className="bg-secondary/50 border-secondary rounded-lg border-2 border-dashed p-4">
          <p className="text-center font-mono text-sm">
            Narrow: max-w-3xl (768px)
          </p>
        </div>
      </MaxWidthContainer>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Visual comparison of default and narrow container widths.",
      },
    },
  },
}
