"use client"

import * as React from "react"
import { Filter, Menu, Settings, ShoppingCart, User, X } from "lucide-react"

import type { Meta, StoryObj } from "@storybook/react"

import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { Input } from "./input"
import { Label } from "./label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet"

const meta: Meta<typeof Sheet> = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Sheet component for slide-out panels. Built on Radix UI Dialog, supports four sides: top, right, bottom, left. Ideal for mobile navigation, filters, and cart drawers.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Ouvrir le panneau</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Titre du panneau</SheetTitle>
          <SheetDescription>
            Description du contenu de ce panneau latéral.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p className="text-muted-foreground text-sm">
            Contenu principal du panneau. Vous pouvez y mettre n'importe quel
            contenu.
          </p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Fermer</Button>
          </SheetClose>
          <Button>Enregistrer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const LeftSide: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Menu className="mr-2 h-4 w-4" />
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-2">
          <a
            href="#"
            className="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2"
          >
            Accueil
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
          >
            Événements
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
          >
            Mes billets
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
          >
            Profil
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "Left-side sheet for navigation menu.",
      },
    },
  },
}

export const FilterSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filtres
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filtrer les événements</SheetTitle>
          <SheetDescription>
            Affinez votre recherche avec les filtres ci-dessous.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-medium">Catégories</Label>
            <div className="space-y-2">
              {["Musique", "Cinéma", "Théâtre", "Festival", "Exposition"].map(
                (cat) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox id={cat.toLowerCase()} />
                    <Label htmlFor={cat.toLowerCase()} className="font-normal">
                      {cat}
                    </Label>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-base font-medium">Prix</Label>
            <div className="flex gap-2">
              <Input placeholder="Min" type="number" className="w-24" />
              <span className="text-muted-foreground flex items-center">-</span>
              <Input placeholder="Max" type="number" className="w-24" />
              <span className="text-muted-foreground flex items-center text-sm">
                TND
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-base font-medium">Période</Label>
            <div className="space-y-2">
              {[
                "Aujourd'hui",
                "Cette semaine",
                "Ce mois",
                "Prochains 3 mois",
              ].map((period) => (
                <div key={period} className="flex items-center space-x-2">
                  <Checkbox id={period.toLowerCase().replace(/\s/g, "-")} />
                  <Label
                    htmlFor={period.toLowerCase().replace(/\s/g, "-")}
                    className="font-normal"
                  >
                    {period}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" className="w-full">
            Réinitialiser
          </Button>
          <Button className="w-full">Appliquer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sheet for event filtering with checkboxes and price range.",
      },
    },
  },
}

export const CartSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Panier
          <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full text-xs">
            2
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Votre panier</SheetTitle>
          <SheetDescription>2 article(s) dans votre panier</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-auto py-4">
          <div className="space-y-4">
            {[
              {
                name: "Concert Jazz Night",
                qty: 2,
                price: 50,
                type: "Standard",
              },
              { name: "Festival du Film", qty: 1, price: 35, type: "VIP" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 border-b pb-4">
                <div className="bg-muted h-16 w-16 rounded-lg" />
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-muted-foreground text-sm">
                    {item.type} × {item.qty}
                  </p>
                  <p className="text-primary font-semibold">{item.price} TND</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span>85 TND</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frais de service</span>
            <span>5 TND</span>
          </div>
          <div className="mt-2 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">90 TND</span>
          </div>
        </div>
        <SheetFooter className="mt-4">
          <Button className="w-full">Passer la commande</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shopping cart sheet with order summary.",
      },
    },
  },
}

export const ProfileSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon">
          <User className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-full">
              <User className="text-primary h-8 w-8" />
            </div>
            <div>
              <SheetTitle>Ahmed Ben Ali</SheetTitle>
              <SheetDescription>ahmed@exemple.com</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          <a
            href="#"
            className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <User className="h-4 w-4" />
            Mon profil
          </a>
          <a
            href="#"
            className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <ShoppingCart className="h-4 w-4" />
            Mes billets
          </a>
          <a
            href="#"
            className="hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
          >
            <Settings className="h-4 w-4" />
            Paramètres
          </a>
        </nav>
        <SheetFooter className="mt-auto">
          <Button variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "User profile sheet with navigation links.",
      },
    },
  },
}

export const BottomSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Panneau du bas</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[50vh]">
        <SheetHeader>
          <SheetTitle>Sélectionner une date</SheetTitle>
          <SheetDescription>
            Choisissez la date pour votre réservation.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 py-4">
          {["Lun 15", "Mar 16", "Mer 17", "Jeu 18", "Ven 19", "Sam 20"].map(
            (day) => (
              <Button key={day} variant="outline" className="h-16">
                {day}
              </Button>
            )
          )}
        </div>
        <SheetFooter>
          <Button className="w-full">Confirmer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "Bottom sheet, ideal for mobile date/time pickers.",
      },
    },
  },
}

export const TopSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Notification du haut</Button>
      </SheetTrigger>
      <SheetContent side="top" className="h-auto">
        <div className="container flex items-center justify-between py-2">
          <p className="text-sm">
            🎉 Offre spéciale : -20% sur tous les billets ce week-end !
          </p>
          <SheetClose asChild>
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  ),
  parameters: {
    docs: {
      description: {
        story: "Top sheet for promotional banners or notifications.",
      },
    },
  },
}

export const RTLMode: Story = {
  render: () => (
    <div dir="rtl" className="font-arabic">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Menu className="ml-2 h-4 w-4" />
            القائمة
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>القائمة الرئيسية</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 space-y-2">
            <a
              href="#"
              className="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2"
            >
              الرئيسية
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
            >
              الفعاليات
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
            >
              تذاكري
            </a>
            <a
              href="#"
              className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2"
            >
              الملف الشخصي
            </a>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Sheet in RTL mode with Arabic content. Note the side is 'left' for RTL navigation.",
      },
    },
  },
}
