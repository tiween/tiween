"use client"

import { useCallback, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Award,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"

import type { MediaStepData } from "../../schemas/play-contribution"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useContributeForm } from "../../context/ContributeFormContext"
import {
  DISTINCTION_RESULTS,
  LINK_TYPES,
  mediaStepSchema,
  VIDEO_TYPES,
} from "../../schemas/play-contribution"

interface MediaStepProps {
  labels: ContributeLabels
  onValidateRef?: (fn: () => boolean) => void
}

// Link type labels
const linkTypeLabels: Record<string, string> = {
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter/X",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  other: "Other",
}

// Video type labels (`common.video.videoType` vocabulary)
const videoTypeLabels: Record<string, string> = {
  trailer: "Trailer",
  teaser: "Teaser",
  clip: "Clip/Excerpt",
  featurette: "Featurette",
  interview: "Interview",
  "behind-the-scenes": "Behind the Scenes",
  "full-length": "Full Recording",
}

// Distinction result labels
const resultLabels: Record<string, string> = {
  selected: "Official Selection",
  nominated: "Nominated",
  winner: "Winner",
  "special-mention": "Special Mention",
  "honorable-mention": "Honorable Mention",
  "grand-prize": "Grand Prize",
}

export function MediaStep({ labels, onValidateRef }: MediaStepProps) {
  const { formData, updateFormData, markStepCompleted, markStepIncomplete } =
    useContributeForm()

  const [posterInputMode, setPosterInputMode] = useState<"url" | "upload">(
    "url"
  )

  const form = useForm<MediaStepData>({
    resolver: zodResolver(mediaStepSchema) as never,
    defaultValues: {
      poster: formData.poster || "",
      photos: formData.photos || [],
      videos: formData.videos || [],
      links: formData.links || [],
      distinctions: formData.distinctions || [],
      genres: formData.genres || [],
    },
    mode: "onChange",
  })

  const {
    fields: videoFields,
    append: appendVideo,
    remove: removeVideo,
  } = useFieldArray({
    control: form.control,
    name: "videos",
  })

  const {
    fields: linkFields,
    append: appendLink,
    remove: removeLink,
  } = useFieldArray({
    control: form.control,
    name: "links",
  })

  const {
    fields: distinctionFields,
    append: appendDistinction,
    remove: removeDistinction,
  } = useFieldArray({
    control: form.control,
    name: "distinctions",
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
    // react-hook-form's watch() cannot be memoized; the subscription is
    // disposed on unmount below.
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((data) => {
      updateFormData(data as Partial<MediaStepData>)
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  // Expose validation function to parent
  useEffect(() => {
    if (onValidateRef) {
      onValidateRef(() => {
        const values = form.getValues()
        const result = mediaStepSchema.safeParse(values)
        if (result.success) {
          markStepCompleted(3)
        } else {
          markStepIncomplete(3)
          form.trigger()
        }
        return result.success
      })
    }
  }, [onValidateRef, form, markStepCompleted, markStepIncomplete])

  // Preview poster
  const posterValue = form.watch("poster")

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {labels.steps.media}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Add images, videos, links, and awards
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Tabs defaultValue="poster" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/5">
              <TabsTrigger
                value="poster"
                className="data-[state=active]:bg-tiween-yellow data-[state=active]:text-tiween-green"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                Poster
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="data-[state=active]:bg-tiween-yellow data-[state=active]:text-tiween-green"
              >
                <Video className="mr-2 h-4 w-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger
                value="links"
                className="data-[state=active]:bg-tiween-yellow data-[state=active]:text-tiween-green"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Links
              </TabsTrigger>
              <TabsTrigger
                value="awards"
                className="data-[state=active]:bg-tiween-yellow data-[state=active]:text-tiween-green"
              >
                <Award className="mr-2 h-4 w-4" />
                Awards
              </TabsTrigger>
            </TabsList>

            {/* Poster Tab */}
            <TabsContent value="poster" className="mt-4 space-y-4">
              {/* Input mode toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={posterInputMode === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosterInputMode("url")}
                  className={cn(
                    posterInputMode === "url"
                      ? "bg-tiween-yellow text-tiween-green"
                      : "border-white/20 text-white hover:bg-white/10"
                  )}
                >
                  <LinkIcon className="mr-1 h-4 w-4" />
                  URL
                </Button>
                <Button
                  type="button"
                  variant={posterInputMode === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPosterInputMode("upload")}
                  className={cn(
                    posterInputMode === "upload"
                      ? "bg-tiween-yellow text-tiween-green"
                      : "border-white/20 text-white hover:bg-white/10"
                  )}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Upload
                </Button>
              </div>

              {/* Poster input */}
              <FormField
                control={form.control}
                name="poster"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-white">Poster Image</FormLabel>
                    {posterInputMode === "url" ? (
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/poster.jpg"
                          className={cn(
                            "bg-surface border-white/20 text-white placeholder:text-white/40",
                            fieldState.invalid && "border-red-500"
                          )}
                          {...field}
                        />
                      </FormControl>
                    ) : (
                      <FormControl>
                        <div className="cursor-pointer rounded-lg border-2 border-dashed border-white/20 p-8 text-center transition-colors hover:border-white/40">
                          <Upload className="mx-auto mb-2 h-8 w-8 text-white/40" />
                          <p className="text-sm text-white/60">
                            Click to upload or drag and drop
                          </p>
                          <p className="mt-1 text-xs text-white/40">
                            PNG, JPG up to 5MB
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            // TODO: Implement file upload — the selected file is
                            // intentionally ignored until the upload path exists.
                            onChange={() => {}}
                          />
                        </div>
                      </FormControl>
                    )}
                    <FormDescription className="text-white/50">
                      The main promotional image for the play
                    </FormDescription>
                    <FormMessage>
                      {fieldState.error?.message &&
                        translateError(fieldState.error.message)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Poster preview */}
              {posterValue && posterValue.startsWith("http") && (
                <div className="relative">
                  <p className="mb-2 text-sm text-white/60">Preview:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview of an
                      arbitrary contributor-supplied URL; next/image needs a configured host */}
                  <img
                    src={posterValue}
                    alt="Poster preview"
                    className="max-h-64 rounded-lg bg-black/20 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="mt-4 space-y-4">
              {videoFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-surface flex items-start gap-2 rounded-lg border border-white/10 p-3"
                >
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`videos.${index}.url`}
                      render={({ field: urlField, fieldState }) => (
                        <FormItem className="sm:col-span-2">
                          <FormControl>
                            <Input
                              placeholder="YouTube or Vimeo URL"
                              className={cn(
                                "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
                                fieldState.invalid && "border-red-500"
                              )}
                              {...urlField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`videos.${index}.type`}
                      render={({ field: typeField }) => (
                        <FormItem>
                          <Select
                            value={typeField.value}
                            onValueChange={typeField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-tiween-green border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface border-white/20">
                              {VIDEO_TYPES.map((type) => (
                                <SelectItem
                                  key={type}
                                  value={type}
                                  className="text-white hover:bg-white/10"
                                >
                                  {videoTypeLabels[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVideo(index)}
                    className="h-9 w-9 p-0 text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendVideo({ url: "", type: "trailer" })}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                Add Video
              </Button>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="mt-4 space-y-4">
              {linkFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-surface flex items-start gap-2 rounded-lg border border-white/10 p-3"
                >
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`links.${index}.type`}
                      render={({ field: typeField }) => (
                        <FormItem>
                          <Select
                            value={typeField.value}
                            onValueChange={typeField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-tiween-green border-white/20 text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface max-h-48 border-white/20">
                              {LINK_TYPES.slice(0, 10).map((type) => (
                                <SelectItem
                                  key={type}
                                  value={type}
                                  className="text-white hover:bg-white/10"
                                >
                                  {linkTypeLabels[type] || type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`links.${index}.url`}
                      render={({ field: urlField, fieldState }) => (
                        <FormItem className="sm:col-span-2">
                          <FormControl>
                            <Input
                              placeholder="https://..."
                              className={cn(
                                "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
                                fieldState.invalid && "border-red-500"
                              )}
                              {...urlField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
                    className="h-9 w-9 p-0 text-white/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLink({ url: "", type: "website" })}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                Add Link
              </Button>
            </TabsContent>

            {/* Awards Tab */}
            <TabsContent value="awards" className="mt-4 space-y-4">
              {distinctionFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-surface space-y-3 rounded-lg border border-white/10 p-4"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs text-white/40">
                      Award #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDistinction(index)}
                      className="h-6 w-6 p-0 text-white/40 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`distinctions.${index}.name`}
                      render={({ field: nameField, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-white">
                            Festival/Award Name *
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Journées Théâtrales de Carthage"
                              className={cn(
                                "bg-tiween-green border-white/20 text-sm text-white placeholder:text-white/40",
                                fieldState.invalid && "border-red-500"
                              )}
                              {...nameField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`distinctions.${index}.year`}
                      render={({ field: yearField, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-white">
                            Year *
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1900}
                              max={new Date().getFullYear() + 1}
                              placeholder={String(new Date().getFullYear())}
                              className={cn(
                                "bg-tiween-green border-white/20 text-sm text-white placeholder:text-white/40",
                                fieldState.invalid && "border-red-500"
                              )}
                              {...yearField}
                              onChange={(e) => {
                                const val = e.target.value
                                yearField.onChange(
                                  val ? parseInt(val, 10) : undefined
                                )
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`distinctions.${index}.result`}
                      render={({ field: resultField }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-white">
                            Result
                          </FormLabel>
                          <Select
                            value={resultField.value}
                            onValueChange={resultField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-tiween-green border-white/20 text-sm text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface border-white/20">
                              {DISTINCTION_RESULTS.map((result) => (
                                <SelectItem
                                  key={result}
                                  value={result}
                                  className="text-white hover:bg-white/10"
                                >
                                  {resultLabels[result]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`distinctions.${index}.category`}
                      render={({ field: catField }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-white">
                            Category
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Best Play, Best Director"
                              className="bg-tiween-green border-white/20 text-sm text-white placeholder:text-white/40"
                              {...catField}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendDistinction({
                    name: "",
                    year: new Date().getFullYear(),
                    result: "selected",
                    edition: "",
                    section: "",
                    category: "",
                    awardName: "",
                  })
                }
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
                Add Award/Festival
              </Button>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  )
}
