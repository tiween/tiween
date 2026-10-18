/**
 * MediaInput component tests (plan 01-07, FR57, research Pitfall 2).
 *
 * The previous MediaInput was a URL-paste stub that fabricated a timestamp id,
 * so a "selected" image was never an upload row and the saved work referenced
 * nothing. The contract pinned here: assets come ONLY from Strapi's own
 * media-library dialog (registered by `@strapi/upload` as the
 * `media-library` component), keep their real `id`/`url`/`formats`, and the
 * input never invents one.
 *
 * The real dialog needs the admin shell, so a fake component is injected
 * through the `useStrapiApp` stand-in. It exposes buttons that call the same
 * `onSelectAssets` / `onClose` props the real dialog receives.
 */
import React from "react"
import { Button, DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { useStrapiApp } from "@strapi/strapi/admin"
import { act, fireEvent, render, screen } from "@testing-library/react"
import { IntlProvider } from "react-intl"

import type { MediaAsset } from "../MediaInput"

import { MediaInput, toMediaAsset } from "../MediaInput"

interface FakeDialogProps {
  allowedTypes?: string[]
  onClose: () => void
  onSelectAssets: (files: unknown[]) => void
}

/** What the fake dialog hands back when "pick" is pressed; per-test. */
let selection: unknown[] = []

function FakeDialog({
  allowedTypes,
  onClose,
  onSelectAssets,
}: FakeDialogProps) {
  return (
    <div data-testid="media-dialog" data-allowed={(allowedTypes ?? []).join()}>
      <Button onClick={() => onSelectAssets(selection)}>pick</Button>
      <Button onClick={onClose}>close-dialog</Button>
    </div>
  )
}

const mockedUseStrapiApp = useStrapiApp as unknown as jest.Mock

function registerDialog(component: unknown = FakeDialog) {
  mockedUseStrapiApp.mockImplementation(
    (
      _name: string,
      selector: (state: { components: Record<string, unknown> }) => unknown
    ) =>
      selector({
        components: component ? { "media-library": component } : {},
      })
  )
}

const file = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  documentId: `doc-${id}`,
  name: `file-${id}.jpg`,
  url: `/uploads/file-${id}.jpg`,
  mime: "image/jpeg",
  formats: { thumbnail: { url: `/uploads/thumb_file-${id}.jpg` } },
  ...extra,
})

const asset = (id: number): MediaAsset => ({
  id,
  name: `file-${id}.jpg`,
  url: `/uploads/file-${id}.jpg`,
  mime: "image/jpeg",
})

function renderInput(props: Partial<React.ComponentProps<typeof MediaInput>>) {
  const onChange = jest.fn()
  render(
    <IntlProvider locale="en" messages={{}}>
      <DesignSystemProvider theme={lightTheme}>
        <MediaInput value={null} onChange={onChange} {...props} />
      </DesignSystemProvider>
    </IntlProvider>
  )
  return { onChange }
}

beforeEach(() => {
  selection = []
  registerDialog()
})

describe("MediaInput single mode", () => {
  it("opens the dialog, forwards the real asset id and closes", async () => {
    selection = [file(42)]
    const { onChange } = renderInput({})

    expect(screen.queryByTestId("media-dialog")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    expect(screen.getByTestId("media-dialog")).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText("pick"))
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    const value = onChange.mock.calls[0][0] as MediaAsset
    expect(value.id).toBe(42)
    expect(value.url).toBe("/uploads/file-42.jpg")
    expect(value.formats?.thumbnail?.url).toBe("/uploads/thumb_file-42.jpg")
    expect(screen.queryByTestId("media-dialog")).not.toBeInTheDocument()
  })

  it("keeps only the first asset when several are selected", async () => {
    selection = [file(1), file(2)]
    const { onChange } = renderInput({})

    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    await act(async () => {
      fireEvent.click(screen.getByText("pick"))
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect((onChange.mock.calls[0][0] as MediaAsset).id).toBe(1)
  })

  it("closes the dialog without changing the value on close", () => {
    const { onChange } = renderInput({})

    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    fireEvent.click(screen.getByText("close-dialog"))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId("media-dialog")).not.toBeInTheDocument()
  })

  it("removes the asset with onChange(null)", () => {
    const { onChange } = renderInput({ value: asset(7) })

    fireEvent.click(screen.getByRole("button", { name: /remove/i }))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it("offers replace when an asset is already set", () => {
    renderInput({ value: asset(7) })

    expect(screen.getByRole("button", { name: /replace/i })).toBeInTheDocument()
  })
})

describe("MediaInput multiple mode", () => {
  it("appends the selection, de-duplicated by id and in order", async () => {
    selection = [file(1), file(2)]
    const { onChange } = renderInput({ multiple: true, value: [asset(1)] })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    await act(async () => {
      fireEvent.click(screen.getByText("pick"))
    })

    expect(onChange).toHaveBeenCalledTimes(1)
    const ids = (onChange.mock.calls[0][0] as MediaAsset[]).map((a) => a.id)
    expect(ids).toEqual([1, 2])
  })

  it("removes one asset and keeps the rest", () => {
    const { onChange } = renderInput({
      multiple: true,
      value: [asset(1), asset(2)],
    })

    fireEvent.click(screen.getAllByRole("button", { name: /remove/i })[0])

    const next = onChange.mock.calls[0][0] as MediaAsset[]
    expect(next.map((a) => a.id)).toEqual([2])
  })
})

describe("MediaInput dialog wiring", () => {
  it("passes allowedTypes to the dialog unchanged, defaulting to images", () => {
    renderInput({})
    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    expect(screen.getByTestId("media-dialog")).toHaveAttribute(
      "data-allowed",
      "images"
    )
  })

  it("forwards a custom allowedTypes list", () => {
    renderInput({ allowedTypes: ["images", "videos"] })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))
    expect(screen.getByTestId("media-dialog")).toHaveAttribute(
      "data-allowed",
      "images,videos"
    )
  })

  it("disables the add and remove controls when disabled", () => {
    renderInput({ value: asset(3), disabled: true })

    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThan(0)
    // The Design System marks a disabled button with aria-disabled and ignores
    // its clicks, rather than setting the native attribute.
    buttons.forEach((button) =>
      expect(button).toHaveAttribute("aria-disabled", "true")
    )
  })

  it("renders neither an 'Add from URL' affordance nor a URL input, even after opening", () => {
    renderInput({})

    // The URL form lived inside a modal that only mounted on click, so the
    // assertion has to run after the add control is pressed.
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    expect(screen.queryByText(/url/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("shows a disabled control and a message when the media library is not registered", () => {
    registerDialog(null)
    renderInput({})

    expect(screen.getByRole("button", { name: /add/i })).toHaveAttribute(
      "aria-disabled",
      "true"
    )
    expect(
      screen.getByText("The media library is unavailable")
    ).toBeInTheDocument()
  })
})

describe("toMediaAsset", () => {
  it("keeps the asset fields and the three format urls, dropping the rest", () => {
    const mapped = toMediaAsset({
      id: 5,
      documentId: "doc-5",
      name: "a.jpg",
      url: "/uploads/a.jpg",
      mime: "image/jpeg",
      width: 800,
      height: 600,
      formats: {
        thumbnail: { url: "/t.jpg", width: 10, hash: "x" },
        small: { url: "/s.jpg" },
        medium: { url: "/m.jpg" },
        large: { url: "/l.jpg" },
      },
      hash: "abc",
      size: 12.3,
      createdAt: "2026-01-01",
      provider: "local",
    })

    expect(mapped).toEqual({
      id: 5,
      documentId: "doc-5",
      name: "a.jpg",
      url: "/uploads/a.jpg",
      mime: "image/jpeg",
      width: 800,
      height: 600,
      formats: {
        thumbnail: { url: "/t.jpg" },
        small: { url: "/s.jpg" },
        medium: { url: "/m.jpg" },
      },
    })
  })

  it("omits formats when the file has none", () => {
    const mapped = toMediaAsset({
      id: 6,
      name: "b.jpg",
      url: "/uploads/b.jpg",
      mime: "image/jpeg",
    })

    expect(mapped.id).toBe(6)
    expect(mapped.formats).toBeUndefined()
  })
})
