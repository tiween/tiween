/**
 * Unit tests for the in-repo workspace email provider
 * `@tiween/strapi-provider-email-brevo` (Story 6.5).
 *
 * The provider is the blast-radius change of the story — every existing email
 * flow (welcome, password reset, venue registration, schedule change) now goes
 * through it — so its contract is pinned here with `@getbrevo/brevo` mocked:
 * send-field mapping, sender/replyTo defaulting, attachment mapping (the one
 * NEW behaviour), dev-mode console fallback, and the error-code table.
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import provider from "@tiween/strapi-provider-email-brevo"

const mockSendTransacEmail = jest.fn()
const mockSetApiKey = jest.fn()

jest.mock("@getbrevo/brevo", () => {
  class SendSmtpEmail {}
  class TransactionalEmailsApi {
    setApiKey(...args: unknown[]) {
      return mockSetApiKey(...args)
    }
    sendTransacEmail(...args: unknown[]) {
      return mockSendTransacEmail(...args)
    }
  }
  return {
    SendSmtpEmail,
    TransactionalEmailsApi,
    TransactionalEmailsApiApiKeys: { apiKey: "apiKey" },
  }
})

const settings = {
  defaultFrom: "noreply@tiween.tn",
  defaultReplyTo: "noreply@tiween.tn",
  defaultSenderName: "Tiween",
}

function lastPayload(): Record<string, any> {
  return mockSendTransacEmail.mock.calls.at(-1)![0]
}

describe("@tiween/strapi-provider-email-brevo (unit)", () => {
  describe("wiring pins", () => {
    it("the workspace package is resolvable by the email plugin's require(provider) bootstrap", () => {
      expect(() =>
        require.resolve("@tiween/strapi-provider-email-brevo")
      ).not.toThrow()
    })

    it("config/plugins.ts names exactly this provider package", () => {
      const configSource = readFileSync(
        resolve(__dirname, "../../config/plugins.ts"),
        "utf8"
      )
      expect(configSource).toContain(
        'provider: "@tiween/strapi-provider-email-brevo"'
      )
    })
  })

  beforeEach(() => {
    mockSendTransacEmail.mockReset()
    mockSendTransacEmail.mockResolvedValue({ body: { messageId: "mid-1" } })
    mockSetApiKey.mockClear()
  })

  describe("production mode (apiKey set)", () => {
    it("maps to/subject/html/text and defaults sender + replyTo from settings", async () => {
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await instance.send({
        to: "buyer@example.com",
        subject: "Hello",
        html: "<p>Hi</p>",
        text: "Hi",
      })

      expect(mockSetApiKey).toHaveBeenCalledWith("apiKey", "key-1")
      const payload = lastPayload()
      expect(payload.to).toEqual([{ email: "buyer@example.com" }])
      expect(payload.subject).toBe("Hello")
      expect(payload.htmlContent).toBe("<p>Hi</p>")
      expect(payload.textContent).toBe("Hi")
      expect(payload.sender).toEqual({
        email: "noreply@tiween.tn",
        name: "Tiween",
      })
      expect(payload.replyTo).toEqual({ email: "noreply@tiween.tn" })
    })

    it('parses "Name <email>" recipients and explicit from', async () => {
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await instance.send({
        from: "Support <support@tiween.tn>",
        to: ["A <a@x.tn>", "b@x.tn"],
        subject: "s",
        html: "<p>x</p>",
      })

      const payload = lastPayload()
      expect(payload.sender).toEqual({
        email: "support@tiween.tn",
        name: "Support",
      })
      expect(payload.to).toEqual([
        { email: "a@x.tn", name: "A" },
        { email: "b@x.tn" },
      ])
    })

    it("maps nodemailer-style attachments to Brevo attachment (base64)", async () => {
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await instance.send({
        to: "buyer@example.com",
        subject: "Tickets",
        html: "<p>x</p>",
        attachments: [
          {
            filename: "TW-1-1.png",
            content: Buffer.from("png-bytes"),
            contentType: "image/png",
          },
          { filename: "TW-1.ics", content: "BEGIN:VCALENDAR" },
        ],
      })

      const payload = lastPayload()
      expect(payload.attachment).toEqual([
        {
          name: "TW-1-1.png",
          content: Buffer.from("png-bytes").toString("base64"),
        },
        {
          name: "TW-1.ics",
          content: Buffer.from("BEGIN:VCALENDAR").toString("base64"),
        },
      ])
    })

    it("omits the attachment field entirely when none are given", async () => {
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await instance.send({
        to: "buyer@example.com",
        subject: "s",
        html: "<p>x</p>",
      })
      expect("attachment" in lastPayload()).toBe(false)

      await instance.send({
        to: "buyer@example.com",
        subject: "s",
        html: "<p>x</p>",
        attachments: [],
      })
      expect("attachment" in lastPayload()).toBe(false)
    })

    it("a resolved send whose response lacks body still resolves (no false EMAIL_SEND_FAILED)", async () => {
      // Brevo accepted the email but returned no `body` — logging must not
      // convert that into a failure, or the caller clears its exactly-once
      // marker and double-sends later.
      mockSendTransacEmail.mockResolvedValue({})
      const logSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => undefined)
      try {
        const instance = provider.init({ apiKey: "key-1" }, settings)

        await expect(
          instance.send({ to: "a@x.tn", subject: "s", html: "x" })
        ).resolves.toBeUndefined()

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining("MessageId: unknown")
        )
      } finally {
        logSpy.mockRestore()
      }
    })

    it("maps 401 to EMAIL_API_UNAUTHORIZED", async () => {
      mockSendTransacEmail.mockRejectedValue(
        Object.assign(new Error("nope"), { statusCode: 401 })
      )
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await expect(
        instance.send({ to: "a@x.tn", subject: "s", html: "x" })
      ).rejects.toThrow("EMAIL_API_UNAUTHORIZED")
    })

    it("maps 429 to EMAIL_RATE_LIMITED", async () => {
      mockSendTransacEmail.mockRejectedValue(
        Object.assign(new Error("slow down"), { statusCode: 429 })
      )
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await expect(
        instance.send({ to: "a@x.tn", subject: "s", html: "x" })
      ).rejects.toThrow("EMAIL_RATE_LIMITED")
    })

    it("maps invalid_parameter to EMAIL_INVALID_RECIPIENT", async () => {
      mockSendTransacEmail.mockRejectedValue(
        Object.assign(new Error("bad"), {
          statusCode: 400,
          body: { code: "invalid_parameter" },
        })
      )
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await expect(
        instance.send({ to: "nope", subject: "s", html: "x" })
      ).rejects.toThrow("EMAIL_INVALID_RECIPIENT")
    })

    it("maps any other failure to EMAIL_SEND_FAILED", async () => {
      mockSendTransacEmail.mockRejectedValue(new Error("boom"))
      const instance = provider.init({ apiKey: "key-1" }, settings)

      await expect(
        instance.send({ to: "a@x.tn", subject: "s", html: "x" })
      ).rejects.toThrow("EMAIL_SEND_FAILED")
    })
  })

  describe("dev mode (no apiKey)", () => {
    let logSpy: jest.SpyInstance
    let warnSpy: jest.SpyInstance

    beforeEach(() => {
      logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined)
      warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined)
    })

    afterEach(() => {
      logSpy.mockRestore()
      warnSpy.mockRestore()
    })

    it("init warns and send logs to console without calling the API (never throws)", async () => {
      const instance = provider.init({}, settings)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No API key configured")
      )

      await expect(
        instance.send({
          to: "buyer@example.com",
          subject: "Tickets",
          html: "<p>x</p>",
          attachments: [{ filename: "TW-1-1.png", content: Buffer.from("x") }],
        })
      ).resolves.toBeUndefined()

      expect(mockSendTransacEmail).not.toHaveBeenCalled()
      expect(logSpy).toHaveBeenCalledWith("Subject:", "Tickets")
      // Attachment names are surfaced so a dev checkout can be verified.
      expect(logSpy).toHaveBeenCalledWith("Attachments:", "TW-1-1.png")
    })
  })
})
