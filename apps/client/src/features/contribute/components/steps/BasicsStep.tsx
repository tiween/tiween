"use client"

import { useCallback, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { HelpCircle } from "lucide-react"
import { useForm } from "react-hook-form"

import type { BasicsStepData } from "../../schemas/play-contribution"
import type { ContributeLabels } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { useContributeForm } from "../../context/ContributeFormContext"
import { AGE_RATINGS, basicsStepSchema } from "../../schemas/play-contribution"

interface BasicsStepProps {
  labels: ContributeLabels
  onValidateRef?: (fn: () => boolean) => void
}

// Age rating labels with descriptions
const ageRatingInfo: Record<string, { label: string; description: string }> = {
  TP: { label: "TP (Tout Public)", description: "Suitable for all ages" },
  PG12: { label: "PG-12", description: "Parental guidance for under 12" },
  PG16: { label: "PG-16", description: "Parental guidance for under 16" },
  PG18: { label: "PG-18", description: "Adults only (18+)" },
}

export function BasicsStep({ labels, onValidateRef }: BasicsStepProps) {
  const { formData, updateFormData, markStepCompleted, markStepIncomplete } =
    useContributeForm()

  const form = useForm<BasicsStepData>({
    resolver: zodResolver(basicsStepSchema),
    defaultValues: {
      title: formData.title || "",
      originalTitle: formData.originalTitle || "",
      releaseYear: formData.releaseYear ?? undefined,
      duration: formData.duration ?? undefined,
      synopsis: formData.synopsis || "",
      ageRating: formData.ageRating ?? undefined,
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
      updateFormData(data as Partial<BasicsStepData>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  // Expose validation function to parent
  useEffect(() => {
    if (onValidateRef) {
      onValidateRef(() => {
        const values = form.getValues()
        const result = basicsStepSchema.safeParse(values)
        if (result.success) {
          markStepCompleted(0)
        } else {
          markStepIncomplete(0)
          form.trigger()
        }
        return result.success
      })
    }
  }, [onValidateRef, form, markStepCompleted, markStepIncomplete])

  // Current year for release year range
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {labels.steps.basics}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Enter the basic information about the play
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-white">
                  Title <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter the play title"
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

          {/* Original Title */}
          <FormField
            control={form.control}
            name="originalTitle"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel className="text-white">Original Title</FormLabel>
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
                      <TooltipContent>
                        <p className="max-w-xs">
                          The title in the original language if different from
                          the display title above
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <FormControl>
                  <Input
                    placeholder="Original title (if different)"
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

          {/* Release Year and Duration in a row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Release Year */}
            <FormField
              control={form.control}
              name="releaseYear"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">Release Year</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={String(currentYear)}
                      min={1900}
                      max={currentYear + 1}
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

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-white">
                    Duration (minutes)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 90"
                      min={1}
                      max={600}
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
          </div>

          {/* Age Rating */}
          <FormField
            control={form.control}
            name="ageRating"
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel className="text-white">Age Rating</FormLabel>
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
                      <TooltipContent>
                        <p className="max-w-xs">
                          TP = All ages, PG = Parental guidance recommended for
                          ages under the specified number
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                      <SelectValue placeholder="Select age rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-surface border-white/20">
                    {AGE_RATINGS.map((rating) => (
                      <SelectItem
                        key={rating}
                        value={rating}
                        className="text-white hover:bg-white/10"
                      >
                        {ageRatingInfo[rating]?.label || rating}
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

          {/* Synopsis */}
          <FormField
            control={form.control}
            name="synopsis"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-white">Synopsis</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the play's story, themes, and key elements..."
                    rows={5}
                    className={cn(
                      "bg-surface resize-none border-white/20 text-white placeholder:text-white/40",
                      fieldState.invalid && "border-red-500"
                    )}
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-white/50">
                  {field.value?.length || 0} / 5000 characters
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
