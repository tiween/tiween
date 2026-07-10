/**
 * Zod schemas for ticketing order + checkout input.
 *
 * Consumed via the shared `validate()` helper (src/shared/validation.ts).
 * Enforces the screening XOR performance invariant: a sale targets exactly one
 * sub-event kind.
 */
import { z } from "zod"

const ticketInputSchema = z.object({
  type: z.enum(["standard", "reduced", "vip"]),
  price: z.number().nonnegative(),
})

/** The 5 UI payment methods (Story 6.3). */
export const PAYMENT_METHODS = [
  "e-dinar",
  "sobflous",
  "d17",
  "flouci",
  "card",
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/**
 * Shared order field shape. Extracted so both `createOrderSchema` (the existing
 * Unit-of-Work input) and `checkoutSchema` (the HTTP checkout input) build from
 * one source and keep the XOR invariant identical.
 */
const baseOrderShape = {
  userId: z.string().min(1).optional(),
  guestEmail: z.string().email().optional(),
  guestName: z.string().min(1).optional(),
  eventId: z.string().min(1),
  // `.nullish()` + transform collapses null → undefined so the XOR check and
  // the downstream `data.screeningId ? ...` routing agree on what "absent"
  // means (a JSON `null` must not slip past the XOR as if it were a value).
  screeningId: z
    .string()
    .min(1)
    .nullish()
    .transform((v) => v ?? undefined),
  performanceId: z
    .string()
    .min(1)
    .nullish()
    .transform((v) => v ?? undefined),
  tickets: z.array(ticketInputSchema).min(1),
}

export const createOrderSchema = z
  .object(baseOrderShape)
  .refine(
    (data) =>
      (data.screeningId === undefined) !== (data.performanceId === undefined),
    {
      message:
        "Exactly one of screeningId or performanceId must be provided (XOR)",
      path: ["screeningId"],
    }
  )

export type CreateOrderInput = z.infer<typeof createOrderSchema>

/**
 * HTTP checkout input (Story 6.3): the order fields plus the chosen payment
 * method and the buyer's contact info (required for the Konnect hosted page and
 * ticket delivery). `userId` is derived server-side and never trusted from the
 * body. An optional `locale` bounds the redirect result path.
 */
export const checkoutSchema = z
  .object({
    ...baseOrderShape,
    paymentMethod: z.enum(PAYMENT_METHODS),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1).optional(),
    locale: z.enum(["fr", "ar", "en"]).optional(),
  })
  .refine(
    (data) =>
      (data.screeningId === undefined) !== (data.performanceId === undefined),
    {
      message:
        "Exactly one of screeningId or performanceId must be provided (XOR)",
      path: ["screeningId"],
    }
  )

export type CheckoutInput = z.infer<typeof checkoutSchema>
