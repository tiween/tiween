"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

type SubscribeFormValues = z.infer<typeof subscribeSchema>

export function NewsletterSubscribeForm() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const form = useForm<SubscribeFormValues>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: "",
    },
  })

  const onSubmit = async (data: SubscribeFormValues) => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      })

      const result = await response.json()

      if (result.success) {
        setIsSubmitted(true)
        toast({
          title: "You're in!",
          description: "We'll notify you when we launch.",
        })
      } else {
        if (result.error === "INVALID_EMAIL") {
          toast({
            title: "Invalid email",
            description: "Please enter a valid email address",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Something went wrong",
            description: "Please try again later",
            variant: "destructive",
          })
        }
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS STATE - Elegant confirmation
  // ═══════════════════════════════════════════════════════════════
  if (isSubmitted) {
    return (
      <div className="relative overflow-hidden">
        {/* Subtle celebratory glow */}
        <div
          className="absolute -inset-4 animate-pulse opacity-20 blur-2xl"
          style={{
            backgroundColor: "#F8EB06",
            animationDuration: "2s",
          }}
        />

        <div className="relative flex items-center justify-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-8 py-5 backdrop-blur-sm">
          {/* Animated check mark */}
          <div className="relative">
            <div
              className="absolute -inset-1 animate-ping opacity-30"
              style={{
                backgroundColor: "#F8EB06",
                borderRadius: "50%",
                animationDuration: "1.5s",
                animationIterationCount: "2",
              }}
            />
            <div
              className="relative flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "#F8EB06" }}
            >
              <Check className="h-5 w-5 text-black" strokeWidth={3} />
            </div>
          </div>

          <div className="text-left">
            <p className="text-sm font-medium text-white">
              You&apos;re on the list!
            </p>
            <p className="text-xs text-white/50">
              We&apos;ll be in touch soon.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // FORM STATE - Elegant input with micro-interactions
  // ═══════════════════════════════════════════════════════════════
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
      {/* Focus glow effect */}
      <div
        className={`absolute -inset-2 rounded-2xl blur-xl transition-all duration-500 ${
          isFocused ? "opacity-20" : "opacity-0"
        }`}
        style={{ backgroundColor: "#F8EB06" }}
      />

      <div className="relative flex gap-3">
        {/* Input wrapper with glass effect */}
        <div className="relative flex-1">
          <Input
            type="email"
            placeholder="Enter your email"
            className={`h-14 rounded-xl border-white/10 bg-white/[0.04] pr-4 pl-5 text-base text-white backdrop-blur-sm transition-all duration-300 placeholder:text-white/35 focus:border-white/20 focus:bg-white/[0.06] ${
              isFocused ? "ring-1 ring-white/10" : ""
            }`}
            disabled={isLoading}
            onFocus={() => setIsFocused(true)}
            {...form.register("email", {
              onBlur: () => setIsFocused(false),
            })}
          />

          {/* Validation error - slides in from below */}
          <div
            className={`absolute -bottom-7 left-0 transition-all duration-300 ${
              form.formState.errors.email
                ? "translate-y-0 opacity-100"
                : "translate-y-1 opacity-0"
            }`}
          >
            <p className="text-xs text-red-400">
              {form.formState.errors.email?.message}
            </p>
          </div>
        </div>

        {/* Submit button with hover effects */}
        <Button
          type="submit"
          size="lg"
          className="group relative h-14 min-w-[60px] overflow-hidden rounded-xl px-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg disabled:hover:scale-100"
          style={{
            backgroundColor: "#F8EB06",
            color: "#032523",
          }}
          disabled={isLoading}
        >
          {/* Button shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-500 group-hover:translate-x-full" />

          {isLoading ? (
            <Loader2 className="relative h-5 w-5 animate-spin" />
          ) : (
            <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
          )}
        </Button>
      </div>

      {/* Subtle helper text */}
      <p className="mt-5 text-center text-xs text-white/30">
        <Sparkles className="mr-1 inline h-3 w-3" />
        No spam, just one email when we launch
      </p>
    </form>
  )
}
