import crypto from "node:crypto"

import { Event } from "@strapi/database/dist/lifecycles"
import { Core } from "@strapi/strapi"

export const registerUserSubscriber = async ({
  strapi,
}: {
  strapi: Core.Strapi
}) => {
  strapi.db.lifecycles.subscribe({
    models: ["plugin::users-permissions.user"],

    async afterCreate(event) {
      await sendEmail(strapi, event)
      await linkGuestOrdersForUser(strapi, event)
    },
  })
}

/**
 * Back-fill any guest orders that match the newly-created user's email so a
 * later account "inherits" prior guest purchases. Delegates to the ticketing
 * plugin's authoritative `order.linkGuestOrders`.
 *
 * Error-isolated: a linking failure (or a missing/disabled ticketing plugin)
 * must never break account creation or the welcome email — the error is
 * swallowed and logged, never rethrown.
 */
export const linkGuestOrdersForUser = async (
  strapi: Core.Strapi,
  event: Event
) => {
  const { email, documentId } = event.result ?? {}

  if (!email || !documentId) {
    return
  }

  try {
    const n = await strapi
      .plugin("ticketing")
      .service("order")
      .linkGuestOrders(email, documentId)
    if (n > 0) {
      console.log(`Linked ${n} guest order(s) to ${email}.`)
    }
  } catch (err) {
    console.error("Guest-order linking failed on user create:", err)
  }
}

/**
 * Send email after registration as user.
 * Email is sent if `confirmed` attribute is false:
 *  - if the user is created from the admin panel - `confirmed` is set by the admin in Strapi
 *  - if the user is created via "/auth/local/register" - `confirmed` is always set to true by default
 */
const sendEmail = async (strapi: Core.Strapi, event: Event) => {
  const { email, documentId, firstName, lastName, confirmed } =
    event.result ?? {}

  if (confirmed) {
    // do not send email if the user is already confirmed
    console.log(`User ${email} is already confirmed. Skipping email.`)
    return
  }

  if (!email || !documentId) {
    return
  }

  const feAccountActivationUrl = process.env.CLIENT_ACCOUNT_ACTIVATION_URL
  if (!feAccountActivationUrl) {
    console.warn(
      "CLIENT_ACCOUNT_ACTIVATION_URL is not set. After creation email will not be sent."
    )
    return
  }

  const name = [firstName, lastName].filter(Boolean).join(" ")
  const resetPasswordToken: string = crypto.randomBytes(64).toString("hex")

  try {
    await strapi.documents("plugin::users-permissions.user").update({
      documentId,
      data: { resetPasswordToken },
    })

    const html = `<h2>Welcome to our community!</h2> <h3>We have created an account for you</h3><p>
             We have automatically generated a password for you, please change it as soon as possible!
             You can change your password <a href="${feAccountActivationUrl}?code=${resetPasswordToken}&email=${email}&name=${name}" target="_blank">here</a>.
           </p>`

    await strapi.plugins["email"].services.email.send({
      to: email,
      subject: "Account Creation",
      html,
    })
  } catch (err) {
    // TODO: handle error
    console.log(err)
  }
}
