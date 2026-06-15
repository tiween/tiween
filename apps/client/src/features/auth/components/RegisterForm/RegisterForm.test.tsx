/**
 * RegisterForm Component Tests
 *
 * NOTE: These tests require Vitest and @testing-library/react to be installed.
 * Run: yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @testing-library/user-event
 *
 * @ts-nocheck
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RegisterForm } from "./RegisterForm"

describe("RegisterForm", () => {
  describe("Rendering", () => {
    it("renders all required fields", () => {
      render(<RegisterForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument()
      expect(
        screen.getByLabelText(/confirmer le mot de passe/i)
      ).toBeInTheDocument()
    })

    it("renders terms checkbox", () => {
      render(<RegisterForm onSubmit={vi.fn()} />)
      expect(screen.getByRole("checkbox")).toBeInTheDocument()
    })

    it("renders submit button with default label", () => {
      render(<RegisterForm onSubmit={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /^créer mon compte$/i })
      ).toBeInTheDocument()
    })

    it("renders social login buttons when callback provided", () => {
      render(<RegisterForm onSubmit={vi.fn()} onSocialLogin={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /continuer avec google/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /continuer avec facebook/i })
      ).toBeInTheDocument()
    })

    it("renders login link when callback provided", () => {
      render(<RegisterForm onSubmit={vi.fn()} onLogin={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /^se connecter$/i })
      ).toBeInTheDocument()
    })

    it("renders server error message when error prop set", () => {
      render(
        <RegisterForm
          onSubmit={vi.fn()}
          error="Un compte avec cet email existe déjà"
        />
      )
      expect(screen.getByRole("alert")).toHaveTextContent(
        /un compte avec cet email existe déjà/i
      )
    })
  })

  describe("Password visibility toggle", () => {
    it("password input is type=password by default", () => {
      render(<RegisterForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
        "type",
        "password"
      )
    })

    it("toggles each password field independently", async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={vi.fn()} />)
      const password = screen.getByLabelText("Mot de passe")
      const confirm = screen.getByLabelText(/confirmer le mot de passe/i)

      const toggles = screen.getAllByRole("button", {
        name: /afficher le mot de passe/i,
      })
      // toggles[0] = password field, toggles[1] = confirm field
      await user.click(toggles[0])
      expect(password).toHaveAttribute("type", "text")
      expect(confirm).toHaveAttribute("type", "password")
    })
  })

  describe("Password strength indicator", () => {
    it("does not display strength indicator when password is empty", () => {
      render(<RegisterForm onSubmit={vi.fn()} />)
      expect(screen.queryByText(/faible/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/moyen/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/fort/i)).not.toBeInTheDocument()
    })

    it("displays 'Faible' for a weak password", async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={vi.fn()} />)
      await user.type(screen.getByLabelText("Mot de passe"), "abc")
      expect(screen.getByText(/faible/i)).toBeInTheDocument()
    })

    it("displays 'Fort' for a strong password", async () => {
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={vi.fn()} />)
      await user.type(screen.getByLabelText("Mot de passe"), "Strong1!")
      expect(screen.getByText(/fort/i)).toBeInTheDocument()
    })
  })

  describe("Validation", () => {
    it("blocks submit when required fields are empty", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={onSubmit} />)

      await user.click(
        screen.getByRole("button", { name: /^créer mon compte$/i })
      )

      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled()
      })
    })

    it("shows PASSWORDS_DONT_MATCH error when passwords differ", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/nom complet/i), "Alice")
      await user.type(screen.getByLabelText(/email/i), "alice@example.com")
      await user.type(screen.getByLabelText("Mot de passe"), "secret12")
      await user.type(
        screen.getByLabelText(/confirmer le mot de passe/i),
        "different"
      )
      await user.click(screen.getByRole("checkbox"))
      await user.click(
        screen.getByRole("button", { name: /^créer mon compte$/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText(/les mots de passe ne correspondent pas/i)
        ).toBeInTheDocument()
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("shows TERMS_REQUIRED error when terms not accepted", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/nom complet/i), "Alice")
      await user.type(screen.getByLabelText(/email/i), "alice@example.com")
      await user.type(screen.getByLabelText("Mot de passe"), "secret12")
      await user.type(
        screen.getByLabelText(/confirmer le mot de passe/i),
        "secret12"
      )
      await user.click(
        screen.getByRole("button", { name: /^créer mon compte$/i })
      )

      await waitFor(() => {
        expect(
          screen.getByText(/vous devez accepter les conditions/i)
        ).toBeInTheDocument()
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("calls onSubmit with valid data", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<RegisterForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/nom complet/i), "Alice")
      await user.type(screen.getByLabelText(/email/i), "alice@example.com")
      await user.type(screen.getByLabelText("Mot de passe"), "secret12")
      await user.type(
        screen.getByLabelText(/confirmer le mot de passe/i),
        "secret12"
      )
      await user.click(screen.getByRole("checkbox"))
      await user.click(
        screen.getByRole("button", { name: /^créer mon compte$/i })
      )

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: "Alice",
          email: "alice@example.com",
          password: "secret12",
          confirmPassword: "secret12",
          acceptTerms: true,
        })
      })
    })
  })

  describe("Loading state", () => {
    it("disables submit button and shows submitting label when loading", () => {
      render(<RegisterForm onSubmit={vi.fn()} isLoading />)
      expect(
        screen.getByRole("button", { name: /création\.\.\./i })
      ).toBeDisabled()
    })

    it("disables every input when loading", () => {
      render(<RegisterForm onSubmit={vi.fn()} isLoading />)
      expect(screen.getByLabelText(/nom complet/i)).toBeDisabled()
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText("Mot de passe")).toBeDisabled()
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeDisabled()
      expect(screen.getByRole("checkbox")).toBeDisabled()
    })
  })

  describe("Callbacks", () => {
    it("calls onLogin when login link is clicked", () => {
      const onLogin = vi.fn()
      render(<RegisterForm onSubmit={vi.fn()} onLogin={onLogin} />)
      fireEvent.click(screen.getByRole("button", { name: /^se connecter$/i }))
      expect(onLogin).toHaveBeenCalledTimes(1)
    })

    it("calls onTermsClick when terms link is clicked", () => {
      const onTermsClick = vi.fn()
      render(<RegisterForm onSubmit={vi.fn()} onTermsClick={onTermsClick} />)
      fireEvent.click(
        screen.getByRole("button", { name: /conditions d'utilisation/i })
      )
      expect(onTermsClick).toHaveBeenCalledTimes(1)
    })

    it("calls onSocialLogin with 'google' when Google button is clicked", () => {
      const onSocialLogin = vi.fn()
      render(<RegisterForm onSubmit={vi.fn()} onSocialLogin={onSocialLogin} />)
      fireEvent.click(
        screen.getByRole("button", { name: /continuer avec google/i })
      )
      expect(onSocialLogin).toHaveBeenCalledWith("google")
    })

    it("calls onSocialLogin with 'facebook' when Facebook button is clicked", () => {
      const onSocialLogin = vi.fn()
      render(<RegisterForm onSubmit={vi.fn()} onSocialLogin={onSocialLogin} />)
      fireEvent.click(
        screen.getByRole("button", { name: /continuer avec facebook/i })
      )
      expect(onSocialLogin).toHaveBeenCalledWith("facebook")
    })
  })
})
