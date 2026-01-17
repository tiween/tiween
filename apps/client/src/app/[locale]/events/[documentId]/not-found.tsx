"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"

export default function EventNotFound() {
  const locale = useLocale()
  const isRTL = locale === "ar"
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  const labels = {
    ar: {
      title: "الحدث غير موجود",
      description: "عذراً، لم نتمكن من العثور على الحدث الذي تبحث عنه.",
      backToEvents: "العودة إلى الأحداث",
    },
    fr: {
      title: "Événement non trouvé",
      description:
        "Désolé, nous n'avons pas pu trouver l'événement que vous recherchez.",
      backToEvents: "Retour aux événements",
    },
    en: {
      title: "Event not found",
      description: "Sorry, we couldn't find the event you're looking for.",
      backToEvents: "Back to events",
    },
  }

  const t = labels[locale as keyof typeof labels] || labels.fr

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-muted-foreground mb-6">
        <Calendar className="h-16 w-16" />
      </div>

      <h1 className="text-foreground mb-2 text-2xl font-bold">{t.title}</h1>
      <p className="text-muted-foreground mb-8 text-center">{t.description}</p>

      <Button asChild>
        <Link href={`/${locale}`}>
          <BackArrow className="me-2 h-4 w-4" />
          {t.backToEvents}
        </Link>
      </Button>
    </div>
  )
}
