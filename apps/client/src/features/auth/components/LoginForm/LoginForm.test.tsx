/**
 * LoginForm Component Tests
 *
 * NOTE: These tests require Vitest and @testing-library/react to be installed.
 * Run: yarn add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react @testing-library/user-event
 *
 * Then create vitest.config.ts with jsdom environment.
 *
 * This file is excluded from type checking until Vitest is installed.
 * @ts-nocheck
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { LoginForm } from "./LoginForm"

describe("LoginForm", () => {
  describe("Rendering", () => {
    it("renders email and password inputs", () => {
      render(<LoginForm onSubmit={vi.fn()} />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument()
    })

    it("renders submit button with default label", () => {
      render(<LoginForm onSubmit={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /se connecter/i })
      ).toBeInTheDocument()
    })

    it("renders forgot password link when callback provided", () => {
      render(<LoginForm onSubmit={vi.fn()} onForgotPassword={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /mot de passe oublié/i })
      ).toBeInTheDocument()
    })

    it("does not render forgot password link when callback omitted", () => {
      render(<LoginForm onSubmit={vi.fn()} />)
      expect(
        screen.queryByRole("button", { name: /mot de passe oublié/i })
      ).not.toBeInTheDocument()
    })

    it("renders social login buttons when callback provided", () => {
      render(<LoginForm onSubmit={vi.fn()} onSocialLogin={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /continuer avec google/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /continuer avec facebook/i })
      ).toBeInTheDocument()
    })

    it("renders create account link when callback provided", () => {
      render(<LoginForm onSubmit={vi.fn()} onCreateAccount={vi.fn()} />)
      expect(
        screen.getByRole("button", { name: /créer un compte/i })
      ).toBeInTheDocument()
    })

    it("renders server error message when error prop set", () => {
      render(
        <LoginForm onSubmit={vi.fn()} error="Email ou mot de passe incorrect" />
      )
      expect(screen.getByRole("alert")).toHaveTextContent(
        /email ou mot de passe incorrect/i
      )
    })
  })

  describe("Password visibility toggle", () => {
    it("password input is type=password by default", () => {
      render(<LoginForm onSubmit={vi.fn()} />)
      const password = screen.getByLabelText(/mot de passe/i)
      expect(password).toHaveAttribute("type", "password")
    })

    it("toggles password visibility when toggle button is clicked", async () => {
      const user = userEvent.setup()
      render(<LoginForm onSubmit={vi.fn()} />)
      const password = screen.getByLabelText(/mot de passe/i)
      const toggle = screen.getByRole("button", {
        name: /afficher le mot de passe/i,
      })

      await user.click(toggle)
      expect(password).toHaveAttribute("type", "text")

      const hideToggle = screen.getByRole("button", {
        name: /masquer le mot de passe/i,
      })
      await user.click(hideToggle)
      expect(password).toHaveAttribute("type", "password")
    })
  })

  describe("Validation", () => {
    it("shows REQUIRED error when email is empty on submit", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm onSubmit={onSubmit} />)

      await user.click(screen.getByRole("button", { name: /se connecter/i }))

      await waitFor(() => {
        expect(
          screen.getAllByText(/ce champ est requis/i).length
        ).toBeGreaterThan(0)
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("shows INVALID_EMAIL error for malformed email", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/email/i), "not-an-email")
      await user.type(screen.getByLabelText(/mot de passe/i), "secret123")
      await user.click(screen.getByRole("button", { name: /se connecter/i }))

      await waitFor(() => {
        expect(screen.getByText(/email invalide/i)).toBeInTheDocument()
      })
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it("calls onSubmit with valid data", async () => {
      const onSubmit = vi.fn()
      const user = userEvent.setup()
      render(<LoginForm onSubmit={onSubmit} />)

      await user.type(screen.getByLabelText(/email/i), "user@example.com")
      await user.type(screen.getByLabelText(/mot de passe/i), "secret123")
      await user.click(screen.getByRole("button", { name: /se connecter/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "secret123",
        })
      })
    })
  })

  describe("Loading state", () => {
    it("disables submit button and shows submitting label when loading", () => {
      render(<LoginForm onSubmit={vi.fn()} isLoading />)
      const submit = screen.getByRole("button", { name: /connexion\.\.\./i })
      expect(submit).toBeDisabled()
    })

    it("disables email and password inputs when loading", () => {
      render(<LoginForm onSubmit={vi.fn()} isLoading />)
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/mot de passe/i)).toBeDisabled()
    })
  })

  describe("Callbacks", () => {
    it("calls onForgotPassword when forgot password link is clicked", () => {
      const onForgotPassword = vi.fn()
      render(
        <LoginForm onSubmit={vi.fn()} onForgotPassword={onForgotPassword} />
      )
      fireEvent.click(
        screen.getByRole("button", { name: /mot de passe oublié/i })
      )
      expect(onForgotPassword).toHaveBeenCalledTimes(1)
    })

    it("calls onCreateAccount when create account link is clicked", () => {
      const onCreateAccount = vi.fn()
      render(<LoginForm onSubmit={vi.fn()} onCreateAccount={onCreateAccount} />)
      fireEvent.click(screen.getByRole("button", { name: /créer un compte/i }))
      expect(onCreateAccount).toHaveBeenCalledTimes(1)
    })

    it("calls onSocialLogin with 'google' when Google button is clicked", () => {
      const onSocialLogin = vi.fn()
      render(<LoginForm onSubmit={vi.fn()} onSocialLogin={onSocialLogin} />)
      fireEvent.click(
        screen.getByRole("button", { name: /continuer avec google/i })
      )
      expect(onSocialLogin).toHaveBeenCalledWith("google")
    })

    it("calls onSocialLogin with 'facebook' when Facebook button is clicked", () => {
      const onSocialLogin = vi.fn()
      render(<LoginForm onSubmit={vi.fn()} onSocialLogin={onSocialLogin} />)
      fireEvent.click(
        screen.getByRole("button", { name: /continuer avec facebook/i })
      )
      expect(onSocialLogin).toHaveBeenCalledWith("facebook")
    })
  })

  describe("Localization (labels prop)", () => {
    it("renders English labels when provided", () => {
      const englishLabels = {
        title: "Sign In",
        email: "Email",
        emailPlaceholder: "you@example.com",
        password: "Password",
        passwordPlaceholder: "••••••••",
        showPassword: "Show password",
        hidePassword: "Hide password",
        forgotPassword: "Forgot password?",
        submit: "Sign In",
        submitting: "Signing in...",
        createAccount: "Create account",
        createAccountPrompt: "Don't have an account?",
        socialDivider: "or",
        socialGoogle: "Continue with Google",
        socialFacebook: "Continue with Facebook",
        errors: {
          REQUIRED: "This field is required",
          INVALID_EMAIL: "Invalid email",
        },
      }
      render(<LoginForm onSubmit={vi.fn()} labels={englishLabels} />)
      expect(screen.getByLabelText("Email")).toBeInTheDocument()
      expect(screen.getByLabelText("Password")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Sign In" })
      ).toBeInTheDocument()
    })
  })
})
