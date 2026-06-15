"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, CheckCircle, Film, Loader2, Send } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type {
  PlatformType,
  ShortFilmSuggestion,
  SuggestionFormLabels,
} from "../../types"

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

const defaultLabels: SuggestionFormLabels = {
  title: "Suggérer un court métrage",
  formTitle: "Proposez un court métrage",
  formDescription:
    "Vous connaissez un court métrage qui mérite d'être découvert ? Partagez-le avec notre communauté.",
  movieTitle: "Titre du film",
  originalTitle: "Titre original",
  director: "Réalisateur",
  year: "Année de sortie",
  duration: "Durée (minutes)",
  synopsis: "Synopsis",
  genres: "Genres",
  country: "Pays",
  language: "Langue",
  trailerUrl: "Lien bande-annonce",
  watchUrl: "Lien pour visionner",
  platform: "Plateforme",
  posterUrl: "URL de l'affiche",
  yourName: "Votre nom",
  yourEmail: "Votre email",
  additionalNotes: "Notes complémentaires",
  submit: "Envoyer la suggestion",
  submitting: "Envoi en cours...",
  successTitle: "Merci !",
  successMessage:
    "Votre suggestion a été envoyée avec succès. Notre équipe l'examinera prochainement.",
  errorTitle: "Erreur",
  errorMessage:
    "Une erreur s'est produite lors de l'envoi. Veuillez réessayer.",
  required: "Champ obligatoire",
}

// Form validation schema
const suggestionSchema = z.object({
  title: z.string().min(1, "Le titre est obligatoire"),
  originalTitle: z.string().optional(),
  director: z.string().optional(),
  year: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  duration: z.coerce.number().min(1).max(60).optional(),
  synopsis: z.string().optional(),
  genres: z.string().optional(),
  country: z.string().optional(),
  language: z.string().optional(),
  trailerUrl: z.string().url().optional().or(z.literal("")),
  watchUrl: z.string().url().optional().or(z.literal("")),
  platform: z.string().optional(),
  posterUrl: z.string().url().optional().or(z.literal("")),
  submitterName: z.string().min(1, "Votre nom est obligatoire"),
  submitterEmail: z.string().email("Email invalide"),
  additionalNotes: z.string().optional(),
})

type SuggestionFormData = z.infer<typeof suggestionSchema>

export interface SuggestionFormProps {
  /** Called when form is submitted */
  onSubmit: (data: ShortFilmSuggestion) => Promise<void>
  /** Additional class names */
  className?: string
  /** Localized labels */
  labels?: SuggestionFormLabels
  /** Trigger button variant */
  triggerVariant?: "button" | "link"
}

export function SuggestionForm({
  onSubmit,
  className,
  labels = defaultLabels,
  triggerVariant = "button",
}: SuggestionFormProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [submitStatus, setSubmitStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      title: "",
      originalTitle: "",
      director: "",
      synopsis: "",
      genres: "",
      country: "",
      language: "",
      trailerUrl: "",
      watchUrl: "",
      platform: "",
      posterUrl: "",
      submitterName: "",
      submitterEmail: "",
      additionalNotes: "",
    },
  })

  const handleSubmit = async (data: SuggestionFormData) => {
    setSubmitStatus("loading")

    try {
      const suggestion: ShortFilmSuggestion = {
        title: data.title,
        originalTitle: data.originalTitle,
        director: data.director,
        year: data.year,
        duration: data.duration,
        synopsis: data.synopsis,
        genres: data.genres
          ?.split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        country: data.country,
        language: data.language,
        trailerUrl: data.trailerUrl || undefined,
        watchUrl: data.watchUrl || undefined,
        platform: data.platform as PlatformType | undefined,
        posterUrl: data.posterUrl || undefined,
        submitterName: data.submitterName,
        submitterEmail: data.submitterEmail,
        additionalNotes: data.additionalNotes,
      }

      await onSubmit(suggestion)
      setSubmitStatus("success")
      form.reset()
    } catch {
      setSubmitStatus("error")
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setSubmitStatus("idle")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {triggerVariant === "button" ? (
          <Button className={cn("gap-2", className)}>
            <Film className="h-4 w-4" />
            {labels.title}
          </Button>
        ) : (
          <button className={cn("text-primary hover:underline", className)}>
            {labels.title}
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="text-primary h-5 w-5" />
            {labels.formTitle}
          </DialogTitle>
          <DialogDescription>{labels.formDescription}</DialogDescription>
        </DialogHeader>

        {submitStatus === "success" ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500" />
            <h3 className="text-lg font-semibold">{labels.successTitle}</h3>
            <p className="text-muted-foreground">{labels.successMessage}</p>
            <Button onClick={() => setIsOpen(false)}>Fermer</Button>
          </div>
        ) : submitStatus === "error" ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle className="text-destructive h-16 w-16" />
            <h3 className="text-lg font-semibold">{labels.errorTitle}</h3>
            <p className="text-muted-foreground">{labels.errorMessage}</p>
            <Button onClick={() => setSubmitStatus("idle")}>Réessayer</Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              {/* Movie information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {labels.movieTitle}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="originalTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.originalTitle}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="director"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.director}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.year}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1900}
                            max={new Date().getFullYear() + 1}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.duration}</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={60} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.country}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="synopsis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.synopsis}</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
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
                      <FormLabel>{labels.genres}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Drame, Animation, Documentaire..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Séparez les genres par des virgules
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Links */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="trailerUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.trailerUrl}</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="watchUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{labels.watchUrl}</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.platform}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez une plateforme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                          <SelectItem value="dailymotion">
                            Dailymotion
                          </SelectItem>
                          <SelectItem value="mubi">MUBI</SelectItem>
                          <SelectItem value="netflix">Netflix</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submitter information */}
              <div className="border-t pt-4">
                <p className="text-muted-foreground mb-4 text-sm font-medium">
                  Vos coordonnées
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="submitterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {labels.yourName}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="submitterEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {labels.yourEmail}{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>{labels.additionalNotes}</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitStatus === "loading"}
              >
                {submitStatus === "loading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {labels.submitting}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {labels.submit}
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
