import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ShareDialogLabels } from "./ShareDialog"

import { ShareDialog } from "./ShareDialog"

const toastMock = vi.fn()
vi.mock("@/components/ui/use-toast", () => ({
  toast: (args: unknown) => toastMock(args),
}))

const labels: ShareDialogLabels = {
  shareVia: "Partager via",
  copyLink: "Copier le lien",
  linkCopied: "Lien copié",
  copyFailed: "Échec de la copie du lien",
  shareOnWhatsapp: "Partager sur WhatsApp",
  shareOnFacebook: "Partager sur Facebook",
  shareOnTwitter: "Partager sur Twitter",
}

const url = "https://tiween.tn/fr/events/abc"
const title = "Barbie"

afterEach(() => {
  vi.clearAllMocks()
})

describe("ShareDialog", () => {
  it("shows the copy button and the three social links with correct hrefs", () => {
    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        url={url}
        title={title}
        labels={labels}
      />
    )

    expect(
      screen.getByRole("button", { name: /Copier le lien/ })
    ).toBeTruthy()

    const whatsapp = screen.getByRole("link", { name: "Partager sur WhatsApp" })
    expect(whatsapp.getAttribute("href")).toBe(
      "https://wa.me/?text=Barbie%20https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )
    expect(whatsapp.getAttribute("target")).toBe("_blank")
    expect(whatsapp.getAttribute("rel")).toBe("noopener noreferrer")

    const facebook = screen.getByRole("link", { name: "Partager sur Facebook" })
    expect(facebook.getAttribute("href")).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )

    const twitter = screen.getByRole("link", { name: "Partager sur Twitter" })
    expect(twitter.getAttribute("href")).toBe(
      "https://twitter.com/intent/tweet?text=Barbie&url=https%3A%2F%2Ftiween.tn%2Ffr%2Fevents%2Fabc"
    )
  })

  it("copies the url and fires a success toast when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        url={url}
        title={title}
        labels={labels}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Copier le lien/ }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(url)
      expect(toastMock).toHaveBeenCalledWith({ title: "Lien copié" })
    })
  })

  it("fires a destructive toast when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    Object.assign(navigator, { clipboard: { writeText } })

    render(
      <ShareDialog
        open
        onOpenChange={vi.fn()}
        url={url}
        title={title}
        labels={labels}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /Copier le lien/ }))

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        title: "Échec de la copie du lien",
        variant: "destructive",
      })
    })
  })
})
