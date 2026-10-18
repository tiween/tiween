/**
 * CodeMultiPicker and its option helpers (plan 01-08, D-01, D-02, D-18).
 *
 * The helpers carry the rules (pinned code first, search over label and code,
 * "none" exclusivity, no duplicates); the component test then checks that the
 * rendered chips and the Design System combobox are wired to them.
 */
import React, { useState } from "react"
import { DesignSystemProvider, lightTheme } from "@strapi/design-system"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { IntlProvider } from "react-intl"

import type { WorkFormValues } from "../WorkForm/schema"

import {
  addCode,
  buildCodeOptions,
  CodeMultiPicker,
  CountryLanguageFields,
  filterCodeOptions,
  removeCode,
} from "../WorkForm/CountryLanguageFields"
import { DEFAULT_WORK_VALUES } from "../WorkForm/schema"

const LABELS: Record<string, string> = {
  AE: "United Arab Emirates",
  DE: "Germany",
  FR: "France",
  TN: "Tunisia",
  US: "United States",
}
const labelFor = (code: string) => LABELS[code] ?? code

describe("buildCodeOptions", () => {
  it("puts the pinned code first and sorts the rest by label", () => {
    const options = buildCodeOptions({
      codes: ["US", "DE", "TN", "AE", "FR"],
      pinned: "TN",
      labelFor,
      locale: "en",
    })

    expect(options.map((option) => option.code)).toEqual([
      "TN",
      "FR",
      "DE",
      "AE",
      "US",
    ])
    expect(options[0]).toEqual({ code: "TN", label: "Tunisia" })
  })

  it("sorts by label in the given locale, not by code", () => {
    const options = buildCodeOptions({
      codes: ["US", "DE", "AE"],
      pinned: "TN",
      labelFor,
      locale: "en",
    })

    expect(options.map((option) => option.label)).toEqual([
      "Germany",
      "United Arab Emirates",
      "United States",
    ])
  })

  it("keeps the declared order of a curated list after the pinned code", () => {
    const options = buildCodeOptions({
      codes: ["fr", "aeb", "ar"],
      pinned: "aeb",
      labelFor: (code) => code,
      locale: "en",
    })

    expect(options[0].code).toBe("aeb")
  })
})

describe("filterCodeOptions", () => {
  const options = buildCodeOptions({
    codes: Object.keys(LABELS),
    pinned: "TN",
    labelFor,
    locale: "en",
  })

  it("returns everything for an empty term", () => {
    expect(filterCodeOptions(options, "  ")).toHaveLength(5)
  })

  it("matches the label case-insensitively", () => {
    expect(filterCodeOptions(options, "tuni").map((o) => o.code)).toEqual([
      "TN",
    ])
  })

  it("matches the code too", () => {
    expect(filterCodeOptions(options, "de").map((o) => o.code)).toContain("DE")
  })

  it("ignores diacritics", () => {
    const accented = [
      { code: "TN", label: "Tunisie" },
      { code: "CI", label: "Côte d’Ivoire" },
    ]

    expect(filterCodeOptions(accented, "cote").map((o) => o.code)).toEqual([
      "CI",
    ])
  })
})

describe("addCode / removeCode", () => {
  it("appends a new code", () => {
    expect(addCode(["TN"], "FR")).toEqual(["TN", "FR"])
  })

  it("does nothing for an already-selected code", () => {
    const current = ["TN", "FR"]

    expect(addCode(current, "TN")).toBe(current)
  })

  it("replaces the selection when the exclusive code is chosen", () => {
    expect(addCode(["aeb", "fr"], "none", "none")).toEqual(["none"])
  })

  it("replaces the exclusive code when another code is chosen", () => {
    expect(addCode(["none"], "fr", "none")).toEqual(["fr"])
  })

  it("removes a code and leaves the others in order", () => {
    expect(removeCode(["TN", "FR", "DE"], "FR")).toEqual(["TN", "DE"])
  })
})

function Harness({
  initial = [],
  onChange,
}: {
  initial?: string[]
  onChange: (next: string[]) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <CodeMultiPicker
      label="Countries"
      codes={Object.keys(LABELS)}
      pinned="TN"
      value={value}
      labelFor={labelFor}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

async function renderPicker(initial: string[], onChange = jest.fn()) {
  await act(async () => {
    render(
      <IntlProvider locale="en">
        <DesignSystemProvider theme={lightTheme}>
          <Harness initial={initial} onChange={onChange} />
        </DesignSystemProvider>
      </IntlProvider>
    )
  })
  return onChange
}

describe("CodeMultiPicker", () => {
  it("renders a removable tag per selected code with its label", async () => {
    await renderPicker(["TN", "FR"])

    expect(screen.getByText("Tunisia")).toBeInTheDocument()
    expect(screen.getByText("France")).toBeInTheDocument()
  })

  it("removing a tag calls onChange without that code", async () => {
    const onChange = await renderPicker(["TN", "FR"])

    fireEvent.click(screen.getByRole("button", { name: /remove france/i }))

    expect(onChange).toHaveBeenCalledWith(["TN"])
    expect(screen.queryByText("France")).toBeNull()
  })

  it("offers a searchable input labelled by the field", async () => {
    await renderPicker([])

    expect(
      screen.getByRole("combobox", { name: "Countries" })
    ).toBeInTheDocument()
  })

  it("filters the options as the admin types and adds the chosen code", async () => {
    const onChange = await renderPicker([])
    const input = screen.getByRole("combobox", { name: "Countries" })

    await act(async () => {
      fireEvent.change(input, { target: { value: "tuni" } })
    })
    const listbox = await screen.findByRole("listbox")
    const options = within(listbox).getAllByRole("option")
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent("Tunisia")

    await act(async () => {
      fireEvent.click(options[0])
    })

    expect(onChange).toHaveBeenCalledWith(["TN"])
    expect(
      screen.getByRole("button", { name: /remove tunisia/i })
    ).toBeInTheDocument()
  })
})

function FieldsHarness({ values }: { values: Partial<WorkFormValues> }) {
  const { control } = useForm<WorkFormValues>({
    defaultValues: { ...DEFAULT_WORK_VALUES, ...values },
  })
  return <CountryLanguageFields control={control} />
}

async function renderFields(locale: string, values: Partial<WorkFormValues>) {
  await act(async () => {
    render(
      <IntlProvider locale={locale} onError={() => undefined}>
        <DesignSystemProvider theme={lightTheme}>
          <FieldsHarness values={values} />
        </DesignSystemProvider>
      </IntlProvider>
    )
  })
}

describe("CountryLanguageFields", () => {
  it("renders the country and language pickers", async () => {
    await renderFields("en", {})

    expect(
      screen.getByRole("combobox", { name: "Countries" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Languages" })
    ).toBeInTheDocument()
  })

  it("labels countries with Intl.DisplayNames in the admin locale", async () => {
    await renderFields("fr", { country: ["TN"] })

    expect(screen.getByText("Tunisie")).toBeInTheDocument()
  })

  it("uses explicit labels for aeb, ber and none", async () => {
    await renderFields("en", { language: ["aeb", "ber"] })

    expect(screen.getByText("Tunisian Arabic (Derja)")).toBeInTheDocument()
    expect(screen.getByText("Amazigh")).toBeInTheDocument()
  })

  it("labels the none language as no dialogue", async () => {
    await renderFields("en", { language: ["none"] })

    expect(screen.getByText("No dialogue")).toBeInTheDocument()
  })

  it("labels the other languages with Intl.DisplayNames", async () => {
    await renderFields("fr", { language: ["fr", "ar"] })

    expect(screen.getByText("français")).toBeInTheDocument()
    expect(screen.getByText("arabe")).toBeInTheDocument()
  })
})
