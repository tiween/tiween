"use client"

import { useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, User } from "lucide-react"
import { useForm } from "react-hook-form"

import type { CreatePersonData } from "../../schemas/person"
import type { ContributeLabels } from "../../types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { createPersonSchema } from "../../schemas/person"

interface PersonCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreatePersonData) => void
  labels: ContributeLabels
  initialName?: string
}

export function PersonCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  labels,
  initialName = "",
}: PersonCreateDialogProps) {
  const form = useForm<CreatePersonData>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      name: initialName,
      photo: "",
      nationality: "",
    },
  })

  // Translate error codes to messages
  const translateError = useCallback(
    (code: string) => {
      return labels.errors[code] || code
    },
    [labels.errors]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    (data: CreatePersonData) => {
      onSubmit(data)
      form.reset()
    },
    [onSubmit, form]
  )

  // Handle dialog close
  const handleClose = useCallback(() => {
    form.reset()
    onOpenChange(false)
  }, [form, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-white/20 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Person
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Create a new person to add to the credits. They will be reviewed
            along with the play submission.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full name"
                      autoFocus
                      className={cn(
                        "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
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

            {/* Photo URL (optional) */}
            <FormField
              control={form.control}
              name="photo"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Photo URL (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://..."
                      className={cn(
                        "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
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

            {/* Nationality (optional) */}
            <FormField
              control={form.control}
              name="nationality"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Nationality (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Tunisian, Moroccan..."
                      className={cn(
                        "bg-tiween-green border-white/20 text-white placeholder:text-white/40",
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-tiween-yellow text-tiween-green hover:bg-tiween-yellow/90"
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Person"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
