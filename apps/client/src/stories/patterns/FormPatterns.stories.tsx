"use client"

import * as React from "react"
import {
  Calendar,
  ChevronRight,
  CreditCard,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react"

import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

/**
 * Form pattern compositions demonstrating how to combine UI primitives
 * into complete, production-ready form experiences.
 */
const meta: Meta = {
  title: "Patterns/Forms",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Reusable form patterns for common use cases: checkout, authentication, profile editing, and contact forms. These patterns combine Input, Select, Checkbox, and Button components with proper validation states and accessibility.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

// ============================================================================
// CHECKOUT FORM PATTERN
// ============================================================================

export const CheckoutForm: Story = {
  render: function CheckoutFormExample() {
    const [paymentMethod, setPaymentMethod] = React.useState("card")

    return (
      <div className="mx-auto max-w-lg space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">Concert Jazz Night</p>
                <p className="text-muted-foreground text-sm">2x Catégorie A</p>
              </div>
              <span className="font-semibold">50 TND</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sous-total</span>
              <span>50 TND</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Frais de service</span>
              <span>2 TND</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">52 TND</span>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informations de contact</CardTitle>
            <CardDescription>
              Nous enverrons vos billets à cette adresse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" placeholder="Ahmed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" placeholder="Ben Ali" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ahmed@exemple.com"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mode de paiement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`border-border flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span className="font-medium">Carte</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`border-border flex items-center justify-center gap-2 rounded-lg border p-4 transition-colors ${
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                <MapPin className="h-5 w-5" />
                <span className="font-medium">Sur place</span>
              </button>
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Numéro de carte</Label>
                  <div className="relative">
                    <CreditCard className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input
                      id="cardNumber"
                      placeholder="4242 4242 4242 4242"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Date d'expiration</Label>
                    <Input id="expiry" placeholder="MM/AA" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="123" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "cash" && (
              <div className="bg-muted rounded-lg p-4">
                <p className="text-muted-foreground text-sm">
                  Payez en espèces au guichet le jour de l'événement. Présentez
                  votre confirmation de réservation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Terms & Submit */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox id="terms" />
            <Label
              htmlFor="terms"
              className="text-muted-foreground text-sm leading-relaxed"
            >
              J'accepte les{" "}
              <a href="#" className="text-primary hover:underline">
                conditions générales de vente
              </a>{" "}
              et la{" "}
              <a href="#" className="text-primary hover:underline">
                politique de confidentialité
              </a>
            </Label>
          </div>
          <Button className="w-full" size="lg">
            Payer 52 TND
          </Button>
        </div>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Complete checkout form with order summary, contact information, payment method selection (card/cash), and terms acceptance. Demonstrates form sections, input icons, and conditional rendering.",
      },
    },
  },
}

// ============================================================================
// LOGIN FORM PATTERN
// ============================================================================

export const LoginForm: Story = {
  render: function LoginFormExample() {
    const [isLoading, setIsLoading] = React.useState(false)

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      setIsLoading(true)
      setTimeout(() => setIsLoading(false), 2000)
    }

    return (
      <div className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
              <span className="text-primary text-xl font-bold">T</span>
            </div>
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              Accédez à vos billets et réservations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nom@exemple.com"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <a href="#" className="text-primary text-xs hover:underline">
                    Oublié ?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label
                  htmlFor="remember"
                  className="text-muted-foreground text-sm"
                >
                  Rester connecté
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <div className="text-muted-foreground relative w-full text-center text-sm">
              <span className="bg-card relative z-10 px-2">ou</span>
              <Separator className="absolute top-1/2 right-0 left-0" />
            </div>
            <Button variant="outline" className="w-full">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Pas encore de compte ?{" "}
              <a href="#" className="text-primary hover:underline">
                S'inscrire
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Login form with email/password fields, remember me checkbox, forgot password link, social login option, and signup link. Includes loading state handling.",
      },
    },
  },
}

// ============================================================================
// REGISTRATION FORM PATTERN
// ============================================================================

export const RegistrationForm: Story = {
  render: function RegistrationFormExample() {
    return (
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Créer un compte</CardTitle>
            <CardDescription>
              Rejoignez Tiween pour réserver vos événements préférés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reg-firstName">Prénom</Label>
                <Input id="reg-firstName" placeholder="Ahmed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-lastName">Nom</Label>
                <Input id="reg-lastName" placeholder="Ben Ali" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="ahmed@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-phone">Téléphone (optionnel)</Label>
              <Input id="reg-phone" type="tel" placeholder="+216 XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Mot de passe</Label>
              <Input
                id="reg-password"
                type="password"
                placeholder="Minimum 8 caractères"
              />
              <p className="text-muted-foreground text-xs">
                Doit contenir au moins 8 caractères, une majuscule et un chiffre
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-confirm">Confirmer le mot de passe</Label>
              <Input id="reg-confirm" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Checkbox id="reg-newsletter" />
                <Label
                  htmlFor="reg-newsletter"
                  className="text-muted-foreground text-sm leading-relaxed"
                >
                  Je souhaite recevoir les actualités et offres par email
                </Label>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="reg-terms" />
                <Label
                  htmlFor="reg-terms"
                  className="text-muted-foreground text-sm leading-relaxed"
                >
                  J'accepte les{" "}
                  <a href="#" className="text-primary hover:underline">
                    conditions d'utilisation
                  </a>
                </Label>
              </div>
            </div>
            <Button className="w-full">Créer mon compte</Button>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-muted-foreground text-sm">
              Déjà un compte ?{" "}
              <a href="#" className="text-primary hover:underline">
                Se connecter
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Registration form with name fields, email, phone, password with confirmation, newsletter opt-in, and terms acceptance.",
      },
    },
  },
}

// ============================================================================
// PROFILE EDIT FORM PATTERN
// ============================================================================

export const ProfileEditForm: Story = {
  render: function ProfileEditFormExample() {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Mettez à jour vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                <User className="text-muted-foreground h-8 w-8" />
              </div>
              <Button variant="outline" size="sm">
                Changer la photo
              </Button>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-firstName">Prénom</Label>
                <Input id="profile-firstName" defaultValue="Ahmed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-lastName">Nom</Label>
                <Input id="profile-lastName" defaultValue="Ben Ali" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                defaultValue="ahmed@exemple.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Téléphone</Label>
              <Input
                id="profile-phone"
                type="tel"
                defaultValue="+216 98 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-city">Ville</Label>
              <Select defaultValue="tunis">
                <SelectTrigger id="profile-city">
                  <SelectValue placeholder="Sélectionnez une ville" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tunis">Tunis</SelectItem>
                  <SelectItem value="sfax">Sfax</SelectItem>
                  <SelectItem value="sousse">Sousse</SelectItem>
                  <SelectItem value="gabes">Gabès</SelectItem>
                  <SelectItem value="bizerte">Bizerte</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Annuler</Button>
            <Button>Enregistrer</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>Personnalisez votre expérience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-language">Langue</Label>
              <Select defaultValue="fr">
                <SelectTrigger id="profile-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Notifications</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="notif-email" defaultChecked />
                  <Label htmlFor="notif-email" className="font-normal">
                    Notifications par email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="notif-sms" />
                  <Label htmlFor="notif-sms" className="font-normal">
                    Notifications SMS
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="notif-promo" defaultChecked />
                  <Label htmlFor="notif-promo" className="font-normal">
                    Offres et promotions
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Annuler</Button>
            <Button>Enregistrer</Button>
          </CardFooter>
        </Card>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Profile editing form with avatar upload, personal information, city selector, language preference, and notification settings.",
      },
    },
  },
}

// ============================================================================
// CONTACT FORM PATTERN
// ============================================================================

export const ContactForm: Story = {
  render: function ContactFormExample() {
    return (
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Contactez-nous</CardTitle>
            <CardDescription>
              Une question ? Remplissez le formulaire ci-dessous et nous vous
              répondrons sous 24h
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Nom complet</Label>
              <Input id="contact-name" placeholder="Votre nom" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="votre@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Sujet</Label>
              <Select>
                <SelectTrigger id="contact-subject">
                  <SelectValue placeholder="Sélectionnez un sujet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order">Ma commande</SelectItem>
                  <SelectItem value="refund">
                    Demande de remboursement
                  </SelectItem>
                  <SelectItem value="technical">Problème technique</SelectItem>
                  <SelectItem value="partnership">Partenariat</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-order">
                Numéro de commande (optionnel)
              </Label>
              <Input id="contact-order" placeholder="TIW-XXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <textarea
                id="contact-message"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Décrivez votre demande..."
              />
            </div>
            <Button className="w-full">Envoyer</Button>
          </CardContent>
        </Card>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Contact form with subject dropdown, optional order number field, and message textarea.",
      },
    },
  },
}

// ============================================================================
// RTL FORM PATTERN
// ============================================================================

export const RTLCheckoutForm: Story = {
  render: function RTLCheckoutFormExample() {
    return (
      <div dir="rtl" className="font-arabic mx-auto max-w-lg">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">معلومات الاتصال</CardTitle>
            <CardDescription>سنرسل تذاكرك إلى هذا العنوان</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rtl-firstName">الاسم الأول</Label>
                <Input id="rtl-firstName" placeholder="أحمد" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rtl-lastName">اسم العائلة</Label>
                <Input id="rtl-lastName" placeholder="بن علي" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtl-email">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="rtl-email"
                  type="email"
                  placeholder="ahmed@exemple.com"
                  className="pr-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtl-phone">رقم الهاتف</Label>
              <div className="relative">
                <Phone className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  id="rtl-phone"
                  type="tel"
                  placeholder="+216 XX XXX XXX"
                  className="pr-10"
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox id="rtl-terms" />
              <Label
                htmlFor="rtl-terms"
                className="text-muted-foreground text-sm leading-relaxed"
              >
                أوافق على{" "}
                <a href="#" className="text-primary hover:underline">
                  شروط البيع
                </a>{" "}
                و{" "}
                <a href="#" className="text-primary hover:underline">
                  سياسة الخصوصية
                </a>
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg">
              الدفع 52 دينار
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Checkout form in RTL mode with Arabic content. Note the icon positioning adapts to RTL layout.",
      },
    },
  },
}
