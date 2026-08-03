"use client"

import { useCallback, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { HelpCircle } from "lucide-react"
import { useForm } from "react-hook-form"

import type { TheatreDetailsStepData } from "../../schemas/play-contribution"
import type { ContributeLabels } from "../../types"

import { cn } from "@/lib/utils"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useContributeForm } from "../../context/ContributeFormContext"
import {
  ORIGINAL_LANGUAGES,
  PLAY_FORMATS,
  PLAY_TYPES,
  theatreDetailsStepSchema,
} from "../../schemas/play-contribution"

interface TheatreDetailsStepProps {
  labels: ContributeLabels
  onValidateRef?: (fn: () => boolean) => void
}

// Play type labels with descriptions
const playTypeInfo: Record<string, { label: string; description: string }> = {
  original: {
    label: "Original",
    description: "A new work created specifically for this production",
  },
  adaptation: {
    label: "Adaptation",
    description: "Based on an existing work (novel, film, etc.)",
  },
  revival: {
    label: "Revival",
    description: "A new production of an existing play",
  },
  translation: {
    label: "Translation",
    description: "A work translated from another language",
  },
  devised: {
    label: "Devised",
    description: "Created collaboratively by the ensemble",
  },
}

// Format labels with descriptions
const formatInfo: Record<string, { label: string; description: string }> = {
  "full-length": {
    label: "Full-length",
    description: "Standard play (typically 90+ minutes)",
  },
  "one-act": {
    label: "One-act",
    description: "Single act play (typically under 60 minutes)",
  },
  monologue: {
    label: "Monologue",
    description: "Solo performance piece",
  },
  sketch: {
    label: "Sketch",
    description: "Short comedic or dramatic piece",
  },
  musical: {
    label: "Musical",
    description: "Play with integrated songs and choreography",
  },
  opera: {
    label: "Opera",
    description: "Drama set to music throughout",
  },
  dance: {
    label: "Dance Theatre",
    description: "Performance primarily through movement",
  },
}

// Language labels
const languageInfo: Record<string, string> = {
  arabic: "Arabic (العربية)",
  darija: "Darija (الدارجة)",
  french: "French (Français)",
  english: "English",
  "arabic-french": "Arabic-French Bilingual",
  other: "Other",
}

export function TheatreDetailsStep({
  labels,
  onValidateRef,
}: TheatreDetailsStepProps) {
  const { formData, updateFormData, markStepCompleted, markStepIncomplete } =
    useContributeForm()

  const form = useForm<TheatreDetailsStepData>({
    resolver: zodResolver(theatreDetailsStepSchema),
    defaultValues: {
      playType: formData.playType,
      format: formData.format,
      actCount: formData.actCount ?? undefined,
      hasIntermission: formData.hasIntermission ?? false,
      basedOn: formData.basedOn || "",
      originalLanguage: formData.originalLanguage ?? undefined,
      productionCompany: formData.productionCompany || "",
      premiereDate: formData.premiereDate || "",
    },
    mode: "onChange",
  })

  // Watch playType to show/hide basedOn field
  const playType = form.watch("playType")
  const showBasedOn = playType === "adaptation" || playType === "translation"

  // Translate error codes to messages
  const translateError = useCallback(
    (code: string) => {
      return labels.errors[code] || code
    },
    [labels.errors]
  )

  // Sync form data with context when values change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() returns a fresh subscription/value the React Compiler cannot memoize; matches the existing suppressions in MediaStep.tsx and DataTable.tsx. Revisit when react-hook-form ships a compiler-safe API.
    const subscription = form.watch((data) => {
      updateFormData(data as Partial<TheatreDetailsStepData>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  // Expose validation function to parent
  useEffect(() => {
    if (onValidateRef) {
      onValidateRef(() => {
        const values = form.getValues()
        const result = theatreDetailsStepSchema.safeParse(values)
        if (result.success) {
          markStepCompleted(1)
        } else {
          markStepIncomplete(1)
          form.trigger()
        }
        return result.success
      })
    }
  }, [onValidateRef, form, markStepCompleted, markStepIncomplete])

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {labels.steps.theatreDetails}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Specify the theatrical characteristics of this production
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Play Type and Format in a row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Play Type */}
            <FormField
              control={form.control}
              name="playType"
              render={({ field, fieldState }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-white">
                      Play Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-white/50 hover:text-white"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Original = new work, Adaptation = based on existing
                            source, Revival = restaging a classic
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          "bg-surface border-white/20 text-white",
                          !field.value && "text-white/40",
                          fieldState.invalid && "border-red-500"
                        )}
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface border-white/20">
                      {PLAY_TYPES.map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-white hover:bg-white/10"
                        >
                          {playTypeInfo[type]?.label || type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage>
                    {fieldState.error?.message &&
                      translateError(fieldState.error.message)}
                  </FormMessage>
                </FormItem>
              )}
            />

            {/* Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field, fieldState }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel className="text-white">
                      Format <span className="text-red-500">*</span>
                    </FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-white/50 hover:text-white"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>
                            Full-length = 90+ min, One-act = single act,
                            Monologue = solo performance
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          "bg-surface border-white/20 text-white",
                          !field.value && "text-white/40",
                          fieldState.invalid && "border-red-500"
                        )}
                      >
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-surface border-white/20">
                      {PLAY_FORMATS.map((format) => (
                        <SelectItem
                          key={format}
                          value={format}
                          className="text-white hover:bg-white/10"
                        >
                          {formatInfo[format]?.label || format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage>
                    {fieldState.error?.message &&
                      translateError(fieldState.error.message)}
                  </FormMessage>
                </FormItem>
              )}
            />
          </div>

          {/* Based On (conditional) */}
          {showBasedOn && (
            <FormField
              control={form.control}
              name="basedOn"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">Based On</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Novel by Victor Hugo, Film by..."
                      className={cn(
                        "bg-surface border-white/20 text-white placeholder:text-white/40",
                        fieldState.invalid && "border-red-500"
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-white/50">
                    The source material this work is adapted from or translated
                    from
                  </FormDescription>
                  <FormMessage>
                    {fieldState.error?.message &&
                      translateError(fieldState.error.message)}
                  </FormMessage>
                </FormItem>
              )}
            />
          )}

          {/* Act Count and Has Intermission */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Act Count */}
            <FormField
              control={form.control}
              name="actCount"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">Number of Acts</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2"
                      min={1}
                      max={10}
                      className={cn(
                        "bg-surface border-white/20 text-white placeholder:text-white/40",
                        fieldState.invalid && "border-red-500"
                      )}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val ? parseInt(val, 10) : undefined)
                      }}
                    />
                  </FormControl>
                  <FormMessage>
                    {fieldState.error?.message &&
                      translateError(fieldState.error.message)}
                  </FormMessage>
                </FormItem>
              )}
            />

            {/* Has Intermission */}
            <FormField
              control={form.control}
              name="hasIntermission"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-y-0 space-x-3 pt-8">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-tiween-yellow data-[state=checked]:border-tiween-yellow border-white/40"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal text-white">
                    Has Intermission
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Original Language */}
          <FormField
            control={form.control}
            name="originalLanguage"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-white">Original Language</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) => field.onChange(value || undefined)}
                >
                  <FormControl>
                    <SelectTrigger
                      className={cn(
                        "bg-surface border-white/20 text-white",
                        !field.value && "text-white/40",
                        fieldState.invalid && "border-red-500"
                      )}
                    >
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface border-white/20">
                    {ORIGINAL_LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang}
                        value={lang}
                        className="text-white hover:bg-white/10"
                      >
                        {languageInfo[lang] || lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />

          {/* Production Company */}
          <FormField
            control={form.control}
            name="productionCompany"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-white">Production Company</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Théâtre National, Compagnie..."
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

          {/* Premiere Date */}
          <FormField
            control={form.control}
            name="premiereDate"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-white">Premiere Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className={cn(
                      "bg-surface border-white/20 text-white",
                      fieldState.invalid && "border-red-500"
                    )}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-white/50">
                  When was this production first performed?
                </FormDescription>
                <FormMessage>
                  {fieldState.error?.message &&
                    translateError(fieldState.error.message)}
                </FormMessage>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  )
}
