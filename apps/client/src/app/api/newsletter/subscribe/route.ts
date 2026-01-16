import { NextResponse } from "next/server"
import { env } from "@/env.mjs"
import { z } from "zod"

const subscribeSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = subscribeSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "INVALID_EMAIL" },
        { status: 400 }
      )
    }

    const { email } = result.data

    // Check if Brevo API key is configured
    if (!env.BREVO_API_KEY) {
      console.warn(
        "[Newsletter] BREVO_API_KEY not configured - running in dev mode"
      )
      return NextResponse.json({
        success: true,
        warning: "DEV_MODE_NO_BREVO",
      })
    }

    // Import Brevo SDK dynamically to avoid issues when API key is not set
    const brevo = await import("@getbrevo/brevo")
    const apiInstance = new brevo.ContactsApi()

    // Set API key
    apiInstance.setApiKey(brevo.ContactsApiApiKeys.apiKey, env.BREVO_API_KEY)

    // Create contact request
    const createContact = new brevo.CreateContact()
    createContact.email = email

    // Add to list if BREVO_LIST_ID is configured
    if (env.BREVO_LIST_ID) {
      createContact.listIds = [env.BREVO_LIST_ID]
    }

    // Add attributes for tracking
    createContact.attributes = {
      SOURCE: "coming_back_landing",
      SIGNUP_DATE: new Date().toISOString(),
    }

    try {
      await apiInstance.createContact(createContact)
    } catch (error: unknown) {
      // Handle duplicate contact error - Brevo returns 400 with "duplicate_parameter"
      const brevoError = error as {
        response?: { body?: { code?: string } }
        body?: { code?: string }
      }
      const errorCode =
        brevoError?.response?.body?.code || brevoError?.body?.code

      if (errorCode === "duplicate_parameter") {
        // Contact already exists - this is fine, treat as success
        console.log(`[Newsletter] Contact already exists: ${email}`)
        return NextResponse.json({ success: true })
      }

      // Log other errors but don't expose details to client
      console.error("[Newsletter] Brevo API error:", error)
      return NextResponse.json(
        { success: false, error: "SUBSCRIPTION_FAILED" },
        { status: 500 }
      )
    }

    console.log(`[Newsletter] Successfully subscribed: ${email}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Newsletter] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "SUBSCRIPTION_FAILED" },
      { status: 500 }
    )
  }
}
