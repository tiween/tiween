import type { Core } from "@strapi/strapi"

import { cleanupContent } from "../../../../../../../tests/fixtures/events"
import {
  cleanupStrapi,
  setupStrapi,
} from "../../../../../../../tests/helpers/strapi"

jest.setTimeout(60000)

let strapi: Core.Strapi

function service() {
  return (strapi as any).plugin("events-manager").service("seed")
}

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await cleanupStrapi()
})

afterEach(async () => {
  await cleanupContent(strapi)
})

describe("seed service", () => {
  it("seeds venues and event groups", async () => {
    const results = await service().seedAll()
    expect(results.venues.created).toBeGreaterThan(0)
    expect(results.eventGroups.created).toBeGreaterThan(0)
  })

  it("skips already existing content", async () => {
    await service().seedAll()
    const results = await service().seedAll()
    expect(results.venues.created).toBe(0)
    expect(results.venues.skipped).toBeGreaterThan(0)
  })
})
