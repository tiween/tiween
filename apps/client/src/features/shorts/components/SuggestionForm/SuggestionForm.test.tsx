/**
 * SuggestionForm — the failure modes a visitor actually hits:
 *
 *  - leaving the optional Year / Duration fields blank must NOT block the
 *    submission (an empty input used to coerce to 0 and fail `min(1900)` with
 *    an untranslated English message),
 *  - a failed send keeps the form and every typed value on screen, with the
 *    translated explanation for the error code,
 *  - a slow send cannot be submitted twice,
 *  - validation messages are translated, never zod's English defaults.
 */
import * as React from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ShortFilmSuggestion } from "../../types"

import ar from "../../../../../locales/ar.json"
import fr from "../../../../../locales/fr.json"
import { SuggestionForm } from "./SuggestionForm"

const MESSAGES = { fr, ar } as const

function renderForm(
  onSubmit: (data: ShortFilmSuggestion) => Promise<void>,
  locale: keyof typeof MESSAGES = "fr"
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Africa/Tunis"
    >
      <SuggestionForm onSubmit={onSubmit} />
    </NextIntlClientProvider>
  )
}

async function openAndFillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Suggérer un court métrage" })
  )
  await user.type(screen.getByLabelText(/Titre du film/), "Communion")
  await user.type(screen.getByLabelText(/Votre nom/), "Leïla")
  await user.type(screen.getByLabelText(/Votre e-mail/), "leila@example.test")
}

afterEach(cleanup)

// user-event types character by character; under a parallel full-suite run
// that alone can exceed the 5s default.
describe("SuggestionForm", { timeout: 20_000 }, () => {
  it("submits with the optional number fields left blank", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)

    await openAndFillRequired(user)
    await user.click(
      screen.getByRole("button", { name: "Envoyer la suggestion" })
    )

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const sent = onSubmit.mock.calls[0]![0] as ShortFilmSuggestion
    expect(sent).toMatchObject({
      title: "Communion",
      submitterName: "Leïla",
      submitterEmail: "leila@example.test",
    })
    expect(sent.year).toBeUndefined()
    expect(sent.duration).toBeUndefined()
    expect(await screen.findByText("Merci !")).toBeInTheDocument()
  })

  it("keeps every value and explains the code when sending fails", async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error("SUGGESTION_UNAVAILABLE"))
    renderForm(onSubmit)

    await openAndFillRequired(user)
    await user.click(
      screen.getByRole("button", { name: "Envoyer la suggestion" })
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("La suggestion n'a pas été envoyée")
    expect(alert).toHaveTextContent("Vos réponses sont conservées")
    expect(screen.getByLabelText(/Titre du film/)).toHaveValue("Communion")
    expect(screen.getByLabelText(/Votre e-mail/)).toHaveValue(
      "leila@example.test"
    )
  })

  it("maps an unknown failure to the generic explanation", async () => {
    const user = userEvent.setup()
    renderForm(vi.fn().mockRejectedValue(new Error("boom")))

    await openAndFillRequired(user)
    await user.click(
      screen.getByRole("button", { name: "Envoyer la suggestion" })
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "L'envoi a échoué"
    )
  })

  it("cannot be submitted twice while a send is in flight", async () => {
    const user = userEvent.setup()
    let resolve!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((done) => (resolve = done)))
    renderForm(onSubmit)

    await openAndFillRequired(user)
    const submit = screen.getByRole("button", {
      name: "Envoyer la suggestion",
    })
    await user.click(submit)
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole("button", { name: "Envoi en cours…" })
    ).toBeDisabled()
    resolve()
    expect(await screen.findByText("Merci !")).toBeInTheDocument()
  })

  it("explains out-of-range numbers in the visitor's language", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    renderForm(onSubmit)

    await openAndFillRequired(user)
    await user.type(screen.getByLabelText("Durée (minutes)"), "95")
    await user.click(
      screen.getByRole("button", { name: "Envoyer la suggestion" })
    )

    expect(
      await screen.findByText("Un court métrage dure entre 1 et 60 minutes.")
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("translates required-field errors in Arabic", async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), "ar")

    await user.click(
      screen.getByRole("button", { name: "اقترح فيلمًا قصيرًا" })
    )
    await user.click(screen.getByRole("button", { name: "أرسل الاقتراح" }))

    expect(await screen.findByText("أدخل عنوان الفيلم.")).toBeInTheDocument()
    expect(screen.getByText("أدخل اسمك.")).toBeInTheDocument()
  })
})
