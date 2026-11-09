"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CheckCircle, Film, Loader2, Send } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { PlatformType, ShortFilmSuggestion } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"

import {
  SUGGESTION_LIMITS as L,
  SUGGESTION_PLATFORMS,
  suggestionYearMax,
} from "../../utils"

/**
 * Submission failure codes the form can explain. `onSubmit` rejects with an
 * `Error` whose `message` is one of these (anything else reads as UNKNOWN).
 */
export const SUGGESTION_ERROR_CODES = [
  "RATE_LIMIT_EXCEEDED",
  "VALIDATION_ERROR",
  "SUGGESTION_UNAVAILABLE",
  "NETWORK",
  "UNKNOWN",
] as const
export type SuggestionErrorCode = (typeof SUGGESTION_ERROR_CODES)[number]

function toErrorCode(error: unknown): SuggestionErrorCode {
  const message = error instanceof Error ? error.message : ""
  return (SUGGESTION_ERROR_CODES as readonly string[]).includes(message)
    ? (message as SuggestionErrorCode)
    : "UNKNOWN"
}

const PLATFORM_NAMES: Record<Exclude<PlatformType, "other">, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  dailymotion: "Dailymotion",
  mubi: "MUBI",
  netflix: "Netflix",
}

type T = ReturnType<typeof useTranslations<"shorts.suggestion">>

/**
 * Numbers stay strings in the form (an empty `<input>` is `""`, which
 * `z.coerce.number()` turns into `0` and then rejects — blocking a perfectly
 * valid submission that simply left the optional field blank).
 */
function optionalIntField(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) => {
        if (value === "") return true
        if (!/^\d+$/.test(value)) return false
        const n = Number(value)
        return n >= min && n <= max
      },
      { message }
    )
}

function buildSchema(t: T) {
  const tooLong = (max: number) => t("validation.tooLong", { max: String(max) })
  const text = (max: number) => z.string().trim().max(max, tooLong(max))
  const url = z
    .string()
    .trim()
    .max(L.url, tooLong(L.url))
    .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
      message: t("validation.urlInvalid"),
    })
  const yearMax = suggestionYearMax()

  return z.object({
    title: text(L.title).min(1, t("validation.titleRequired")),
    originalTitle: text(L.title),
    director: text(L.person),
    year: optionalIntField(
      L.yearMin,
      yearMax,
      t("validation.yearRange", {
        min: String(L.yearMin),
        max: String(yearMax),
      })
    ),
    duration: optionalIntField(
      L.durationMin,
      L.durationMax,
      t("validation.durationRange", {
        min: String(L.durationMin),
        max: String(L.durationMax),
      })
    ),
    synopsis: text(L.synopsis),
    genres: text(L.genres),
    country: text(L.place),
    trailerUrl: url,
    watchUrl: url,
    platform: z.string(),
    submitterName: text(L.name).min(1, t("validation.nameRequired")),
    submitterEmail: z
      .string()
      .trim()
      .max(L.email, tooLong(L.email))
      .email(t("validation.emailInvalid")),
    additionalNotes: text(L.notes),
  })
}

type SuggestionFormData = z.infer<ReturnType<typeof buildSchema>>

const EMPTY_VALUES: SuggestionFormData = {
  title: "",
  originalTitle: "",
  director: "",
  year: "",
  duration: "",
  synopsis: "",
  genres: "",
  country: "",
  trailerUrl: "",
  watchUrl: "",
  platform: "",
  submitterName: "",
  submitterEmail: "",
  additionalNotes: "",
}

const orUndefined = (value: string) => (value === "" ? undefined : value)

function toSuggestion(data: SuggestionFormData): ShortFilmSuggestion {
  const genres = data.genres
    .split(/[,،]/) // Latin and Arabic commas
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 10)
  const platform = (SUGGESTION_PLATFORMS as readonly string[]).includes(
    data.platform
  )
    ? (data.platform as PlatformType)
    : undefined

  return {
    title: data.title,
    originalTitle: orUndefined(data.originalTitle),
    director: orUndefined(data.director),
    year: data.year ? Number(data.year) : undefined,
    duration: data.duration ? Number(data.duration) : undefined,
    synopsis: orUndefined(data.synopsis),
    genres: genres.length > 0 ? genres : undefined,
    country: orUndefined(data.country),
    trailerUrl: orUndefined(data.trailerUrl),
    watchUrl: orUndefined(data.watchUrl),
    platform,
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
    additionalNotes: orUndefined(data.additionalNotes),
  }
}

export interface SuggestionFormProps {
  /**
   * Persist the suggestion. Resolve on success; reject with an `Error` whose
   * message is a {@link SuggestionErrorCode} to get a specific explanation.
   */
  onSubmit: (data: ShortFilmSuggestion) => Promise<void>
  /** Additional class names */
  className?: string
  /** Trigger button variant */
  triggerVariant?: "button" | "link"
}

export function SuggestionForm({
  onSubmit,
  className,
  triggerVariant = "button",
}: SuggestionFormProps) {
  const t = useTranslations("shorts.suggestion")
  const locale = useLocale()
  const dir = locale === "ar" ? "rtl" : "ltr"
  const [isOpen, setIsOpen] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [errorCode, setErrorCode] = React.useState<SuggestionErrorCode | null>(
    null
  )
  const errorRef = React.useRef<HTMLDivElement>(null)

  const schema = React.useMemo(() => buildSchema(t), [t])
  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
    mode: "onTouched",
  })
  const isSubmitting = form.formState.isSubmitting

  const handleSubmit = async (data: SuggestionFormData) => {
    setErrorCode(null)
    try {
      await onSubmit(toSuggestion(data))
      setSubmitted(true)
      form.reset(EMPTY_VALUES)
    } catch (error) {
      // The form stays mounted with every value intact; the visitor fixes or
      // retries without retyping anything.
      setErrorCode(toErrorCode(error))
    }
  }

  // Move focus to the explanation so keyboard and screen-reader users land on
  // it instead of a re-enabled submit button with no context.
  React.useEffect(() => {
    if (errorCode) errorRef.current?.focus()
  }, [errorCode])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Keep an unsent draft; only the transient status resets.
      setSubmitted(false)
      setErrorCode(null)
    }
  }

  const requiredMark = (
    <>
      <span className="text-destructive" aria-hidden="true">
        {" "}
        *
      </span>
      <span className="sr-only"> ({t("required")})</span>
    </>
  )

  const textField = (
    name: keyof SuggestionFormData,
    label: string,
    {
      max,
      required,
      ...inputProps
    }: { max: number; required?: boolean } & React.ComponentProps<typeof Input>
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="min-w-0">
          <FormLabel>
            {label}
            {required && requiredMark}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              maxLength={max}
              dir="auto"
              className="h-11 rounded-lg text-base"
              {...inputProps}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerVariant === "button" ? (
          <Button className={cn("gap-2", className)}>
            <Film className="h-4 w-4" aria-hidden="true" />
            {t("trigger")}
          </Button>
        ) : (
          <button
            type="button"
            className={cn("text-gold-tint hover:underline", className)}
          >
            {t("trigger")}
          </button>
        )}
      </DialogTrigger>

      <DialogContent
        dir={dir}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film
              className="text-primary h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div
            className="flex flex-col items-center gap-4 py-8 text-center"
            role="status"
          >
            <CheckCircle
              className="text-success h-16 w-16"
              aria-hidden="true"
            />
            <h3 className="text-lg font-semibold">{t("successTitle")}</h3>
            <p className="text-muted-foreground">{t("successBody")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                {t("suggestAnother")}
              </Button>
              <Button onClick={() => handleOpenChange(false)}>
                {t("close")}
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
              noValidate
              aria-busy={isSubmitting}
            >
              <fieldset disabled={isSubmitting} className="space-y-4">
                {textField("title", t("movieTitle"), {
                  max: L.title,
                  required: true,
                })}

                <div className="grid gap-4 sm:grid-cols-2">
                  {textField("originalTitle", t("originalTitle"), {
                    max: L.title,
                  })}
                  {textField("director", t("director"), { max: L.person })}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {textField("year", t("year"), {
                    max: 4,
                    inputMode: "numeric",
                    dir: "ltr",
                  })}
                  {textField("duration", t("duration"), {
                    max: 2,
                    inputMode: "numeric",
                    dir: "ltr",
                  })}
                  {textField("country", t("country"), { max: L.place })}
                </div>

                <FormField
                  control={form.control}
                  name="synopsis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("synopsis")}</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          dir="auto"
                          maxLength={L.synopsis}
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("genres")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("genresPlaceholder")}
                          maxLength={L.genres}
                          dir="auto"
                          className="h-11 rounded-lg text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t("genresHint")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  {textField("trailerUrl", t("trailerUrl"), {
                    max: L.url,
                    type: "url",
                    inputMode: "url",
                    dir: "ltr",
                    placeholder: "https://…",
                  })}
                  {textField("watchUrl", t("watchUrl"), {
                    max: L.url,
                    type: "url",
                    inputMode: "url",
                    dir: "ltr",
                    placeholder: "https://…",
                  })}
                </div>

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("platform")}</FormLabel>
                      <Select
                        dir={dir}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue
                              placeholder={t("platformPlaceholder")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(PLATFORM_NAMES).map(
                            ([value, name]) => (
                              <SelectItem key={value} value={value}>
                                {name}
                              </SelectItem>
                            )
                          )}
                          <SelectItem value="other">
                            {t("platformOther")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border-t pt-4">
                  <p className="text-muted-foreground text-sm font-medium">
                    {t("yourDetails")}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {textField("submitterName", t("yourName"), {
                      max: L.name,
                      required: true,
                      autoComplete: "name",
                    })}
                    {textField("submitterEmail", t("yourEmail"), {
                      max: L.email,
                      required: true,
                      type: "email",
                      inputMode: "email",
                      autoComplete: "email",
                      dir: "ltr",
                    })}
                  </div>

                  <FormField
                    control={form.control}
                    name="additionalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("additionalNotes")}</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={2}
                            dir="auto"
                            maxLength={L.notes}
                            className="text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </fieldset>

              {errorCode && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  className="border-destructive/40 flex gap-3 rounded-xl border p-3 text-sm focus:outline-none"
                >
                  <AlertCircle
                    className="text-destructive mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-destructive font-semibold">
                      {t("errorTitle")}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {t(`errors.${errorCode}`)}
                    </p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full gap-2 rounded-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <Send
                      className="h-4 w-4 rtl:-scale-x-100"
                      aria-hidden="true"
                    />
                    {t("submit")}
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

SuggestionForm.displayName = "SuggestionForm"
