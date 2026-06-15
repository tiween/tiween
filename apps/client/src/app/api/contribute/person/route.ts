import { NextResponse } from "next/server"
import { env } from "@/env.mjs"
import { z } from "zod"

import { getClientIp, personCreationLimiter } from "@/lib/rate-limit"
import { verifyRecaptcha } from "@/lib/recaptcha"

const createPersonSchema = z.object({
  name: z.string().min(2).max(200),
  nationality: z.string().max(100).optional(),
  photo: z.string().url().optional(),
  recaptchaToken: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIp(request)
    const { success, remaining, reset } = personCreationLimiter.check(ip)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      )
    }

    // Parse body
    const body = await request.json()
    const result = createPersonSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "VALIDATION_ERROR",
          details: result.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { name, nationality, photo, recaptchaToken } = result.data

    // Verify reCAPTCHA if configured and token provided
    if (env.RECAPTCHA_SECRET_KEY && recaptchaToken) {
      const isValid = await verifyRecaptcha(recaptchaToken)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "RECAPTCHA_FAILED" },
          { status: 400 }
        )
      }
    }

    // Create person in Strapi as draft (unpublished)
    // This requires either a custom API endpoint or using a service token
    // For now, we'll store the person data and return a temporary ID
    // The actual Strapi entry will be created when the play is submitted

    // Generate a temporary client-side ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    // In a production setup, you would either:
    // 1. Create a draft person in Strapi (requires write permissions)
    // 2. Store in a pending submissions table
    // 3. Create everything during final play submission

    // For this implementation, we return the temporary person data
    // It will be properly created when the play is submitted
    const personData = {
      tempId,
      name,
      nationality: nationality || null,
      photoUrl: photo || null,
      isNew: true,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(
      { success: true, data: personData },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    )
  } catch (error) {
    console.error("[PersonCreate] Unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "CREATE_FAILED" },
      { status: 500 }
    )
  }
}
