"use strict"
/**
 * Brevo Email Provider for Strapi v5 (in-repo workspace package).
 *
 * Replicates the behaviour of `@ayhid/strapi-provider-email-brevo` (custom
 * local provider using the Brevo Transactional Email API, console-logging
 * fallback when BREVO_API_KEY is not configured) and ADDS attachment support:
 * a nodemailer-style `attachments: [{ filename, content, contentType? }]`
 * option is mapped to Brevo's `attachment: [{ name, content(base64) }]`.
 * The field is omitted entirely when no attachments are given.
 */
const Brevo = require("@getbrevo/brevo")

/**
 * Parse email string to Brevo format
 * Supports: "email@example.com" or "Name <email@example.com>"
 * @param {string} email
 * @returns {{email: string, name?: string}}
 */
function parseEmail(email) {
  const match = email.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/)
  if (match) {
    return {
      email: match[2].trim(),
      name: match[1]?.trim() || undefined,
    }
  }
  return { email: email.trim() }
}

/**
 * Parse recipients to Brevo format
 * @param {string | string[]} recipients
 * @returns {Array<{email: string, name?: string}>}
 */
function parseRecipients(recipients) {
  const list = Array.isArray(recipients) ? recipients : [recipients]
  return list.map(parseEmail)
}

/**
 * Map nodemailer-style attachments to Brevo's `attachment` shape.
 * Returns undefined when there is nothing to attach so the field can be
 * omitted from the payload entirely.
 * @param {Array<{filename: string, content: Buffer|string, contentType?: string}>|undefined} attachments
 * @returns {Array<{name: string, content: string}>|undefined}
 */
function mapAttachments(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return undefined
  }
  return attachments.map((att) => ({
    name: att.filename,
    content: Buffer.isBuffer(att.content)
      ? att.content.toString("base64")
      : Buffer.from(att.content).toString("base64"),
  }))
}

module.exports = {
  /**
   * Initialize the Brevo email provider
   * @param {Object} providerOptions - Provider configuration options
   * @param {string} [providerOptions.apiKey] - Brevo API key
   * @param {Object} settings - Email settings
   * @param {string} settings.defaultFrom - Default sender email
   * @param {string} [settings.defaultReplyTo] - Default reply-to email
   * @param {string} [settings.defaultSenderName] - Default sender name
   * @returns {Object} Provider instance with send method
   */
  init(providerOptions = {}, settings = {}) {
    const apiKey = providerOptions.apiKey

    // Development fallback - log to console when no API key
    if (!apiKey) {
      console.warn(
        "[Brevo] No API key configured - emails will be logged to console"
      )

      return {
        async send(options) {
          console.log("📧 [DEV MODE] Email would be sent:")
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          console.log("From:", options.from || settings.defaultFrom)
          console.log("To:", options.to)
          if (options.cc) console.log("CC:", options.cc)
          if (options.bcc) console.log("BCC:", options.bcc)
          console.log("Subject:", options.subject)
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
          if (options.text) {
            console.log(
              "Text Preview:",
              options.text.substring(0, 200) +
                (options.text.length > 200 ? "..." : "")
            )
          }
          if (options.html) {
            console.log(
              "HTML Content: [Provided - length:",
              options.html.length,
              "chars]"
            )
          }
          if (
            Array.isArray(options.attachments) &&
            options.attachments.length > 0
          ) {
            console.log(
              "Attachments:",
              options.attachments.map((att) => att.filename).join(", ")
            )
          }
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        },
      }
    }

    // Production mode - use Brevo API
    const apiInstance = new Brevo.TransactionalEmailsApi()
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey)

    return {
      /**
       * Send an email via Brevo Transactional Email API
       * @param {Object} options - Email options
       * @param {string} [options.from] - Sender email
       * @param {string | string[]} options.to - Recipient(s)
       * @param {string | string[]} [options.cc] - CC recipient(s)
       * @param {string | string[]} [options.bcc] - BCC recipient(s)
       * @param {string} [options.replyTo] - Reply-to email
       * @param {string} options.subject - Email subject
       * @param {string} [options.text] - Plain text content
       * @param {string} [options.html] - HTML content
       * @param {Array<{filename: string, content: Buffer|string, contentType?: string}>} [options.attachments]
       *   Nodemailer-style attachments, mapped to Brevo `attachment` (base64).
       */
      async send(options) {
        const sendSmtpEmail = new Brevo.SendSmtpEmail()

        // Required fields
        sendSmtpEmail.subject = options.subject
        sendSmtpEmail.to = parseRecipients(options.to)

        // Sender
        const senderEmail = options.from || settings.defaultFrom
        sendSmtpEmail.sender = parseEmail(senderEmail)
        if (settings.defaultSenderName && !sendSmtpEmail.sender.name) {
          sendSmtpEmail.sender.name = settings.defaultSenderName
        }

        // Content - at least one required
        if (options.html) {
          sendSmtpEmail.htmlContent = options.html
        }
        if (options.text) {
          sendSmtpEmail.textContent = options.text
        }

        // Optional fields
        if (options.replyTo) {
          sendSmtpEmail.replyTo = parseEmail(options.replyTo)
        } else if (settings.defaultReplyTo) {
          sendSmtpEmail.replyTo = parseEmail(settings.defaultReplyTo)
        }

        if (options.cc) {
          sendSmtpEmail.cc = parseRecipients(options.cc)
        }

        if (options.bcc) {
          sendSmtpEmail.bcc = parseRecipients(options.bcc)
        }

        // Attachments (omitted entirely when absent/empty)
        const attachment = mapAttachments(options.attachments)
        if (attachment) {
          sendSmtpEmail.attachment = attachment
        }

        let response
        try {
          response = await apiInstance.sendTransacEmail(sendSmtpEmail)
        } catch (error) {
          console.error(
            "[Brevo] Failed to send email:",
            error.message || "Unknown error"
          )

          // Map Brevo errors to consistent error codes
          if (error.statusCode === 401) {
            throw new Error("EMAIL_API_UNAUTHORIZED")
          }
          if (error.statusCode === 429) {
            throw new Error("EMAIL_RATE_LIMITED")
          }
          if (error.body?.code === "invalid_parameter") {
            throw new Error("EMAIL_INVALID_RECIPIENT")
          }

          throw new Error("EMAIL_SEND_FAILED")
        }

        // Success logging lives OUTSIDE the try: once Brevo accepted the
        // email, a missing `body` (or a logging hiccup) must not be remapped
        // to EMAIL_SEND_FAILED — that would make the caller clear its
        // exactly-once marker and double-send later.
        console.log(
          `[Brevo] Email sent successfully. MessageId: ${
            response?.body?.messageId ?? "unknown"
          }`
        )
      },
    }
  },
}
