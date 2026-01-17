"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail, Phone, User } from "lucide-react"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Localized labels for GuestCheckoutForm
 */
export interface GuestCheckoutFormLabels {
  title: string
  description: string
  firstName: string
  firstNamePlaceholder: string
  lastName: string
  lastNamePlaceholder: string
  email: string
  emailPlaceholder: string
  emailHint: string
  phone: string
  phonePlaceholder: string
  phoneHint: string
  continueButton: string
  processing: string
  // Validation errors
  firstNameRequired: string
  lastNameRequired: string
  emailRequired: string
  emailInvalid: string
  phoneInvalid: string
}

const defaultLabels: GuestCheckoutFormLabels = {
  title: "Informations de contact",
  description: "Vos billets seront envoyés à cette adresse email",
  firstName: "Prénom",
  firstNamePlaceholder: "Jean",
  lastName: "Nom",
  lastNamePlaceholder: "Dupont",
  email: "Adresse email",
  emailPlaceholder: "jean.dupont@email.com",
  emailHint: "Vous recevrez vos billets et la confirmation de commande",
  phone: "Téléphone (optionnel)",
  phonePlaceholder: "XX XXX XXX",
  phoneHint: "Pour vous contacter en cas de changement",
  continueButton: "Continuer vers le paiement",
  processing: "Vérification...",
  firstNameRequired: "Le prénom est requis",
  lastNameRequired: "Le nom est requis",
  emailRequired: "L'email est requis",
  emailInvalid: "Adresse email invalide",
  phoneInvalid: "Numéro de téléphone invalide",
}

/**
 * Guest checkout data structure
 */
export interface GuestCheckoutData {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export interface GuestCheckoutFormProps {
  /** Called when form is submitted with valid data */
  onSubmit: (data: GuestCheckoutData) => void | Promise<void>
  /** Pre-fill form with existing data */
  defaultValues?: Partial<GuestCheckoutData>
  /** Show loading state on submit button */
  isLoading?: boolean
  /** Server-side error message */
  error?: string
  /** Localized labels */
  labels?: GuestCheckoutFormLabels
  /** Additional class names */
  className?: string
}

/**
 * Tunisia phone number validation (8 digits starting with 2, 5, 7, or 9)
 */
const tunisianPhoneRegex = /^[2579]\d{7}$/

const createGuestCheckoutSchema = (labels: GuestCheckoutFormLabels) =>
  z.object({
    firstName: z.string().min(1, labels.firstNameRequired),
    lastName: z.string().min(1, labels.lastNameRequired),
    email: z.string().min(1, labels.emailRequired).email(labels.emailInvalid),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || tunisianPhoneRegex.test(val.replace(/\s/g, "")),
        labels.phoneInvalid
      ),
  })

/**
 * GuestCheckoutForm - Collect contact information for non-authenticated users
 *
 * Features:
 * - Collects name, email, and optional phone
 * - Validates Tunisian phone numbers
 * - Email is required for ticket delivery
 * - RTL support via CSS logical properties
 *
 * @example
 * ```tsx
 * <GuestCheckoutForm
 *   onSubmit={(data) => {
 *     // Save guest info and proceed to payment
 *     setGuestInfo(data)
 *     router.push('/checkout/payment')
 *   }}
 * />
 * ```
 */
export function GuestCheckoutForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  error: serverError,
  labels = defaultLabels,
  className,
}: GuestCheckoutFormProps) {
  const schema = React.useMemo(
    () => createGuestCheckoutSchema(labels),
    [labels]
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestCheckoutData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
    },
  })

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {labels.title}
        </CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name fields - side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* First name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">{labels.firstName}</Label>
              <Input
                id="firstName"
                placeholder={labels.firstNamePlaceholder}
                disabled={isLoading}
                aria-invalid={!!errors.firstName}
                className={cn(errors.firstName && "border-destructive")}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p className="text-destructive text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            {/* Last name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">{labels.lastName}</Label>
              <Input
                id="lastName"
                placeholder={labels.lastNamePlaceholder}
                disabled={isLoading}
                aria-invalid={!!errors.lastName}
                className={cn(errors.lastName && "border-destructive")}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-destructive text-sm">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {labels.email}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={labels.emailPlaceholder}
              disabled={isLoading}
              aria-invalid={!!errors.email}
              aria-describedby="email-hint"
              className={cn(errors.email && "border-destructive")}
              {...register("email")}
            />
            <p id="email-hint" className="text-muted-foreground text-sm">
              {labels.emailHint}
            </p>
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {labels.phone}
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={labels.phonePlaceholder}
              disabled={isLoading}
              aria-invalid={!!errors.phone}
              aria-describedby="phone-hint"
              className={cn(errors.phone && "border-destructive")}
              {...register("phone")}
            />
            <p id="phone-hint" className="text-muted-foreground text-sm">
              {labels.phoneHint}
            </p>
            {errors.phone && (
              <p className="text-destructive text-sm">{errors.phone.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {serverError}
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {labels.processing}
              </>
            ) : (
              labels.continueButton
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

GuestCheckoutForm.displayName = "GuestCheckoutForm"
