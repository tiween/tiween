"use client"

import { useTranslations } from "next-intl"

export default function OfflinePage() {
  const t = useTranslations("offline")

  return (
    <div className="bg-background flex min-h-[60vh] flex-col items-center justify-center p-4">
      <div className="mb-6 text-6xl">📡</div>
      <h1 className="font-display text-primary mb-3 text-2xl">{t("title")}</h1>
      <p className="text-muted-foreground mb-6 max-w-md text-center">
        {t("description")}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 font-medium transition-colors"
      >
        {t("retry")}
      </button>
    </div>
  )
}
