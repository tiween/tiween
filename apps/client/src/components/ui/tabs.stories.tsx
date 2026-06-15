import { Calendar, Film, MapPin, Music, Star, Theater } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Badge } from "./badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Tabs component for organizing content into separate views. Built on Radix UI Tabs with keyboard navigation support.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="upcoming" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upcoming">À venir</TabsTrigger>
        <TabsTrigger value="past">Passés</TabsTrigger>
        <TabsTrigger value="saved">Favoris</TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Événements à venir</CardTitle>
            <CardDescription>
              Vos prochains événements réservés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vous avez 3 événements à venir.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="past" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Événements passés</CardTitle>
            <CardDescription>Historique de vos participations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vous avez assisté à 12 événements.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="saved" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Favoris</CardTitle>
            <CardDescription>
              Événements sauvegardés pour plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Vous avez 5 événements en favoris.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const EventCategories: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
        <TabsTrigger
          value="all"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full"
        >
          Tous
        </TabsTrigger>
        <TabsTrigger
          value="music"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full"
        >
          <Music className="mr-1 h-3 w-3" />
          Musique
        </TabsTrigger>
        <TabsTrigger
          value="cinema"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full"
        >
          <Film className="mr-1 h-3 w-3" />
          Cinéma
        </TabsTrigger>
        <TabsTrigger
          value="theatre"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full"
        >
          <Theater className="mr-1 h-3 w-3" />
          Théâtre
        </TabsTrigger>
        <TabsTrigger
          value="festival"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full"
        >
          <Star className="mr-1 h-3 w-3" />
          Festivals
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <div className="text-muted-foreground text-sm">
          Affichage de tous les événements (42 résultats)
        </div>
      </TabsContent>
      <TabsContent value="music" className="mt-4">
        <div className="text-muted-foreground text-sm">
          Concerts et spectacles musicaux (15 résultats)
        </div>
      </TabsContent>
      <TabsContent value="cinema" className="mt-4">
        <div className="text-muted-foreground text-sm">
          Films et avant-premières (12 résultats)
        </div>
      </TabsContent>
      <TabsContent value="theatre" className="mt-4">
        <div className="text-muted-foreground text-sm">
          Pièces de théâtre (8 résultats)
        </div>
      </TabsContent>
      <TabsContent value="festival" className="mt-4">
        <div className="text-muted-foreground text-sm">
          Festivals culturels (7 résultats)
        </div>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Tabs styled as category filters with icons, using pill-shaped styling.",
      },
    },
  },
}

export const TicketTypes: Story = {
  render: () => (
    <Tabs defaultValue="standard" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="standard">Standard</TabsTrigger>
        <TabsTrigger value="vip">
          VIP
          <Badge variant="secondary" className="ml-1.5 px-1.5 py-0">
            -10%
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="premium">Premium</TabsTrigger>
      </TabsList>
      <TabsContent value="standard" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billet Standard</CardTitle>
              <span className="text-2xl font-bold">25 TND</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>✓ Accès à l'événement</li>
              <li>✓ Place assise garantie</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="vip" className="mt-4">
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billet VIP</CardTitle>
              <div className="text-right">
                <span className="text-muted-foreground text-sm line-through">
                  75 TND
                </span>
                <span className="text-primary ml-2 text-2xl font-bold">
                  67.50 TND
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>✓ Accès à l'événement</li>
              <li>✓ Place au premier rang</li>
              <li>✓ Accès aux coulisses</li>
              <li>✓ Boisson offerte</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="premium" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billet Premium</CardTitle>
              <span className="text-2xl font-bold">150 TND</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>✓ Tous les avantages VIP</li>
              <li>✓ Rencontre avec les artistes</li>
              <li>✓ Cadeau souvenir</li>
              <li>✓ Parking réservé</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: "Tabs for selecting ticket types with pricing information.",
      },
    },
  },
}

export const EventDetails: Story = {
  render: () => (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="info">Infos</TabsTrigger>
        <TabsTrigger value="venue">Lieu</TabsTrigger>
        <TabsTrigger value="schedule">Horaires</TabsTrigger>
      </TabsList>
      <TabsContent value="info" className="mt-4 space-y-4">
        <div>
          <h3 className="font-semibold">À propos</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Une soirée exceptionnelle de jazz avec les meilleurs musiciens de la
            scène tunisienne. Préparez-vous pour une expérience musicale
            inoubliable.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Artistes</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Quartet Tunis Jazz, featuring guest artists
          </p>
        </div>
      </TabsContent>
      <TabsContent value="venue" className="mt-4 space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-semibold">Jazz Club Tunis</h3>
            <p className="text-muted-foreground text-sm">
              15 Rue de Carthage, Tunis 1000
            </p>
          </div>
        </div>
        <div className="bg-muted aspect-video w-full rounded-lg" />
      </TabsContent>
      <TabsContent value="schedule" className="mt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Calendar className="text-muted-foreground mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-semibold">15 Février 2025</h3>
            <p className="text-muted-foreground text-sm">Samedi soir</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ouverture des portes</span>
            <span>19h30</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Début du concert</span>
            <span>20h00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fin estimée</span>
            <span>23h00</span>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ),
  parameters: {
    docs: {
      description: {
        story: "Tabs for organizing event detail sections.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">القادمة</TabsTrigger>
          <TabsTrigger value="past">السابقة</TabsTrigger>
          <TabsTrigger value="saved">المفضلة</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>الفعاليات القادمة</CardTitle>
              <CardDescription>الفعاليات التي قمت بحجزها.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                لديك 3 فعاليات قادمة.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>الفعاليات السابقة</CardTitle>
              <CardDescription>سجل مشاركاتك.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">حضرت 12 فعالية.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>المفضلة</CardTitle>
              <CardDescription>الفعاليات المحفوظة.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                لديك 5 فعاليات في المفضلة.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Tabs in RTL mode with Arabic content.",
      },
    },
  },
}

export const Vertical: Story = {
  render: () => (
    <div className="flex gap-4">
      <TabsList className="flex h-auto w-40 flex-col items-stretch justify-start bg-transparent">
        <TabsTrigger value="profile" className="justify-start">
          Profil
        </TabsTrigger>
        <TabsTrigger value="tickets" className="justify-start">
          Mes billets
        </TabsTrigger>
        <TabsTrigger value="preferences" className="justify-start">
          Préférences
        </TabsTrigger>
        <TabsTrigger value="security" className="justify-start">
          Sécurité
        </TabsTrigger>
      </TabsList>
    </div>
  ),
  decorators: [
    (Story) => (
      <Tabs defaultValue="profile" className="flex w-full gap-4">
        <Story />
        <div className="flex-1">
          <TabsContent value="profile" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Profil</CardTitle>
                <CardDescription>
                  Gérez vos informations personnelles.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="tickets" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Mes billets</CardTitle>
                <CardDescription>Consultez vos billets.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="preferences" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Préférences</CardTitle>
                <CardDescription>
                  Personnalisez votre expérience.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Sécurité</CardTitle>
                <CardDescription>Gérez votre mot de passe.</CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Vertical tabs layout for settings or navigation sidebar.",
      },
    },
  },
}
