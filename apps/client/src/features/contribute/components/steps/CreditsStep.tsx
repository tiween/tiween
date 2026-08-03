"use client"

import { useCallback, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { HelpCircle, Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"

import type { Credit, CreditsStepData } from "../../schemas/play-contribution"
import type { ContributeLabels } from "../../types"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
  creditsStepSchema,
  THEATRE_ROLES,
} from "../../schemas/play-contribution"
import { PersonCreateDialog } from "../credits/PersonCreateDialog"
import { PersonSearchCombobox } from "../credits/PersonSearchCombobox"

interface CreditsStepProps {
  labels: ContributeLabels
  onValidateRef?: (fn: () => boolean) => void
}

// Role labels with categories
const roleInfo: Record<
  string,
  { label: string; category: string; showCharacter?: boolean }
> = {
  playwright: { label: "Playwright", category: "Creative" },
  director: { label: "Director", category: "Direction" },
  adaptor: { label: "Adaptor", category: "Creative" },
  translator: { label: "Translator", category: "Creative" },
  composer: { label: "Composer", category: "Music" },
  "musical-director": { label: "Musical Director", category: "Music" },
  choreographer: { label: "Choreographer", category: "Direction" },
  cast: { label: "Cast", category: "Performance", showCharacter: true },
  "set-designer": { label: "Set Designer", category: "Design" },
  "costume-designer": { label: "Costume Designer", category: "Design" },
  "lighting-designer": { label: "Lighting Designer", category: "Design" },
  "sound-designer": { label: "Sound Designer", category: "Design" },
  "projection-designer": { label: "Projection Designer", category: "Design" },
  "stage-manager": { label: "Stage Manager", category: "Production" },
  producer: { label: "Producer", category: "Production" },
  other: { label: "Other", category: "Other" },
}

// Quick add presets
const quickAddRoles = ["playwright", "director", "cast", "producer"] as const

// Empty credit template
const emptyCredit: Credit = {
  person: { name: "", isNew: true },
  role: "cast",
  character: "",
  customRole: "",
  billing: 99,
}

export function CreditsStep({ labels, onValidateRef }: CreditsStepProps) {
  const { formData, updateFormData, markStepCompleted, markStepIncomplete } =
    useContributeForm()

  const [isPersonDialogOpen, setIsPersonDialogOpen] = useState(false)
  const [editingCreditIndex, setEditingCreditIndex] = useState<number | null>(
    null
  )

  const form = useForm<CreditsStepData>({
    resolver: zodResolver(creditsStepSchema) as never,
    defaultValues: {
      credits: formData.credits?.length
        ? formData.credits
        : [{ ...emptyCredit }],
    },
    mode: "onChange",
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "credits",
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
    // eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form's watch() returns a fresh subscription/value the React Compiler cannot memoize; matches the existing suppressions in MediaStep.tsx and DataTable.tsx. Revisit when react-hook-form ships a compiler-safe API.
    const subscription = form.watch((data) => {
      if (data.credits) {
        updateFormData({ credits: data.credits as Credit[] })
      }
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData])

  // Expose validation function to parent
  useEffect(() => {
    if (onValidateRef) {
      onValidateRef(() => {
        // Synchronously trigger validation and check current values
        // form.formState.isValid can be stale with .refine() validators,
        // so we also parse directly with the schema
        const values = form.getValues()
        const result = creditsStepSchema.safeParse(values)
        if (result.success) {
          markStepCompleted(2)
        } else {
          markStepIncomplete(2)
          form.trigger()
        }
        return result.success
      })
    }
  }, [onValidateRef, form, markStepCompleted, markStepIncomplete])

  // Handle adding a new credit
  const handleAddCredit = useCallback(
    (role?: string) => {
      append({
        ...emptyCredit,
        role: (role as Credit["role"]) || "cast",
        billing: fields.length + 1,
      })
    },
    [append, fields.length]
  )

  // Handle person selection from search
  const handlePersonSelect = useCallback(
    (index: number, person: { documentId?: string; name: string }) => {
      const currentCredit = form.getValues(`credits.${index}`)
      update(index, {
        ...currentCredit,
        person: {
          documentId: person.documentId,
          name: person.name,
          isNew: !person.documentId,
        },
      })
    },
    [form, update]
  )

  // Handle creating a new person
  const handleCreatePerson = useCallback(
    (personData: { name: string; photo?: string; nationality?: string }) => {
      if (editingCreditIndex !== null) {
        const currentCredit = form.getValues(`credits.${editingCreditIndex}`)
        update(editingCreditIndex, {
          ...currentCredit,
          person: {
            name: personData.name,
            photo: personData.photo,
            nationality: personData.nationality,
            isNew: true,
          },
        })
      }
      setIsPersonDialogOpen(false)
      setEditingCreditIndex(null)
    },
    [editingCreditIndex, form, update]
  )

  // Check if role should show character field
  const shouldShowCharacter = (role: string) =>
    roleInfo[role]?.showCharacter ?? false

  // Get form errors
  const creditsError = form.formState.errors.credits

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-white">
          {labels.steps.credits}
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Add the cast and crew who worked on this production
        </p>
      </div>

      {/* Quick add buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="py-1 text-sm text-white/60">Quick add:</span>
        {quickAddRoles.map((role) => (
          <Button
            key={role}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddCredit(role)}
            className="gap-1 border-white/20 text-white hover:bg-white/10"
          >
            <Plus className="h-3 w-3" />
            {roleInfo[role]?.label}
          </Button>
        ))}
      </div>

      <Form {...form}>
        <form className="space-y-4">
          {/* Root error (e.g., "playwright or director required") */}
          {creditsError?.root && (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              {translateError(creditsError.root.message || "")}
            </div>
          )}

          {/* Credit cards */}
          <div className="space-y-4">
            {fields.map((field, index) => {
              const role = form.watch(`credits.${index}.role`)
              const showCharacter = shouldShowCharacter(role)

              return (
                <div
                  key={field.id}
                  className="bg-surface relative space-y-4 rounded-lg border border-white/10 p-4"
                >
                  {/* Drag handle and remove button */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="px-2 text-xs text-white/40">
                      #{index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="h-8 w-8 p-0 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Person and Role row */}
                  <div className="grid grid-cols-1 gap-4 pr-16 sm:grid-cols-2">
                    {/* Person */}
                    <FormField
                      control={form.control}
                      name={`credits.${index}.person.name`}
                      render={({ field: personField, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-white">
                            Person <span className="text-red-500">*</span>
                          </FormLabel>
                          <PersonSearchCombobox
                            value={personField.value}
                            onChange={(person) => {
                              if (person) {
                                handlePersonSelect(index, person)
                              } else {
                                personField.onChange("")
                              }
                            }}
                            onCreateNew={() => {
                              setEditingCreditIndex(index)
                              setIsPersonDialogOpen(true)
                            }}
                            placeholder="Search or create person..."
                            hasError={fieldState.invalid}
                          />
                          <FormMessage>
                            {fieldState.error?.message &&
                              translateError(fieldState.error.message)}
                          </FormMessage>
                        </FormItem>
                      )}
                    />

                    {/* Role */}
                    <FormField
                      control={form.control}
                      name={`credits.${index}.role`}
                      render={({ field: roleField, fieldState }) => (
                        <FormItem>
                          <FormLabel className="text-sm text-white">
                            Role <span className="text-red-500">*</span>
                          </FormLabel>
                          <Select
                            value={roleField.value}
                            onValueChange={roleField.onChange}
                          >
                            <FormControl>
                              <SelectTrigger
                                className={cn(
                                  "bg-tiween-green border-white/20 text-white",
                                  fieldState.invalid && "border-red-500"
                                )}
                              >
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-surface border-white/20">
                              {THEATRE_ROLES.map((role) => (
                                <SelectItem
                                  key={role}
                                  value={role}
                                  className="text-white hover:bg-white/10"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{roleInfo[role]?.label || role}</span>
                                    <Badge
                                      variant="secondary"
                                      className="bg-white/10 px-1 py-0 text-[10px]"
                                    >
                                      {roleInfo[role]?.category}
                                    </Badge>
                                  </div>
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

                  {/* Character name (for cast) and Billing */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Character (conditional) */}
                    {showCharacter && (
                      <FormField
                        control={form.control}
                        name={`credits.${index}.character`}
                        render={({ field: charField, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-white">
                              Character Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Hamlet, Juliet..."
                                className={cn(
                                  "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
                                  fieldState.invalid && "border-red-500"
                                )}
                                {...charField}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Custom Role (for "other") */}
                    {role === "other" && (
                      <FormField
                        control={form.control}
                        name={`credits.${index}.customRole`}
                        render={({ field: customField, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-sm text-white">
                              Custom Role
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Specify the role..."
                                className={cn(
                                  "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
                                  fieldState.invalid && "border-red-500"
                                )}
                                {...customField}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Billing */}
                    <FormField
                      control={form.control}
                      name={`credits.${index}.billing`}
                      render={({ field: billingField, fieldState }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm text-white">
                              Billing Order
                            </FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 text-white/50 hover:text-white"
                                  >
                                    <HelpCircle className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">
                                    1 = top billing (shown first), higher
                                    numbers = lower billing
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={99}
                              className={cn(
                                "bg-tiween-green w-20 border-white/20 text-white",
                                fieldState.invalid && "border-red-500"
                              )}
                              {...billingField}
                              onChange={(e) => {
                                const val = e.target.value
                                billingField.onChange(
                                  val ? parseInt(val, 10) : 99
                                )
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add credit button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAddCredit()}
            className="w-full gap-2 border-dashed border-white/20 text-white hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Add Another Credit
          </Button>
        </form>
      </Form>

      {/* Person create dialog */}
      <PersonCreateDialog
        open={isPersonDialogOpen}
        onOpenChange={setIsPersonDialogOpen}
        onSubmit={handleCreatePerson}
        labels={labels}
      />
    </div>
  )
}
