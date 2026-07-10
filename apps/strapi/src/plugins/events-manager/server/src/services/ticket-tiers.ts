import type { Core } from "@strapi/strapi"

/**
 * Public read service for a sub-event's ticket tiers (Story 6.1).
 *
 * Backs the public `content-api` GET route
 * `/showtimes/:documentId/ticket-tiers`. Document Service API only
 * (`strapi.documents(...)`) — never Entity Service, never raw SQL. This is a
 * READ-ONLY presentation path: it never writes inventory and never touches the
 * `adjustInventory` / order write contract.
 *
 * The tier catalog lives on the `ticketing.ticket-tier` component embedded on
 * both sub-event kinds (`screening`/`performance`), which are owned by this
 * plugin — no foreign-UID reach into another plugin. Currency is sourced from
 * the ticketing plugin config (`plugin::ticketing.defaultCurrency`), never a
 * hardcoded literal.
 */

const PLUGIN_ID = "events-manager"
const SCREENING_UID = `plugin::${PLUGIN_ID}.screening` as const
const PERFORMANCE_UID = `plugin::${PLUGIN_ID}.performance` as const

/** ISO 4217 currency config key (default "TND") owned by the ticketing plugin. */
const CURRENCY_CONFIG_KEY = "plugin::ticketing.defaultCurrency"
const DEFAULT_CURRENCY = "TND"

export type SubEventKind = "screening" | "performance"

/** The three canonical ticket types; labels are a frontend i18n concern. */
export type TicketTierType = "standard" | "reduced" | "vip"

/**
 * Raw component shape as populated from the Document Service. Numeric fields
 * are typed `number | string` because the Postgres driver returns `decimal`
 * columns (e.g. `price`) as strings — see {@link toNumber}.
 */
interface RawTicketTier {
  type?: TicketTierType | null
  price?: number | string | null
  ticketsAvailable?: number | string | null
  ticketsSold?: number | string | null
  restrictionNote?: string | null
}

interface RawSubEvent {
  documentId?: string
  startDateTime?: string | null
  ticketTiers?: RawTicketTier[] | null
}

/** Computed, display-ready tier returned to the client. */
export interface TicketTierOut {
  type: TicketTierType
  price: number
  ticketsAvailable: number
  ticketsSold: number
  remaining: number
  soldOut: boolean
  restrictionNote: string | null
}

export interface TicketTiersResult {
  subEventId: string
  kind: SubEventKind
  startDateTime: string | null
  currency: string
  tiers: TicketTierOut[]
}

const POPULATE = { ticketTiers: true } as const

/**
 * Coerce a possibly-null numeric field to a finite number (0 fallback).
 *
 * Accepts strings because the Postgres `pg` driver returns `NUMERIC`/`decimal`
 * columns as strings (e.g. `"15.00"`) to preserve precision; without this the
 * `typeof === "number"` guard would collapse every tier price to `0` in
 * production ("0,00 DT" everywhere) while passing on the sqlite dev driver.
 */
function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : 0
}

/** Map one raw component to the computed, display-ready tier shape. */
function mapTier(raw: RawTicketTier): TicketTierOut {
  const ticketsAvailable = toNumber(raw.ticketsAvailable)
  const ticketsSold = toNumber(raw.ticketsSold)
  const remaining = Math.max(0, ticketsAvailable - ticketsSold)

  return {
    type: (raw.type ?? "standard") as TicketTierType,
    price: toNumber(raw.price),
    ticketsAvailable,
    ticketsSold,
    remaining,
    soldOut: remaining <= 0,
    restrictionNote: raw.restrictionNote ?? null,
  }
}

const ticketTiersService = ({ strapi }: { strapi: Core.Strapi }) => {
  /** Read one published sub-event of the given kind (null when absent). */
  async function readSubEvent(
    uid: typeof SCREENING_UID | typeof PERFORMANCE_UID,
    documentId: string
  ): Promise<RawSubEvent | null> {
    const doc = await strapi.documents(uid).findOne({
      documentId,
      status: "published",
      populate: POPULATE,
    } as never)

    return (doc as RawSubEvent | null) ?? null
  }

  return {
    /**
     * Resolve a sub-event's ticket tiers by documentId.
     *
     * When `kind` is provided the matching content type is read directly;
     * otherwise it tries `screening` first, then falls back to `performance`
     * (the frontend link carries a sub-event id that may be either). Returns
     * `null` when neither a published screening nor performance matches — the
     * controller maps that to `404 SUB_EVENT_NOT_FOUND`.
     */
    async findSubEventTicketTiers(
      documentId: string,
      kind?: SubEventKind
    ): Promise<TicketTiersResult | null> {
      let resolvedKind: SubEventKind | null = null
      let subEvent: RawSubEvent | null = null

      if (kind === "screening") {
        subEvent = await readSubEvent(SCREENING_UID, documentId)
        if (subEvent) resolvedKind = "screening"
      } else if (kind === "performance") {
        subEvent = await readSubEvent(PERFORMANCE_UID, documentId)
        if (subEvent) resolvedKind = "performance"
      } else {
        subEvent = await readSubEvent(SCREENING_UID, documentId)
        if (subEvent) {
          resolvedKind = "screening"
        } else {
          subEvent = await readSubEvent(PERFORMANCE_UID, documentId)
          if (subEvent) resolvedKind = "performance"
        }
      }

      if (!subEvent || !resolvedKind) {
        return null
      }

      const rawTiers = Array.isArray(subEvent.ticketTiers)
        ? subEvent.ticketTiers
        : []

      const currency = strapi.config.get(
        CURRENCY_CONFIG_KEY,
        DEFAULT_CURRENCY
      ) as string

      return {
        subEventId: subEvent.documentId ?? documentId,
        kind: resolvedKind,
        startDateTime: subEvent.startDateTime ?? null,
        currency,
        tiers: rawTiers.map(mapTier),
      }
    },
  }
}

export default ticketTiersService
