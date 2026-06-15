/**
 * loginSchema Tests
 *
 * NOTE: These tests require Vitest to be installed.
 * Run: yarn add -D vitest
 *
 * This file is excluded from type checking until Vitest is installed.
 * @ts-nocheck
 */

import { describe, expect, it } from "vitest"

import { loginSchema } from "./loginSchema"

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "secret123",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty email with REQUIRED code", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "secret123",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === "email")
      expect(emailError?.message).toBe("REQUIRED")
    }
  })

  it("rejects malformed email with INVALID_EMAIL code", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === "email")
      expect(emailError?.message).toBe("INVALID_EMAIL")
    }
  })

  it("rejects empty password with REQUIRED code", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passwordError = result.error.issues.find(
        (i) => i.path[0] === "password"
      )
      expect(passwordError?.message).toBe("REQUIRED")
    }
  })

  it("returns error CODES (uppercase, snake_case), never localized messages", () => {
    const result = loginSchema.safeParse({ email: "x", password: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      for (const issue of result.error.issues) {
        expect(issue.message).toMatch(/^[A-Z_]+$/)
      }
    }
  })
})
