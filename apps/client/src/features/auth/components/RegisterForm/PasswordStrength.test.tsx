/**
 * PasswordStrengthIndicator Tests
 *
 * NOTE: These tests require Vitest and @testing-library/react to be installed.
 * @ts-nocheck
 */

import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PasswordStrengthIndicator } from "./PasswordStrength"

describe("PasswordStrengthIndicator", () => {
  it("renders nothing when password is empty", () => {
    const { container } = render(<PasswordStrengthIndicator password="" />)
    expect(container.firstChild).toBeNull()
  })

  it("renders 'Faible' (weak) label for a weak password", () => {
    render(<PasswordStrengthIndicator password="abc" />)
    expect(screen.getByText(/faible/i)).toBeInTheDocument()
  })

  it("renders 'Moyen' (medium) label for a medium password", () => {
    render(<PasswordStrengthIndicator password="abcdefg1" />)
    expect(screen.getByText(/moyen/i)).toBeInTheDocument()
  })

  it("renders 'Fort' (strong) label for a strong password", () => {
    render(<PasswordStrengthIndicator password="Strong1!" />)
    expect(screen.getByText(/fort/i)).toBeInTheDocument()
  })

  it("renders progress bar with role=progressbar", () => {
    render(<PasswordStrengthIndicator password="Strong1!" />)
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("renders custom localized labels", () => {
    render(
      <PasswordStrengthIndicator
        password="Strong1!"
        labels={{ weak: "Weak", medium: "Medium", strong: "Strong" }}
      />
    )
    expect(screen.getByText("Strong")).toBeInTheDocument()
  })
})
