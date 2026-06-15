"use client"

import { useCallback, useEffect, useState } from "react"
import Script from "next/script"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Globe,
  Image as ImageIcon,
  Mail,
  Shield,
  User,
  Users,
} from "lucide-react"
import { useForm } from "react-hook-form"

import type { ReviewStepData } from "../../schemas/play-contribution"
import type { ContributeLabels } from "../../types"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useContributeForm } from "../../context/ContributeFormContext"
import {
  INPUT_LANGUAGES,
  reviewStepSchema,
} from "../../schemas/play-contribution"

interface ReviewStepProps {
  labels: ContributeLabels
  onValidateRef?: (fn: () => boolean) => void
  onSuccess?: () => void
}

// Language labels
const languageLabels: Record<string, string> = {
  ar: "العربية (Arabic)",
  fr: "Français (French)",
  en: "English",
}

// Play type labels
const playTypeLabels: Record<string, string> = {
  original: "Original",
  adaptation: "Adaptation",
  revival: "Revival",
  translation: "Translation",
  devised: "Devised",
}

// Format labels
const formatLabels: Record<string, string> = {
  "full-length": "Full-length",
  "one-act": "One-act",
  monologue: "Monologue",
  sketch: "Sketch",
  musical: "Musical",
  opera: "Opera",
  dance: "Dance Theatre",
}

// Role labels
const roleLabels: Record<string, string> = {
  playwright: "Playwright",
  director: "Director",
  adaptor: "Adaptor",
  translator: "Translator",
  composer: "Composer",
  "musical-director": "Musical Director",
  choreographer: "Choreographer",
  cast: "Cast",
  "set-designer": "Set Designer",
  "costume-designer": "Costume Designer",
  "lighting-designer": "Lighting Designer",
  "sound-designer": "Sound Designer",
  "projection-designer": "Projection Designer",
  "stage-manager": "Stage Manager",
  producer: "Producer",
  other: "Other",
}

export function ReviewStep({
  labels,
  onValidateRef,
  onSuccess,
}: ReviewStepProps) {
  const {
    formData,
    updateFormData,
    markStepCompleted,
    markStepIncomplete,
    submitForm,
    isSubmitting,
    submitError,
  } = useContributeForm()

  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false)
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null)

  const form = useForm<ReviewStepData>({
    resolver: zodResolver(reviewStepSchema),
    defaultValues: {
      inputLanguage: formData.inputLanguage,
      submitterEmail: formData.submitterEmail || "",
      submitterName: formData.submitterName || "",
      acceptTerms: false as unknown as true,
    },
    mode: "onChange",
  })

  // Translate error codes to messages
  const translateError = useCallback(
    (code: string) => {
      return labels.errors[code] || code
    },
    [labels.errors]
  )

  // Sync form data with context when values change
  useEffect(() => {
    const subscription = form.watch((data) => {
      updateFormData({
        inputLanguage: data.inputLanguage,
        submitterEmail: data.submitterEmail,
        submitterName: data.submitterName,
      })
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  // Expose validation function to parent
  useEffect(() => {
    if (onValidateRef) {
      onValidateRef(() => {
        const values = form.getValues()
        const result = reviewStepSchema.safeParse(values)
        if (result.success) {
          markStepCompleted(4)
        } else {
          markStepIncomplete(4)
          form.trigger()
        }
        return result.success
      })
    }
  }, [onValidateRef, form, markStepCompleted, markStepIncomplete])

  // Handle submission
  const handleSubmit = useCallback(
    async (data: ReviewStepData) => {
      // TODO: Get reCAPTCHA token here
      // const token = await grecaptcha.execute(...)

      await submitForm()

      if (!submitError) {
        onSuccess?.()
      }
    },
    [submitForm, submitError, onSuccess]
  )

  // Count credits by role
  const creditsByRole = formData.credits?.reduce(
    (acc, credit) => {
      const role = credit.role
      if (!acc[role]) acc[role] = []
      acc[role].push(credit)
      return acc
    },
    {} as Record<string, typeof formData.credits>
  )

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {labels.steps.review}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Review your submission and provide contact information
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        {/* Basic Info Card */}
        <div className="bg-surface rounded-lg border border-white/10 p-4">
          <h3 className="mb-3 text-sm font-medium text-white/60">
            Basic Information
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60">Title:</span>
              <span className="font-medium text-white">
                {formData.title || "—"}
              </span>
            </div>
            {formData.originalTitle && (
              <div className="flex justify-between">
                <span className="text-white/60">Original Title:</span>
                <span className="text-white">{formData.originalTitle}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/60">Type:</span>
              <Badge variant="secondary" className="bg-white/10">
                {playTypeLabels[formData.playType || ""] || "—"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Format:</span>
              <Badge variant="secondary" className="bg-white/10">
                {formatLabels[formData.format || ""] || "—"}
              </Badge>
            </div>
            {formData.releaseYear && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-white/60">
                  <Calendar className="h-3 w-3" />
                  Year:
                </span>
                <span className="text-white">{formData.releaseYear}</span>
              </div>
            )}
            {formData.duration && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-white/60">
                  <Clock className="h-3 w-3" />
                  Duration:
                </span>
                <span className="text-white">{formData.duration} min</span>
              </div>
            )}
          </div>
        </div>

        {/* Credits Card */}
        <div className="bg-surface rounded-lg border border-white/10 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/60">
            <Users className="h-4 w-4" />
            Credits ({formData.credits?.length || 0})
          </h3>
          {creditsByRole && Object.keys(creditsByRole).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(creditsByRole).map(([role, credits]) => (
                <div key={role} className="flex items-start justify-between">
                  <span className="text-sm text-white/60">
                    {roleLabels[role] || role}:
                  </span>
                  <div className="text-right">
                    {credits?.map((credit, idx) => (
                      <div key={idx} className="text-sm text-white">
                        {credit.person.name}
                        {credit.character && (
                          <span className="text-white/50">
                            {" "}
                            as {credit.character}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No credits added</p>
          )}
        </div>

        {/* Media Card */}
        <div className="bg-surface rounded-lg border border-white/10 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-white/60">
            <ImageIcon className="h-4 w-4" />
            Media
          </h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="font-medium text-white">
                {formData.poster ? (
                  <Check className="mx-auto h-4 w-4 text-green-500" />
                ) : (
                  "—"
                )}
              </div>
              <div className="text-white/60">Poster</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">
                {formData.videos?.length || 0}
              </div>
              <div className="text-white/60">Videos</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-white">
                {formData.links?.length || 0}
              </div>
              <div className="text-white/60">Links</div>
            </div>
          </div>
          {formData.distinctions && formData.distinctions.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <div className="text-sm text-white/60">
                Awards: {formData.distinctions.length}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Input Language */}
          <FormField
            control={form.control}
            name="inputLanguage"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-white/60" />
                  <FormLabel className="text-white">
                    Input Language <span className="text-red-500">*</span>
                  </FormLabel>
                </div>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        "bg-surface border-white/20 text-white",
                        !field.value && "text-white/40",
                        fieldState.invalid && "border-red-500"
                      )}
                    >
                      <SelectValue placeholder="Select the language you used" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface border-white/20">
                    {INPUT_LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang}
                        value={lang}
                        className="text-white hover:bg-white/10"
                      >
                        {languageLabels[lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-white/50">
                  Translations to other languages will be handled after review
                </FormDescription>
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Contact Info (optional) */}
          <div className="space-y-4">
            <p className="flex items-center gap-2 text-sm text-white/60">
              <Mail className="h-4 w-4" />
              Contact Information (optional)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="submitterName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-white">
                      Your Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Optional"
                        className={cn(
                          "bg-surface border-white/20 text-white placeholder:text-white/40",
                          fieldState.invalid && "border-red-500"
                        )}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="submitterEmail"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-white">
                      Your Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="To receive updates (optional)"
                        className={cn(
                          "bg-surface border-white/20 text-white placeholder:text-white/40",
                          fieldState.invalid && "border-red-500"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error?.message &&
                        translateError(fieldState.error.message)}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Terms Acceptance */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rtl:space-x-reverse">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-tiween-yellow data-[state=checked]:border-tiween-yellow mt-0.5 border-white/40"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-normal text-white">
                    I confirm that the information provided is accurate and I
                    have the right to submit this content
                  </FormLabel>
                  {fieldState.error?.message && (
                    <p className="text-sm text-red-400">
                      {translateError(fieldState.error.message)}
                    </p>
                  )}
                </div>
              </FormItem>
            )}
          />

          {/* reCAPTCHA Notice */}
          <Alert className="border-white/10 bg-white/5">
            <Shield className="h-4 w-4 text-white/60" />
            <AlertDescription className="text-sm text-white/60">
              This site is protected by reCAPTCHA. Your submission will be
              reviewed by our team before publication.
            </AlertDescription>
          </Alert>

          {/* Submit Error */}
          {submitError && (
            <Alert
              variant="destructive"
              className="border-red-500/50 bg-red-500/10"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{translateError(submitError)}</AlertDescription>
            </Alert>
          )}
        </form>
      </Form>

      {/* reCAPTCHA Script */}
      <Script
        src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
        onLoad={() => setRecaptchaLoaded(true)}
        onError={() => setRecaptchaError("Failed to load reCAPTCHA")}
      />
    </div>
  )
}
