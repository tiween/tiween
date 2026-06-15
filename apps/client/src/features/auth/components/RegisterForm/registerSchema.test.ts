/**
 * registerSchema + getPasswordStrength Tests
 *
 * NOTE: These tests require Vitest to be installed.
 * Run: yarn add -D vitest
 *
 * @ts-nocheck
 */

import { describe, expect, it } from "vitest"

import { getPasswordStrength, registerSchema } from "./registerSchema"

const validData = {
  name: "Alice",
  email: "alice@example.com",
  password: "secret12",
  confirmPassword: "secret12",
  acceptTerms: true,
}

describe("registerSchema", () => {
  it("accepts fully valid input", () => {
    const result = registerSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("rejects name shorter than 2 chars with NAME_TOO_SHORT", () => {
    const result = registerSchema.safeParse({ ...validData, name: "A" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "name")
      expect(err?.message).toBe("NAME_TOO_SHORT")
    }
  })

  it("rejects empty name with REQUIRED", () => {
    const result = registerSchema.safeParse({ ...validData, name: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "name")
      expect(err?.message).toBe("REQUIRED")
    }
  })

  it("rejects malformed email with INVALID_EMAIL", () => {
    const result = registerSchema.safeParse({ ...validData, email: "nope" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "email")
      expect(err?.message).toBe("INVALID_EMAIL")
    }
  })

  it("rejects password shorter than 8 chars with PASSWORD_TOO_SHORT", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "short",
      confirmPassword: "short",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "password")
      expect(err?.message).toBe("PASSWORD_TOO_SHORT")
    }
  })

  it("rejects mismatched passwords with PASSWORDS_DONT_MATCH on confirmPassword path", () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: "secret12",
      confirmPassword: "different",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find(
        (i) => i.path[0] === "confirmPassword"
      )
      expect(err?.message).toBe("PASSWORDS_DONT_MATCH")
    }
  })

  it("rejects acceptTerms=false with TERMS_REQUIRED", () => {
    const result = registerSchema.safeParse({
      ...validData,
      acceptTerms: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === "acceptTerms")
      expect(err?.message).toBe("TERMS_REQUIRED")
    }
  })

  it("returns only uppercase error CODES (no localized messages)", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "x",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      for (const issue of result.error.issues) {
        expect(issue.message).toMatch(/^[A-Z_]+$/)
      }
    }
  })
})

describe("getPasswordStrength", () => {
  it("returns 'weak' for passwords shorter than 8 chars", () => {
    expect(getPasswordStrength("")).toBe("weak")
    expect(getPasswordStrength("abc")).toBe("weak")
    expect(getPasswordStrength("Abc123!")).toBe("weak") // 7 chars
  })

  it("returns 'weak' for 8+ chars with only one character class", () => {
    expect(getPasswordStrength("abcdefgh")).toBe("weak") // only lowercase
    expect(getPasswordStrength("ABCDEFGH")).toBe("weak") // only uppercase
    expect(getPasswordStrength("12345678")).toBe("weak") // only digits
  })

  it("returns 'medium' for 8+ chars with two character classes", () => {
    expect(getPasswordStrength("abcdefg1")).toBe("medium") // lower + digit
    expect(getPasswordStrength("Abcdefgh")).toBe("medium") // lower + upper
  })

  it("returns 'strong' for 8+ chars with three or more character classes", () => {
    expect(getPasswordStrength("Abcdefg1")).toBe("strong") // upper + lower + digit
    expect(getPasswordStrength("Abc123!@")).toBe("strong") // all four classes
    expect(getPasswordStrength("Strong1!")).toBe("strong")
  })
})
