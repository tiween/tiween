"use client"

import * as React from "react"
import Script from "next/script"
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_TYPES_ATTR,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  PREFERRED_LANGUAGES,
  toRegistrationPayload,
  VENUE_REGISTRATION_ERROR_CODES,
  VENUE_TYPES,
  venueRegistrationFormSchema,
} from "@/features/venues/schemas/venue-registration"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"

import type {
  VenueRegistrationErrorCode,
  VenueRegistrationFormValues,
} from "@/features/venues/schemas/venue-registration"
import type { FieldError, Resolver } from "react-hook-form"

import { AppField } from "@/components/forms/AppField"
import { AppForm } from "@/components/forms/AppForm"
import { AppSelect } from "@/components/forms/AppSelect"
import { AppTextArea } from "@/components/forms/AppTextArea"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

const FORM_ID = "venueRegistrationForm"

/**
 * The media limits and the email-locale list are IMPORTED from the schema
 * module — this component used to redeclare both (`ACCEPTED_IMAGE_TYPES` as its
 * own string, `EMAIL_LOCALES` duplicating `PREFERRED_LANGUAGES`), which let the
 * picker's advertised limits drift from the ones the API route enforces.
 *
 * Reject an attached file here, BEFORE submitting: the route now answers 400
 * with `IMAGE_TOO_LARGE` / `IMAGE_TYPE_INVALID` / `IMAGES_TOO_MANY` rather than
 * dropping the file silently, and a one-shot application form should tell the
 * applicant what is wrong while they can still fix it.
 */
function checkImage(
  file: File
): "IMAGE_TOO_LARGE" | "IMAGE_TYPE_INVALID" | null {
  if (file.size > MAX_IMAGE_BYTES) return "IMAGE_TOO_LARGE"
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "IMAGE_TYPE_INVALID"
  }
  return null
}

/** Minimal shape of the reCAPTCHA v3 global, when the script is loaded. */
interface Grecaptcha {
  ready: (cb: () => void) => void
  execute: (siteKey: string, opts: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha
  }
}

/**
 * Resolve a reCAPTCHA v3 token, or `undefined` when reCAPTCHA is not configured
 * / not loaded. The server decides whether a missing token is fatal (it only
 * enforces when `RECAPTCHA_SECRET_KEY` is set), so a failure here must not block
 * the submit path client-side.
 */
async function getRecaptchaToken(
  siteKey: string | undefined
): Promise<string | undefined> {
  if (!siteKey || typeof window === "undefined" || !window.grecaptcha) {
    return undefined
  }
  try {
    const grecaptcha = window.grecaptcha
    // `ready` is NOT optional politeness. The script loads with
    // `strategy="lazyOnload"`, so `window.grecaptcha` can exist while its
    // internals are still initializing; calling `execute` then resolves
    // `undefined`, the bare catch swallows it, no token is appended, and the
    // server answers 400 RECAPTCHA_REQUIRED with nothing the applicant can do
    // about it. Waiting for `ready` is what makes an early submit work.
    await new Promise<void>((resolve) => grecaptcha.ready(resolve))
    return await grecaptcha.execute(siteKey, {
      action: "venue_registration",
    })
  } catch {
    return undefined
  }
}

/**
 * Public venue-registration form (Story 7.1).
 *
 * Single submission surface for a venue owner applying to the platform. Submits
 * as `FormData` to `/api/venues/register` (multipart, because the logo and
 * photos ride along) and, on success, REPLACES itself with an "under review"
 * panel — the application is a one-shot action, so leaving the form mounted
 * would invite a duplicate submission that the backend would only reject with
 * `EMAIL_ALREADY_REGISTERED`.
 *
 * Errors arrive as CODES and are translated through
 * `venues.register.errors.<CODE>`; a raw code is never rendered.
 */
export function VenueRegistrationForm() {
  const t = useTranslations("venues.register")
  const locale = useLocale()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [logo, setLogo] = React.useState<File | null>(null)
  const [images, setImages] = React.useState<File[]>([])

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  /**
   * Translate an error CODE. A code outside the known vocabulary falls back to
   * the generic failure message: rendering an untranslated raw code at the user
   * is exactly what the "errors are codes, not prose" rule forbids leaking.
   */
  const translateError = React.useCallback(
    (code: string) => {
      const known: VenueRegistrationErrorCode = (
        VENUE_REGISTRATION_ERROR_CODES as readonly string[]
      ).includes(code)
        ? (code as VenueRegistrationErrorCode)
        : "VENUE_REGISTRATION_FAILED"
      return t(`errors.${known}`)
    },
    [t]
  )

  /**
   * The schema's issue messages are CODES and `FormMessage` renders
   * `error.message` verbatim, so translate at the resolver boundary — otherwise
   * the form would print `VENUE_NAME_REQUIRED` under the field.
   */
  const resolver = React.useMemo<Resolver<VenueRegistrationFormValues>>(() => {
    const base = zodResolver(venueRegistrationFormSchema)
    return async (values, context, options) => {
      const result = await base(values, context, options)
      if (!result.errors) return result

      const translated = Object.fromEntries(
        Object.entries(result.errors).map(([field, error]) => [
          field,
          {
            ...(error as FieldError),
            message: translateError(
              String((error as FieldError | undefined)?.message ?? "")
            ),
          },
        ])
      )
      return { ...result, errors: translated }
    }
  }, [translateError])

  const form = useForm<VenueRegistrationFormValues>({
    resolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      address: "",
      // `type` MUST have a defined default even though "" is not a valid
      // choice: omitting it leaves the Radix select value `undefined` on the
      // first render and defined after the first pick, which is exactly the
      // uncontrolled→controlled transition React warns about. The schema still
      // requires a real enum member, so "" can never be submitted.
      type: "" as unknown as VenueRegistrationFormValues["type"],
      phone: "",
      venueEmail: "",
      website: "",
      capacity: "",
      firstName: "",
      lastName: "",
      managerEmail: "",
      password: "",
      passwordConfirmation: "",
    },
  })

  const typeOptions = VENUE_TYPES.map((value) => ({
    value,
    label: t(`types.${value}`),
  }))

  async function onSubmit(values: VenueRegistrationFormValues) {
    // Media pre-flight. The route rejects an unacceptable file with a 400 CODE
    // instead of dropping it, so catching it here saves the applicant a full
    // round trip and names the offending constraint.
    const attached = [...(logo ? [logo] : []), ...images]
    for (const file of attached) {
      const problem = checkImage(file)
      if (problem) {
        toast({ variant: "destructive", description: translateError(problem) })
        return
      }
    }
    if (images.length > MAX_IMAGES) {
      toast({
        variant: "destructive",
        description: translateError("IMAGES_TOO_MANY"),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = toRegistrationPayload(values, {
        preferredLanguage: (PREFERRED_LANGUAGES as readonly string[]).includes(
          locale
        )
          ? (locale as (typeof PREFERRED_LANGUAGES)[number])
          : undefined,
      })

      const body = new FormData()
      body.append("name", payload.venue.name)
      if (payload.venue.description) {
        body.append("description", payload.venue.description)
      }
      body.append("address", payload.venue.address)
      body.append("type", payload.venue.type)
      body.append("phone", payload.venue.phone)
      body.append("venueEmail", payload.venue.email)
      if (payload.venue.website) body.append("website", payload.venue.website)
      if (payload.venue.capacity != null) {
        body.append("capacity", String(payload.venue.capacity))
      }
      body.append("firstName", payload.manager.firstName)
      body.append("lastName", payload.manager.lastName)
      body.append("managerEmail", payload.manager.email)
      body.append("password", payload.manager.password)
      if (payload.manager.preferredLanguage) {
        body.append("preferredLanguage", payload.manager.preferredLanguage)
      }
      if (logo) body.append("logo", logo)
      // Not sliced: the count was already checked above, and quietly trimming
      // the tail is the same silent-drop bug as skipping an oversized file.
      for (const image of images) {
        body.append("images", image)
      }

      const recaptchaToken = await getRecaptchaToken(siteKey)
      if (recaptchaToken) body.append("recaptchaToken", recaptchaToken)

      const response = await fetch("/api/venues/register", {
        method: "POST",
        body,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        toast({
          variant: "destructive",
          description: translateError(result?.error ?? "INTERNAL_ERROR"),
        })
        return
      }

      setIsSubmitted(true)
    } catch {
      toast({
        variant: "destructive",
        description: translateError("VENUE_REGISTRATION_FAILED"),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <Card className="m-auto w-full max-w-[640px]">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="text-primary h-10 w-10" aria-hidden="true" />
          <CardTitle>{t("success.title")}</CardTitle>
          <CardDescription>{t("success.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("success.next")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="m-auto w-full max-w-[640px]">
        <CardHeader>
          <CardTitle>{t("header")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AppForm form={form} onSubmit={onSubmit} id={FORM_ID}>
            <h3 className="text-base font-semibold">{t("sections.venue")}</h3>

            <AppField
              name="name"
              type="text"
              required
              label={t("fields.name")}
            />
            <AppSelect
              name="type"
              required
              label={t("fields.type")}
              placeholder={t("placeholders.type")}
              options={typeOptions}
            />
            <AppTextArea name="description" label={t("fields.description")} />
            <AppField
              name="address"
              type="text"
              required
              label={t("fields.address")}
            />
            <AppField
              name="phone"
              type="text"
              required
              label={t("fields.phone")}
            />
            <AppField
              name="venueEmail"
              type="text"
              required
              label={t("fields.venueEmail")}
            />
            <AppField
              name="website"
              type="text"
              label={t("fields.website")}
              placeholder={t("placeholders.website")}
            />
            {/*
              Kept as `type="text"` with a numeric inputMode on purpose: AppField
              coerces a `type="number"` value with `parseFloat`, which turns an
              emptied field into NaN. The schema validates the digits and
              `toRegistrationPayload` does the conversion.
            */}
            <AppField
              name="capacity"
              type="text"
              inputMode="numeric"
              label={t("fields.capacity")}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="venue-logo">
                {t("fields.logo")}
              </label>
              <input
                id="venue-logo"
                name="logo"
                type="file"
                accept={ACCEPTED_IMAGE_TYPES_ATTR}
                className="block w-full text-sm"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="venue-images">
                {t("fields.images")}
              </label>
              <input
                id="venue-images"
                name="images"
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES_ATTR}
                className="block w-full text-sm"
                // Kept WHOLE, not sliced to MAX_IMAGES: submitting is where an
                // over-count is reported. Trimming here would drop the extra
                // photos without the applicant ever being told.
                onChange={(event) =>
                  setImages(Array.from(event.target.files ?? []))
                }
              />
              <p className="text-muted-foreground text-xs">
                {t("hints.images", { max: String(MAX_IMAGES) })}
              </p>
            </div>

            <h3 className="pt-2 text-base font-semibold">
              {t("sections.manager")}
            </h3>

            <AppField
              name="firstName"
              type="text"
              required
              label={t("fields.firstName")}
            />
            <AppField
              name="lastName"
              type="text"
              required
              label={t("fields.lastName")}
            />
            <AppField
              name="managerEmail"
              type="text"
              required
              label={t("fields.managerEmail")}
            />
            <AppField
              name="password"
              type="password"
              required
              label={t("fields.password")}
              description={t("hints.password")}
            />
            <AppField
              name="passwordConfirmation"
              type="password"
              required
              label={t("fields.passwordConfirmation")}
            />
          </AppForm>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <Button
            type="submit"
            size="lg"
            variant="default"
            form={FORM_ID}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("buttons.submitting")}
              </>
            ) : (
              t("buttons.submit")
            )}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            {t("legal")}
          </p>
        </CardFooter>
      </Card>

      {siteKey && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
          strategy="lazyOnload"
        />
      )}
    </>
  )
}
