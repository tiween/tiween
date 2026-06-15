/**
 * Zod schemas for ticketing order input.
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

export const createOrderSchema = z
  .object({
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

export type CreateOrderInput = z.infer<typeof createOrderSchema>
